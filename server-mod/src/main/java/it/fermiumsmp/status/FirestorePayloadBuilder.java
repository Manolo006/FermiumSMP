package it.fermiumsmp.status;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

import java.util.List;
import java.util.regex.Pattern;

/**
 * Serializes live server telemetry and player statistics into Firestore REST v1 document JSON
 * while enforcing every constraint verified by {@code firestore.rules}.
 */
public final class FirestorePayloadBuilder {
	private static final int MAX_PLAYERS_LIST = 60;
	private static final int MAX_HISTORY_LIST = 60;
	private static final int MAX_STATS_PLAYERS = 120;
	private static final int MAX_TOP_BLOCKS = 10;
	private static final long MAX_UPTIME_SECONDS = 315_360_000L;
	private static final double MAX_MEMORY_MB = 1_048_576.0;
	private static final Pattern SECTION_CODE_PATTERN = Pattern.compile("\\u00A7.");
	private static final Pattern WHITESPACE_PATTERN = Pattern.compile("[\\r\\n\\t]+");
	private static final Gson COMPACT_GSON = new GsonBuilder().disableHtmlEscaping().create();

	private FirestorePayloadBuilder() {
	}

	public static String toFirestoreDocumentJson(StatusSnapshot.Snapshot snapshot) {
		return COMPACT_GSON.toJson(toFirestoreDocument(snapshot));
	}

	public static JsonObject toFirestoreDocument(StatusSnapshot.Snapshot snapshot) {
		JsonObject fields = new JsonObject();

		fields.add("online", boolField(snapshot.online()));
		fields.add("tps", doubleField(clampDouble(snapshot.tps(), 0.0, 25.0)));
		fields.add("mspt", doubleField(clampDouble(snapshot.mspt(), 0.0, 5000.0)));

		if (snapshot.msptMin() != null) {
			fields.add("msptMin", doubleField(clampDouble(snapshot.msptMin(), 0.0, 5000.0)));
		}
		if (snapshot.msptMax() != null) {
			fields.add("msptMax", doubleField(clampDouble(snapshot.msptMax(), 0.0, 5000.0)));
		}

		fields.add("playersOnline", intField(clampLong(snapshot.playersOnline(), 0L, 500L)));
		fields.add("botsOnline", intField(clampLong(snapshot.botsOnline(), 0L, 500L)));
		fields.add("maxPlayers", intField(clampLong(snapshot.maxPlayers(), 0L, 500L)));

		if (snapshot.players() != null) {
			fields.add("players", buildPlayersArray(snapshot.players()));
		}

		if (snapshot.version() != null) {
			fields.add("version", stringField(truncate(snapshot.version().trim(), 80)));
		}

		if (snapshot.motd() != null) {
			fields.add("motd", stringField(truncate(sanitizeMotd(snapshot.motd()), 200)));
		}

		fields.add("uptimeSeconds", intField(clampLong(snapshot.uptimeSeconds(), 0L, MAX_UPTIME_SECONDS)));
		fields.add("memoryUsedMb", doubleField(round1(clampDouble(snapshot.memoryUsedMb(), 0.0, MAX_MEMORY_MB))));
		fields.add("memoryMaxMb", doubleField(round1(clampDouble(snapshot.memoryMaxMb(), 0.0, MAX_MEMORY_MB))));

		if (snapshot.history() != null) {
			fields.add("history", buildHistoryArray(snapshot.history()));
		}

		long safeTs = snapshot.updatedAtMs() > 0L ? snapshot.updatedAtMs() : System.currentTimeMillis();
		fields.add("updatedAtMs", intField(safeTs));

		JsonObject root = new JsonObject();
		root.add("fields", fields);
		return root;
	}

	public static String toPlayerStatsDocumentJson(List<PlayerStatsModel.PlayerStatsEntry> players, long updatedAtMs) {
		return COMPACT_GSON.toJson(toPlayerStatsDocument(players, updatedAtMs));
	}

	public static String toPlayersCanonicalJson(List<PlayerStatsModel.PlayerStatsEntry> players) {
		return COMPACT_GSON.toJson(buildPlayerStatsArray(players == null ? List.of() : players));
	}

	public static JsonObject toPlayerStatsDocument(List<PlayerStatsModel.PlayerStatsEntry> players, long updatedAtMs) {
		JsonObject fields = new JsonObject();
		fields.add("players", buildPlayerStatsArray(players == null ? List.of() : players));
		long safeTs = updatedAtMs > 0L ? updatedAtMs : System.currentTimeMillis();
		fields.add("updatedAtMs", intField(safeTs));

		JsonObject root = new JsonObject();
		root.add("fields", fields);
		return root;
	}

	private static JsonObject buildPlayersArray(List<StatusSnapshot.PlayerEntry> entries) {
		JsonArray values = new JsonArray();
		for (StatusSnapshot.PlayerEntry entry : entries) {
			if (values.size() >= MAX_PLAYERS_LIST) {
				break;
			}
			if (entry == null || entry.name() == null || entry.name().isBlank()) {
				continue;
			}
			JsonObject pFields = new JsonObject();
			pFields.add("name", stringField(truncate(entry.name().trim(), 40)));
			if (entry.uuid() != null && !entry.uuid().isBlank()) {
				pFields.add("uuid", stringField(truncate(entry.uuid().trim(), 36)));
			}
			pFields.add("isBot", boolField(entry.isBot()));
			values.add(wrapMap(pFields));
		}
		return wrapArray(values);
	}

	private static JsonObject buildHistoryArray(List<StatusSnapshot.HistorySample> samples) {
		int startIdx = Math.max(0, samples.size() - MAX_HISTORY_LIST);
		JsonArray values = new JsonArray();
		for (int i = startIdx; i < samples.size(); i++) {
			StatusSnapshot.HistorySample sample = samples.get(i);
			if (sample == null || sample.ts() <= 0L) {
				continue;
			}
			JsonObject sFields = new JsonObject();
			sFields.add("ts", intField(sample.ts()));
			sFields.add("tps", doubleField(clampDouble(sample.tps(), 0.0, 25.0)));
			sFields.add("mspt", doubleField(clampDouble(sample.mspt(), 0.0, 5000.0)));
			sFields.add("players", intField(clampLong(sample.players(), 0L, 500L)));
			sFields.add("bots", intField(clampLong(sample.bots(), 0L, 500L)));
			values.add(wrapMap(sFields));
		}
		return wrapArray(values);
	}

	private static JsonObject buildPlayerStatsArray(List<PlayerStatsModel.PlayerStatsEntry> entries) {
		JsonArray values = new JsonArray();
		for (PlayerStatsModel.PlayerStatsEntry entry : entries) {
			if (values.size() >= MAX_STATS_PLAYERS) {
				break;
			}
			if (entry == null || entry.name() == null || entry.name().isBlank()) {
				continue;
			}
			JsonObject pFields = new JsonObject();
			pFields.add("name", stringField(truncate(entry.name().trim(), 40)));
			if (entry.uuid() != null && !entry.uuid().isBlank()) {
				pFields.add("uuid", stringField(truncate(entry.uuid().trim(), 36)));
			}
			pFields.add("playTimeHours", doubleField(round1(clampDouble(entry.playTimeHours(), 0.0, 1_000_000.0))));
			pFields.add("blocksMined", intField(clampLong(entry.blocksMined(), 0L, 2_000_000_000L)));
			pFields.add("blocksPlaced", intField(clampLong(entry.blocksPlaced(), 0L, 2_000_000_000L)));
			pFields.add("deaths", intField(clampLong(entry.deaths(), 0L, 100_000_000L)));
			pFields.add("mobKills", intField(clampLong(entry.mobKills(), 0L, 2_000_000_000L)));
			pFields.add("distanceKm", doubleField(round1(clampDouble(entry.distanceKm(), 0.0, 100_000_000.0))));
			pFields.add("carpetScore", intField(clampLong(entry.carpetScore(), 0L, 4_000_000_000L)));
			pFields.add("topBlocks", buildTopBlocksArray(entry.topBlocks()));
			pFields.add("topPlacedBlocks", buildTopBlocksArray(entry.topPlacedBlocks()));
			pFields.add("topKilledMobs", buildTopBlocksArray(entry.topKilledMobs()));
			values.add(wrapMap(pFields));
		}
		return wrapArray(values);
	}

	private static JsonObject buildTopBlocksArray(List<PlayerStatsModel.TopBlock> blocks) {
		JsonArray values = new JsonArray();
		if (blocks != null) {
			for (PlayerStatsModel.TopBlock block : blocks) {
				if (values.size() >= MAX_TOP_BLOCKS) {
					break;
				}
				if (block == null || block.id() == null || block.id().isBlank()) {
					continue;
				}
				String safeLabel = (block.label() == null || block.label().isBlank())
					? PlayerStatsParser.formatBlockLabel(block.id())
					: block.label().trim();
				JsonObject bFields = new JsonObject();
				bFields.add("id", stringField(truncate(block.id().trim(), 80)));
				bFields.add("label", stringField(truncate(safeLabel, 80)));
				bFields.add("count", intField(clampLong(block.count(), 0L, 2_000_000_000L)));
				values.add(wrapMap(bFields));
			}
		}
		return wrapArray(values);
	}

	public static String sanitizeMotd(String raw) {
		if (raw == null) {
			return "";
		}
		String noCodes = SECTION_CODE_PATTERN.matcher(raw).replaceAll("");
		return WHITESPACE_PATTERN.matcher(noCodes).replaceAll(" ").trim();
	}

	private static JsonObject wrapMap(JsonObject fields) {
		JsonObject map = new JsonObject();
		map.add("fields", fields);
		JsonObject wrapper = new JsonObject();
		wrapper.add("mapValue", map);
		return wrapper;
	}

	private static JsonObject wrapArray(JsonArray values) {
		JsonObject arrayValue = new JsonObject();
		arrayValue.add("values", values);
		JsonObject out = new JsonObject();
		out.add("arrayValue", arrayValue);
		return out;
	}

	private static JsonObject boolField(boolean value) {
		JsonObject o = new JsonObject();
		o.addProperty("booleanValue", value);
		return o;
	}

	private static JsonObject intField(long value) {
		JsonObject o = new JsonObject();
		o.addProperty("integerValue", Long.toString(value));
		return o;
	}

	private static JsonObject doubleField(double value) {
		JsonObject o = new JsonObject();
		o.addProperty("doubleValue", Double.isFinite(value) ? value : 0.0);
		return o;
	}

	private static JsonObject stringField(String value) {
		JsonObject o = new JsonObject();
		o.addProperty("stringValue", value);
		return o;
	}

	private static double clampDouble(double val, double min, double max) {
		if (!Double.isFinite(val)) {
			return min;
		}
		return Math.max(min, Math.min(max, val));
	}

	private static long clampLong(long val, long min, long max) {
		return Math.max(min, Math.min(max, val));
	}

	private static double round1(double val) {
		return Math.round(val * 10.0) / 10.0;
	}

	private static String truncate(String val, int maxLen) {
		if (val == null) {
			return "";
		}
		return val.length() <= maxLen ? val : val.substring(0, maxLen);
	}
}
