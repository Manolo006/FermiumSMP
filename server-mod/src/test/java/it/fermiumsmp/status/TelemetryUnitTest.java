package it.fermiumsmp.status;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class TelemetryUnitTest {

	@Test
	void configCreatesDefaultAndRejectsPlaceholderPassword(@TempDir Path dir) {
		Path cfgFile = dir.resolve("fermium-status.json");
		StatusConfig created = StatusConfig.loadOrCreate(cfgFile, null);
		assertTrue(Files.exists(cfgFile));
		assertEquals("fermiumsmp", created.firebaseProjectId);
		assertEquals("Fabric 26.2", created.serverVersion);
		assertEquals(20, created.intervalSeconds);
		assertTrue(created.syncPlayerStats);
		assertEquals(300, created.statsIntervalSeconds);
		if (System.getenv("FERMIUM_STATUS_PASSWORD") == null && System.getenv("STATUS_BOT_PASSWORD") == null) {
			assertNull(created.resolvePassword());
		}

		created.intervalSeconds = 3;
		created.statsIntervalSeconds = 10;
		created.sanitize();
		assertEquals(10, created.intervalSeconds);
		assertEquals(60, created.statsIntervalSeconds);

		created.intervalSeconds = 120;
		created.statsIntervalSeconds = 99999;
		created.sanitize();
		assertEquals(60, created.intervalSeconds);
		assertEquals(3600, created.statsIntervalSeconds);
	}

	@Test
	void tickTrackerComputesHealthyLaggingAndPausedStates() {
		TickTracker tracker = new TickTracker();

		// Healthy 20ms average tick time -> 20.0 TPS, 20.0 MSPT
		long[] healthy = {20_000_000L, 10_000_000L, 30_000_000L, 0L};
		tracker.recordSampleNanos(20_000_000L, 1_000L);
		TickTracker.TickMetrics ok = tracker.compute(healthy, 2_000L, true);
		assertEquals(20.0, ok.tps());
		assertEquals(20.0, ok.mspt());
		assertEquals(10.0, ok.msptMin());
		assertEquals(30.0, ok.msptMax());

		// Overloaded 100ms tick -> 10.0 TPS, 100.0 MSPT
		long[] lagging = {100_000_000L, 100_000_000L};
		TickTracker.TickMetrics slow = tracker.compute(lagging, 2_500L, true);
		assertEquals(10.0, slow.tps());
		assertEquals(100.0, slow.mspt());

		// Server paused when empty for >= 5s -> reports clean idle 20.0 TPS / 0.0 MSPT
		TickTracker.TickMetrics paused = tracker.compute(lagging, 10_000L, false);
		assertEquals(20.0, paused.tps());
		assertEquals(0.0, paused.mspt());
	}

	@Test
	void firestorePayloadMatchesRulesSchemaAndCaps() {
		List<StatusSnapshot.PlayerEntry> players = new ArrayList<>();
		for (int i = 0; i < 75; i++) {
			players.add(new StatusSnapshot.PlayerEntry("Player_" + i + "_" + "x".repeat(45), "00000000-0000-0000-0000-000000000000-extra", i % 3 == 0));
		}

		List<StatusSnapshot.HistorySample> history = new ArrayList<>();
		for (int i = 0; i < 75; i++) {
			history.add(new StatusSnapshot.HistorySample(1_700_000_000_000L + i * 20_000L, 20.0, 12.5, 2, 1));
		}

		StatusSnapshot.Snapshot snap = new StatusSnapshot.Snapshot(
			true,
			Double.NaN,
			14.25,
			9.5,
			22.1,
			2,
			1,
			20,
			players,
			"Fabric 26.2",
			"\u00A7bFermium \u00A7lTechnical\nSMP " + "A".repeat(250),
			3600L,
			2048.44,
			8192.0,
			history,
			1_700_000_000_000L
		);

		String json = FirestorePayloadBuilder.toFirestoreDocumentJson(snap);
		JsonObject root = JsonParser.parseString(json).getAsJsonObject();
		JsonObject fields = root.getAsJsonObject("fields");

		Set<String> allowed = Set.of(
			"online", "tps", "mspt", "msptMin", "msptMax",
			"playersOnline", "botsOnline", "maxPlayers", "players",
			"version", "motd", "uptimeSeconds", "memoryUsedMb", "memoryMaxMb",
			"history", "updatedAtMs", "updatedAt"
		);
		for (String key : fields.keySet()) {
			assertTrue(allowed.contains(key), "Unexpected Firestore field: " + key);
		}

		assertTrue(fields.getAsJsonObject("online").has("booleanValue"));
		assertEquals(0.0, fields.getAsJsonObject("tps").get("doubleValue").getAsDouble());
		assertTrue(fields.getAsJsonObject("playersOnline").has("integerValue"));
		assertTrue(fields.getAsJsonObject("botsOnline").has("integerValue"));
		assertTrue(fields.getAsJsonObject("maxPlayers").has("integerValue"));
		assertTrue(fields.getAsJsonObject("uptimeSeconds").has("integerValue"));
		assertTrue(fields.getAsJsonObject("updatedAtMs").has("integerValue"));

		String motd = fields.getAsJsonObject("motd").get("stringValue").getAsString();
		assertFalse(motd.contains("\u00A7"));
		assertTrue(motd.startsWith("Fermium Technical SMP"));
		assertTrue(motd.length() <= 200);

		JsonArray pArr = fields.getAsJsonObject("players").getAsJsonObject("arrayValue").getAsJsonArray("values");
		assertEquals(60, pArr.size());
		JsonObject firstPlayerFields = pArr.get(0).getAsJsonObject().getAsJsonObject("mapValue").getAsJsonObject("fields");
		assertTrue(firstPlayerFields.getAsJsonObject("name").get("stringValue").getAsString().length() <= 40);
		assertTrue(firstPlayerFields.getAsJsonObject("uuid").get("stringValue").getAsString().length() <= 36);

		JsonArray hArr = fields.getAsJsonObject("history").getAsJsonObject("arrayValue").getAsJsonArray("values");
		assertEquals(60, hArr.size());
		JsonElement lastTs = hArr.get(59).getAsJsonObject().getAsJsonObject("mapValue").getAsJsonObject("fields")
			.getAsJsonObject("ts").get("integerValue");
		assertEquals(Long.toString(1_700_000_000_000L + 74 * 20_000L), lastTs.getAsString());
	}

	@Test
	void playerStatsParserExcludesToolsFoodAndComputesCarpetScore() {
		String rawJson = """
			{
			  "stats": {
			    "minecraft:custom": {
			      "minecraft:play_time": 144000,
			      "minecraft:deaths": 3,
			      "minecraft:mob_kills": 420,
			      "minecraft:walk_one_cm": 150000,
			      "minecraft:fly_one_cm": 50000
			    },
			    "minecraft:mined": {
			      "minecraft:deepslate": 2000,
			      "minecraft:stone": 1200,
			      "minecraft:netherrack": 800,
			      "minecraft:dirt": 150
			    },
			    "minecraft:used": {
			      "minecraft:stone_bricks": 600,
			      "minecraft:redstone": 400,
			      "minecraft:netherite_pickaxe": 9999,
			      "minecraft:cooked_beef": 300,
			      "minecraft:firework_rocket": 120,
			      "minecraft:golden_carrot": 80
			    },
			    "minecraft:killed": {
			      "minecraft:zombified_piglin": 300,
			      "minecraft:enderman": 100,
			      "minecraft:zombie": 20
			    }
			  }
			}
			""";
		JsonObject parsedJson = JsonParser.parseString(rawJson).getAsJsonObject();
		PlayerStatsModel.PlayerStatsEntry entry = PlayerStatsParser.parse(
			"Manolo006",
			"01c530a3-5f97-448f-a25d-5cdd01c65715",
			parsedJson
		);

		assertEquals("Manolo006", entry.name());
		assertEquals("01c530a35f97448fa25d5cdd01c65715", entry.uuid());
		assertEquals(2.0, entry.playTimeHours());
		assertEquals(4150L, entry.blocksMined());
		assertEquals(1000L, entry.blocksPlaced());
		assertEquals(5150L, entry.carpetScore());
		assertEquals(3L, entry.deaths());
		assertEquals(420L, entry.mobKills());
		assertEquals(2.0, entry.distanceKm());
		assertEquals(4, entry.topBlocks().size());
		assertEquals("deepslate", entry.topBlocks().get(0).id());
		assertEquals("Deepslate", entry.topBlocks().get(0).label());
		assertEquals(2000L, entry.topBlocks().get(0).count());
		assertEquals(2, entry.topPlacedBlocks().size());
		assertEquals("stone_bricks", entry.topPlacedBlocks().get(0).id());
		assertEquals(600L, entry.topPlacedBlocks().get(0).count());
		assertEquals(3, entry.topKilledMobs().size());
		assertEquals("zombified_piglin", entry.topKilledMobs().get(0).id());
		assertEquals("Zombified Piglin", entry.topKilledMobs().get(0).label());
		assertEquals(300L, entry.topKilledMobs().get(0).count());
		assertTrue(PlayerStatsParser.isOfflineBotUuid("11111111-1111-3111-8111-111111111111"));
		assertFalse(PlayerStatsParser.isOfflineBotUuid("01c530a3-5f97-448f-a25d-5cdd01c65715"));
	}

	@Test
	void playerStatsScannerReadsWhitelistUsercacheAndSkipsUntrackedBots(@TempDir Path dir) throws IOException {
		Path statsDir = dir.resolve("world").resolve("stats");
		Files.createDirectories(statsDir);

		Files.writeString(dir.resolve("whitelist.json"), """
			[
			  {"uuid": "01c530a3-5f97-448f-a25d-5cdd01c65715", "name": "Manolo006"}
			]
			""", StandardCharsets.UTF_8);

		Files.writeString(dir.resolve("usercache.json"), """
			[
			  {"uuid": "0c30ec2c-435c-4a75-aa5f-fe5f7cc4cf88", "name": "jenktland3"},
			  {"uuid": "11111111-1111-3111-8111-111111111111", "name": "bot_raid"}
			]
			""", StandardCharsets.UTF_8);

		Files.writeString(statsDir.resolve("01c530a3-5f97-448f-a25d-5cdd01c65715.json"), """
			{"stats":{"minecraft:mined":{"minecraft:stone":100},"minecraft:used":{"minecraft:stone":50}}}
			""", StandardCharsets.UTF_8);

		Files.writeString(statsDir.resolve("0c30ec2c-435c-4a75-aa5f-fe5f7cc4cf88.json"), """
			{"stats":{"minecraft:mined":{"minecraft:deepslate":500},"minecraft:used":{"minecraft:obsidian":100}}}
			""", StandardCharsets.UTF_8);

		// Untracked offline v3 bot UUID must be filtered out
		Files.writeString(statsDir.resolve("11111111-1111-3111-8111-111111111111.json"), """
			{"stats":{"minecraft:mined":{"minecraft:netherrack":99999}}}
			""", StandardCharsets.UTF_8);

		PlayerStatsScanner scanner = new PlayerStatsScanner(false);
		List<PlayerStatsModel.PlayerStatsEntry> results = scanner.scan(statsDir, dir, Map.of());

		assertEquals(2, results.size());
		assertEquals("jenktland3", results.get(0).name());
		assertEquals(600L, results.get(0).carpetScore());
		assertEquals("Manolo006", results.get(1).name());
		assertEquals(150L, results.get(1).carpetScore());
	}

	@Test
	void firestorePlayerStatsPayloadMatchesRulesSchemaAndCaps() {
		List<PlayerStatsModel.TopBlock> manyBlocks = new ArrayList<>();
		List<PlayerStatsModel.TopBlock> manyPlaced = new ArrayList<>();
		List<PlayerStatsModel.TopBlock> manyMobs = new ArrayList<>();
		for (int i = 0; i < 12; i++) {
			manyBlocks.add(new PlayerStatsModel.TopBlock("stone_" + i, "Stone " + i, 500 - i * 10));
			manyPlaced.add(new PlayerStatsModel.TopBlock("piston_" + i, "Piston " + i, 400 - i * 10));
			manyMobs.add(new PlayerStatsModel.TopBlock("zombie_" + i, "Zombie " + i, 300 - i * 10));
		}

		List<PlayerStatsModel.PlayerStatsEntry> manyPlayers = new ArrayList<>();
		for (int i = 0; i < 140; i++) {
			manyPlayers.add(new PlayerStatsModel.PlayerStatsEntry(
				"LongPlayer_" + i + "_" + "z".repeat(45),
				"01c530a35f97448fa25d5cdd01c65715-overflow",
				12.34,
				1000 + i,
				200,
				2,
				50,
				19.87,
				1200 + i,
				manyBlocks,
				manyPlaced,
				manyMobs
			));
		}

		String docJson = FirestorePayloadBuilder.toPlayerStatsDocumentJson(manyPlayers, 1_700_000_000_000L);
		JsonObject root = JsonParser.parseString(docJson).getAsJsonObject();
		JsonObject fields = root.getAsJsonObject("fields");

		assertEquals(Set.of("players", "updatedAtMs"), fields.keySet());
		assertTrue(fields.getAsJsonObject("updatedAtMs").has("integerValue"));

		JsonArray pArr = fields.getAsJsonObject("players").getAsJsonObject("arrayValue").getAsJsonArray("values");
		assertEquals(120, pArr.size());

		JsonObject p0 = pArr.get(0).getAsJsonObject().getAsJsonObject("mapValue").getAsJsonObject("fields");
		Set<String> allowedEntryKeys = Set.of(
			"name", "uuid", "playTimeHours", "blocksMined", "blocksPlaced",
			"deaths", "mobKills", "distanceKm", "carpetScore",
			"topBlocks", "topPlacedBlocks", "topKilledMobs"
		);
		assertEquals(allowedEntryKeys, p0.keySet());
		assertTrue(p0.getAsJsonObject("name").get("stringValue").getAsString().length() <= 40);
		assertTrue(p0.getAsJsonObject("uuid").get("stringValue").getAsString().length() <= 36);
		assertTrue(p0.getAsJsonObject("playTimeHours").has("doubleValue"));
		assertTrue(p0.getAsJsonObject("distanceKm").has("doubleValue"));
		assertTrue(p0.getAsJsonObject("blocksMined").has("integerValue"));
		assertTrue(p0.getAsJsonObject("blocksPlaced").has("integerValue"));
		assertTrue(p0.getAsJsonObject("deaths").has("integerValue"));
		assertTrue(p0.getAsJsonObject("mobKills").has("integerValue"));
		assertTrue(p0.getAsJsonObject("carpetScore").has("integerValue"));

		for (String arrKey : List.of("topBlocks", "topPlacedBlocks", "topKilledMobs")) {
			JsonArray arr = p0.getAsJsonObject(arrKey).getAsJsonObject("arrayValue").getAsJsonArray("values");
			assertEquals(10, arr.size(), "Expected max 10 items in " + arrKey);
			JsonObject item0 = arr.get(0).getAsJsonObject().getAsJsonObject("mapValue").getAsJsonObject("fields");
			assertEquals(Set.of("id", "label", "count"), item0.keySet());
			assertTrue(item0.getAsJsonObject("count").has("integerValue"));
		}
	}
}
