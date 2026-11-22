package it.fermiumsmp.status;

import net.fabricmc.api.DedicatedServerModInitializer;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerLifecycleEvents;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.level.storage.LevelResource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Dedicated server Fabric 26.2 entrypoint pushing live TPS, MSPT, RAM, uptime,
 * players/Carpet bots and automatic player statistics to Firebase Firestore.
 */
public final class FermiumStatusMod implements DedicatedServerModInitializer {
	public static final String MOD_ID = "fermium-status";
	public static final Logger LOGGER = LoggerFactory.getLogger(MOD_ID);

	private static final int MAX_HISTORY = 60;
	private static final Duration PUSH_TIMEOUT = Duration.ofSeconds(8);
	private static final Duration STATS_PUSH_TIMEOUT = Duration.ofSeconds(12);
	private static final Duration STOP_TIMEOUT = Duration.ofSeconds(4);

	private final TickTracker tickTracker = new TickTracker();
	private final Deque<StatusSnapshot.HistorySample> history = new ArrayDeque<>(MAX_HISTORY);
	private final PlayerStatsScanner statsScanner = new PlayerStatsScanner(true);
	private final AtomicBoolean statsSyncInFlight = new AtomicBoolean(false);

	private StatusConfig config;
	private FirebaseTelemetryClient client;
	private ScheduledExecutorService scheduler;
	private ScheduledFuture<?> pendingDisconnectSync;
	private long startedAtEpochMs;
	private boolean firstPushLogged = false;
	private volatile boolean firstStatsLogged = false;
	private volatile String lastStatsHash = null;
	private volatile Set<String> previousOnlineHumanUuids = Set.of();

	@Override
	public void onInitializeServer() {
		Path configPath = FabricLoader.getInstance().getConfigDir().resolve("fermium-status.json");
		config = StatusConfig.loadOrCreate(configPath, LOGGER);

		ServerTickEvents.START_SERVER_TICK.register(server -> tickTracker.onTickStart());
		ServerTickEvents.END_SERVER_TICK.register(server -> tickTracker.onTickEnd());

		ServerLifecycleEvents.SERVER_STARTED.register(this::onServerStarted);
		ServerLifecycleEvents.SERVER_STOPPING.register(this::onServerStopping);
	}

	private void onServerStarted(MinecraftServer server) {
		if (!config.enabled) {
			LOGGER.info("[FermiumStatus] Telemetria disabilitata da config/fermium-status.json.");
			return;
		}

		String password = config.resolvePassword();
		if (password == null) {
			LOGGER.warn(
				"[FermiumStatus] Password non configurata per {}. Inseriscila in config/fermium-status.json oppure nella variabile FERMIUM_STATUS_PASSWORD e riavvia il server.",
				config.reporterEmail
			);
			return;
		}

		startedAtEpochMs = System.currentTimeMillis();
		history.clear();
		firstPushLogged = false;
		firstStatsLogged = false;
		lastStatsHash = null;
		previousOnlineHumanUuids = Set.of();
		pendingDisconnectSync = null;
		client = new FirebaseTelemetryClient(config, password, LOGGER);

		scheduler = Executors.newSingleThreadScheduledExecutor(runnable -> {
			Thread t = new Thread(runnable, "fermium-status-reporter");
			t.setDaemon(true);
			return t;
		});

		scheduler.scheduleAtFixedRate(
			() -> pushLiveTick(server),
			1L,
			config.intervalSeconds,
			TimeUnit.SECONDS
		);

		if (config.syncPlayerStats) {
			scheduler.schedule(
				() -> syncPlayerStats(server, false, STATS_PUSH_TIMEOUT),
				5L,
				TimeUnit.SECONDS
			);
			scheduler.scheduleAtFixedRate(
				() -> syncPlayerStats(server, false, STATS_PUSH_TIMEOUT),
				config.statsIntervalSeconds,
				config.statsIntervalSeconds,
				TimeUnit.SECONDS
			);
		}

		LOGGER.info(
			"[FermiumStatus] Avviato per {} (progetto={}, status={}s, stats={}).",
			config.serverVersion,
			config.firebaseProjectId,
			config.intervalSeconds,
			config.syncPlayerStats ? config.statsIntervalSeconds + "s" : "off"
		);
	}

	private void onServerStopping(MinecraftServer server) {
		ScheduledExecutorService activeScheduler = scheduler;
		scheduler = null;
		pendingDisconnectSync = null;
		if (activeScheduler != null) {
			activeScheduler.shutdownNow();
			try {
				activeScheduler.awaitTermination(1L, TimeUnit.SECONDS);
			} catch (InterruptedException e) {
				Thread.currentThread().interrupt();
			}
		}

		if (client != null) {
			if (config.syncPlayerStats) {
				syncPlayerStats(server, true, STOP_TIMEOUT);
			}

			List<StatusSnapshot.HistorySample> savedHistory;
			synchronized (history) {
				savedHistory = new ArrayList<>(history);
			}
			double maxMb = Runtime.getRuntime().maxMemory() / (1024.0 * 1024.0);
			StatusSnapshot.Snapshot offline = new StatusSnapshot.Snapshot(
				false,
				0.0,
				0.0,
				null,
				null,
				0,
				0,
				Math.max(0, server.getMaxPlayers()),
				List.of(),
				config.serverVersion,
				resolveMotd(server),
				0L,
				0.0,
				maxMb,
				savedHistory,
				System.currentTimeMillis()
			);
			boolean sent = client.push(offline, STOP_TIMEOUT);
			LOGGER.info("[FermiumStatus] Notifica Offline inviata alla chiusura: {}", sent);
		}
	}

	private void pushLiveTick(MinecraftServer server) {
		if (client == null) {
			return;
		}

		long now = System.currentTimeMillis();
		List<StatusSnapshot.PlayerEntry> entries = new ArrayList<>();
		Set<String> currentHumanUuids = new HashSet<>();
		int humanCount = 0;
		int botCount = 0;

		try {
			List<ServerPlayer> playerList = List.copyOf(server.getPlayerList().getPlayers());
			for (ServerPlayer player : playerList) {
				boolean isBot = isCarpetBot(player);
				String rawUuid = player.getStringUUID();
				if (isBot) {
					botCount++;
				} else {
					humanCount++;
					String cleanUuid = PlayerStatsParser.normalizeUuid(rawUuid);
					if (cleanUuid.length() == 32) {
						currentHumanUuids.add(cleanUuid);
					}
				}
				entries.add(new StatusSnapshot.PlayerEntry(
					player.getScoreboardName(),
					rawUuid,
					isBot
				));
			}
		} catch (Exception ignored) {
			// Skip transient collection races if server is shutting down
		}

		boolean humanDisconnected = false;
		for (String prevUuid : previousOnlineHumanUuids) {
			if (!currentHumanUuids.contains(prevUuid)) {
				humanDisconnected = true;
				break;
			}
		}
		previousOnlineHumanUuids = Set.copyOf(currentHumanUuids);
		if (humanDisconnected && config.syncPlayerStats) {
			scheduleDisconnectStatsSync(server);
		}

		TickTracker.TickMetrics metrics = tickTracker.compute(
			server.getTickTimesNanos(),
			now,
			(humanCount + botCount) > 0
		);

		Runtime runtime = Runtime.getRuntime();
		double usedMb = Math.max(0.0, (runtime.totalMemory() - runtime.freeMemory()) / (1024.0 * 1024.0));
		double maxMb = Math.max(usedMb, runtime.maxMemory() / (1024.0 * 1024.0));
		long uptimeSeconds = startedAtEpochMs > 0L ? Math.max(0L, (now - startedAtEpochMs) / 1000L) : 0L;

		List<StatusSnapshot.HistorySample> historyCopy;
		synchronized (history) {
			if (history.size() >= MAX_HISTORY) {
				history.removeFirst();
			}
			history.addLast(new StatusSnapshot.HistorySample(
				now,
				metrics.tps(),
				metrics.mspt(),
				humanCount,
				botCount
			));
			historyCopy = new ArrayList<>(history);
		}

		StatusSnapshot.Snapshot snapshot = new StatusSnapshot.Snapshot(
			true,
			metrics.tps(),
			metrics.mspt(),
			metrics.msptMin(),
			metrics.msptMax(),
			humanCount,
			botCount,
			Math.max(0, server.getMaxPlayers()),
			entries,
			config.serverVersion,
			resolveMotd(server),
			uptimeSeconds,
			usedMb,
			maxMb,
			historyCopy,
			now
		);

		boolean ok = client.push(snapshot, PUSH_TIMEOUT);
		if (ok && !firstPushLogged) {
			firstPushLogged = true;
			LOGGER.info("[FermiumStatus] Primo heartbeat pubblicato con successo su server_status/live.");
		}
	}

	private synchronized void scheduleDisconnectStatsSync(MinecraftServer server) {
		if (!config.syncPlayerStats || scheduler == null || scheduler.isShutdown()) {
			return;
		}
		if (pendingDisconnectSync != null && !pendingDisconnectSync.isDone()) {
			pendingDisconnectSync.cancel(false);
		}
		pendingDisconnectSync = scheduler.schedule(
			() -> syncPlayerStats(server, false, STATS_PUSH_TIMEOUT),
			3L,
			TimeUnit.SECONDS
		);
	}

	private void syncPlayerStats(MinecraftServer server, boolean onServerThread, Duration timeout) {
		if (!config.syncPlayerStats || client == null || !statsSyncInFlight.compareAndSet(false, true)) {
			return;
		}
		try {
			Map<String, String> liveOnlinePlayers = new ConcurrentHashMap<>();
			boolean hasOnlineHumans = collectLiveHumans(server, liveOnlinePlayers);

			if (onServerThread) {
				flushOnlineHumanStats(server, liveOnlinePlayers);
			} else if (hasOnlineHumans) {
				// Avoid blocking on server.submit when server is empty/paused
				try {
					server.submit(() -> flushOnlineHumanStats(server, liveOnlinePlayers))
						.get(2L, TimeUnit.SECONDS);
				} catch (TimeoutException | InterruptedException e) {
					if (e instanceof InterruptedException) {
						Thread.currentThread().interrupt();
					}
				} catch (Exception ignored) {
					// Proceed using on-disk stats files
				}
			}

			Path statsDir = server.getWorldPath(LevelResource.PLAYER_STATS_DIR);
			Path serverDir = server.getServerDirectory();
			List<PlayerStatsModel.PlayerStatsEntry> entries = statsScanner.scan(
				statsDir,
				serverDir,
				liveOnlinePlayers
			);
			if (entries.isEmpty()) {
				return;
			}

			String canonical = FirestorePayloadBuilder.toPlayersCanonicalJson(entries);
			if (canonical.equals(lastStatsHash)) {
				return;
			}

			boolean ok = client.pushPlayerStats(entries, System.currentTimeMillis(), timeout);
			if (ok) {
				lastStatsHash = canonical;
				if (!firstStatsLogged) {
					firstStatsLogged = true;
					LOGGER.info(
						"[FermiumStatus] Statistiche di {} player sincronizzate su server_status/player_stats.",
						entries.size()
					);
				}
			}
		} catch (Exception e) {
			LOGGER.debug("[FermiumStatus] Scansione stats saltata: {}", e.getMessage());
		} finally {
			statsSyncInFlight.set(false);
		}
	}

	private static boolean collectLiveHumans(MinecraftServer server, Map<String, String> out) {
		boolean anyHuman = false;
		try {
			for (ServerPlayer player : List.copyOf(server.getPlayerList().getPlayers())) {
				if (!isCarpetBot(player)) {
					anyHuman = true;
					String cleanUuid = PlayerStatsParser.normalizeUuid(player.getStringUUID());
					String name = player.getScoreboardName();
					if (cleanUuid.length() == 32 && name != null && !name.isBlank()) {
						out.put(cleanUuid, name.trim());
					}
				}
			}
		} catch (Exception ignored) {
			// Skip transient list races
		}
		return anyHuman;
	}

	private static void flushOnlineHumanStats(MinecraftServer server, Map<String, String> liveOut) {
		for (ServerPlayer player : List.copyOf(server.getPlayerList().getPlayers())) {
			if (!isCarpetBot(player)) {
				String cleanUuid = PlayerStatsParser.normalizeUuid(player.getStringUUID());
				String name = player.getScoreboardName();
				if (cleanUuid.length() == 32 && name != null && !name.isBlank()) {
					liveOut.put(cleanUuid, name.trim());
				}
				player.getStats().save();
			}
		}
	}

	private String resolveMotd(MinecraftServer server) {
		if (config.motdOverride != null && !config.motdOverride.isBlank()) {
			return config.motdOverride;
		}
		String motd = server.getMotd();
		return motd != null ? motd : "Fermium Technical SMP";
	}

	private static boolean isCarpetBot(ServerPlayer player) {
		Class<?> cls = player.getClass();
		while (cls != null && cls != Object.class) {
			if ("carpet.patches.EntityPlayerMPFake".equals(cls.getName())
				|| cls.getSimpleName().contains("Fake")) {
				return true;
			}
			cls = cls.getSuperclass();
		}
		if (player.connection != null && player.connection.getClass().getSimpleName().contains("Fake")) {
			return true;
		}
		return false;
	}
}
