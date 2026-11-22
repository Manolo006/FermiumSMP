package it.fermiumsmp.status;

import java.util.List;

/**
 * Immutable player statistics models matching {@code MemberStats} on the website
 * and the Firestore {@code server_status/player_stats} schema.
 */
public final class PlayerStatsModel {
	private PlayerStatsModel() {
	}

	public record TopBlock(String id, String label, long count) {
	}

	public record PlayerStatsEntry(
		String name,
		String uuid,
		double playTimeHours,
		long blocksMined,
		long blocksPlaced,
		long deaths,
		long mobKills,
		double distanceKm,
		long carpetScore,
		List<TopBlock> topBlocks
	) {
	}
}
