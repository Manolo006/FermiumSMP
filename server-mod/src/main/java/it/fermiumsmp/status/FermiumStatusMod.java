package it.fermiumsmp.status;

import net.fabricmc.api.DedicatedServerModInitializer;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerLifecycleEvents;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Dedicated server Fabric 26.2 entrypoint pushing live TPS, MSPT, RAM, uptime,
 * players and Carpet bots to Firebase Firestore ({@code server_status/live}).
 */
public final class FermiumStatusMod implements DedicatedServerModInitializer {
	public static final String MOD_ID = "fermium-status";
	public static final Logger LOGGER = LoggerFactory.getLogger(MOD_ID);

	private static final int MAX_HISTORY = 60;
	private static final Duration PUSH_TIMEOUT = Duration.ofSeconds(8);
	private static final Duration STOP_TIMEOUT = Duration.ofSeconds(4);

	private final TickTracker tickTracker = new TickTracker();
	private final Deque<StatusSnapshot.HistorySample> history = new ArrayDeque<>(MAX_HISTORY);

	private StatusConfig config;
	private FirebaseTelemetryClient client;
	private ScheduledExecutorService scheduler;
	private long startedAtEpochMs;
	private boolean firstPushLogged = false;

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

		LOGGER.info(
			"[FermiumStatus] Avviato per {} (progetto={}, intervallo={}s).",
			config.serverVersion,
			config.firebaseProjectId,
			config.intervalSeconds
		);
	}

	private void onServerStopping(MinecraftServer server) {
		ScheduledExecutorService activeScheduler = scheduler;
		scheduler = null;
		if (activeScheduler != null) {
			activeScheduler.shutdownNow();
			try {
				activeScheduler.awaitTermination(1L, TimeUnit.SECONDS);
			} catch (InterruptedException e) {
				Thread.currentThread().interrupt();
			}
		}

		if (client != null) {
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
		int humanCount = 0;
		int botCount = 0;

		try {
			List<ServerPlayer> playerList = List.copyOf(server.getPlayerList().getPlayers());
			for (ServerPlayer player : playerList) {
				boolean isBot = isCarpetBot(player);
				if (isBot) {
					botCount++;
				} else {
					humanCount++;
				}
				entries.add(new StatusSnapshot.PlayerEntry(
					player.getScoreboardName(),
					player.getStringUUID(),
					isBot
				));
			}
		} catch (Exception ignored) {
			// Skip transient collection races if server is shutting down
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
