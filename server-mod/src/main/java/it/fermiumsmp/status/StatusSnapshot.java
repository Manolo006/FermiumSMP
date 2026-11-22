package it.fermiumsmp.status;

import java.util.List;

/**
 * Immutable server telemetry models mirroring the Firestore {@code server_status/live} schema.
 */
public final class StatusSnapshot {
	private StatusSnapshot() {
	}

	public record PlayerEntry(String name, String uuid, boolean isBot) {
	}

	public record HistorySample(long ts, double tps, double mspt, int players, int bots) {
	}

	public record Snapshot(
		boolean online,
		double tps,
		double mspt,
		Double msptMin,
		Double msptMax,
		int playersOnline,
		int botsOnline,
		int maxPlayers,
		List<PlayerEntry> players,
		String version,
		String motd,
		long uptimeSeconds,
		double memoryUsedMb,
		double memoryMaxMb,
		List<HistorySample> history,
		long updatedAtMs
	) {
	}
}
