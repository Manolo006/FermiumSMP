package it.fermiumsmp.status;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Stream;

/**
 * Scans {@code world/stats/<uuid>.json} on disk and resolves usernames from
 * online players, {@code whitelist.json}, {@code ops.json}, {@code usercache.json},
 * and optionally PlayerDB.
 */
public final class PlayerStatsScanner {
	private static final int MAX_TRACKED_PLAYERS = 120;

	private final boolean enableRemoteLookup;
	private final HttpClient http;
	private final ConcurrentHashMap<String, Optional<String>> remoteNameCache = new ConcurrentHashMap<>();

	public PlayerStatsScanner() {
		this(true);
	}

	public PlayerStatsScanner(boolean enableRemoteLookup) {
		this.enableRemoteLookup = enableRemoteLookup;
		this.http = HttpClient.newBuilder()
			.connectTimeout(Duration.ofSeconds(4))
			.build();
	}

	public List<PlayerStatsModel.PlayerStatsEntry> scan(
		Path statsDir,
		Path serverDir,
		Map<String, String> liveOnlinePlayers
	) {
		if (statsDir == null || !Files.isDirectory(statsDir)) {
			return List.of();
		}

		Map<String, String> uuidToName = new HashMap<>();
		Set<String> trackedUuids = new HashSet<>();

		if (liveOnlinePlayers != null) {
			for (Map.Entry<String, String> entry : liveOnlinePlayers.entrySet()) {
				String uuid = PlayerStatsParser.normalizeUuid(entry.getKey());
				String name = entry.getValue();
				if (uuid.length() == 32 && name != null && !name.isBlank()) {
					uuidToName.putIfAbsent(uuid, name.trim());
					trackedUuids.add(uuid);
				}
			}
		}

		if (serverDir != null) {
			readJsonIdentityList(serverDir.resolve("whitelist.json"), uuidToName, trackedUuids, true);
			readJsonIdentityList(serverDir.resolve("ops.json"), uuidToName, trackedUuids, true);
			readJsonIdentityList(serverDir.resolve("usercache.json"), uuidToName, trackedUuids, false);
		}

		List<PlayerStatsModel.PlayerStatsEntry> entries = new ArrayList<>();
		try (Stream<Path> stream = Files.list(statsDir)) {
			List<Path> files = stream
				.filter(p -> Files.isRegularFile(p) && p.getFileName().toString().endsWith(".json"))
				.toList();

			for (Path file : files) {
				String fileName = file.getFileName().toString();
				String base = fileName.substring(0, fileName.length() - ".json".length());
				String uuid = PlayerStatsParser.normalizeUuid(base);
				if (uuid.length() != 32) {
					continue;
				}
				if (PlayerStatsParser.isOfflineBotUuid(uuid) && !trackedUuids.contains(uuid)) {
					continue;
				}

				JsonObject rawStats = readJsonObject(file);
				if (rawStats == null) {
					continue;
				}

				String playerName = uuidToName.get(uuid);
				if (playerName == null && enableRemoteLookup) {
					playerName = resolveRemoteName(uuid);
					if (playerName != null) {
						uuidToName.put(uuid, playerName);
					}
				}
				if (playerName == null || playerName.isBlank()) {
					continue;
				}

				entries.add(PlayerStatsParser.parse(playerName, uuid, rawStats));
			}
		} catch (IOException ignored) {
			return List.of();
		}

		entries.sort(
			Comparator.comparingLong(PlayerStatsModel.PlayerStatsEntry::carpetScore)
				.reversed()
				.thenComparing(PlayerStatsModel.PlayerStatsEntry::name, String.CASE_INSENSITIVE_ORDER)
		);

		return entries.size() <= MAX_TRACKED_PLAYERS
			? List.copyOf(entries)
			: List.copyOf(entries.subList(0, MAX_TRACKED_PLAYERS));
	}

	private static void readJsonIdentityList(
		Path file,
		Map<String, String> uuidToName,
		Set<String> trackedUuids,
		boolean trackOfflineUuids
	) {
		if (!Files.isRegularFile(file)) {
			return;
		}
		try {
			String raw = Files.readString(file, StandardCharsets.UTF_8);
			JsonElement root = JsonParser.parseString(raw);
			if (!root.isJsonArray()) {
				return;
			}
			for (JsonElement el : root.getAsJsonArray()) {
				if (!el.isJsonObject()) {
					continue;
				}
				JsonObject obj = el.getAsJsonObject();
				String rawUuid = obj.has("uuid") && obj.get("uuid").isJsonPrimitive()
					? obj.get("uuid").getAsString()
					: null;
				String rawName = obj.has("name") && obj.get("name").isJsonPrimitive()
					? obj.get("name").getAsString()
					: null;
				String uuid = PlayerStatsParser.normalizeUuid(rawUuid);
				if (uuid.length() == 32 && rawName != null && !rawName.isBlank()) {
					uuidToName.putIfAbsent(uuid, rawName.trim());
					if (trackOfflineUuids) {
						trackedUuids.add(uuid);
					}
				}
			}
		} catch (Exception ignored) {
			// Skip unreadable or malformed identity files gracefully
		}
	}

	private static JsonObject readJsonObject(Path file) {
		try {
			String raw = Files.readString(file, StandardCharsets.UTF_8);
			JsonElement parsed = JsonParser.parseString(raw);
			return parsed != null && parsed.isJsonObject() ? parsed.getAsJsonObject() : null;
		} catch (Exception ignored) {
			return null;
		}
	}

	private String resolveRemoteName(String uuid) {
		return remoteNameCache.computeIfAbsent(uuid, key -> {
			try {
				HttpRequest req = HttpRequest.newBuilder(URI.create("https://playerdb.co/api/player/minecraft/" + key))
					.timeout(Duration.ofSeconds(5))
					.header("User-Agent", "FermiumSMP-StatusMod/1.1")
					.GET()
					.build();
				HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
				if (res.statusCode() < 200 || res.statusCode() >= 300) {
					return Optional.empty();
				}
				JsonObject json = JsonParser.parseString(res.body()).getAsJsonObject();
				JsonObject data = json.has("data") && json.get("data").isJsonObject()
					? json.getAsJsonObject("data")
					: null;
				JsonObject player = data != null && data.has("player") && data.get("player").isJsonObject()
					? data.getAsJsonObject("player")
					: null;
				String username = player != null && player.has("username") && player.get("username").isJsonPrimitive()
					? player.get("username").getAsString()
					: null;
				return username != null && !username.isBlank()
					? Optional.of(username.trim())
					: Optional.empty();
			} catch (InterruptedException e) {
				Thread.currentThread().interrupt();
				return Optional.empty();
			} catch (Exception e) {
				return Optional.empty();
			}
		}).orElse(null);
	}
}
