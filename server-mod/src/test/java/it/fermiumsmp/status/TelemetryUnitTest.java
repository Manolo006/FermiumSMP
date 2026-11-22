package it.fermiumsmp.status;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
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
		if (System.getenv("FERMIUM_STATUS_PASSWORD") == null && System.getenv("STATUS_BOT_PASSWORD") == null) {
			assertNull(created.resolvePassword());
		}

		created.intervalSeconds = 3;
		created.sanitize();
		assertEquals(10, created.intervalSeconds);
		created.intervalSeconds = 120;
		created.sanitize();
		assertEquals(60, created.intervalSeconds);
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
}
