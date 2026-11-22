package it.fermiumsmp.status;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonPrimitive;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Pure parser for Minecraft Java Edition player statistics ({@code world/stats/<uuid>.json}),
 * matching {@code scripts/parseMinecraftStats.mjs} on the website.
 */
public final class PlayerStatsParser {
	private static final Pattern NON_HEX_PATTERN = Pattern.compile("[^a-fA-F0-9]");
	private static final Pattern MINECRAFT_PREFIX_PATTERN = Pattern.compile("^minecraft:", Pattern.CASE_INSENSITIVE);

	private static final List<String> EXCLUDED_USED_SUFFIXES = List.of(
		"_pickaxe",
		"_shovel",
		"_axe",
		"_hoe",
		"_sword",
		"_helmet",
		"_chestplate",
		"_leggings",
		"_boots",
		"_bucket",
		"_boat",
		"_raft",
		"_minecart",
		"_spawn_egg",
		"_potion",
		"_stew",
		"_soup",
		"_bottle",
		"_book",
		"_map",
		"_dye",
		"_music_disc",
		"_smithing_template",
		"_sherd"
	);

	private static final List<String> EXCLUDED_USED_PREFIXES = List.of("cooked_", "golden_");

	private static final Set<String> EXCLUDED_USED_ITEMS = Set.of(
		"firework_rocket",
		"ender_pearl",
		"shears",
		"flint_and_steel",
		"fishing_rod",
		"bow",
		"crossbow",
		"trident",
		"mace",
		"shield",
		"spyglass",
		"brush",
		"wind_charge",
		"snowball",
		"egg",
		"bone_meal",
		"lead",
		"name_tag",
		"totem_of_undying",
		"bread",
		"apple",
		"carrot",
		"potato",
		"baked_potato",
		"melon_slice",
		"sweet_berries",
		"glow_berries",
		"dried_kelp",
		"chorus_fruit",
		"rotten_flesh",
		"spider_eye",
		"pumpkin_pie",
		"compass",
		"recovery_compass",
		"clock",
		"goat_horn",
		"bundle",
		"ender_eye",
		"experience_bottle",
		"enchanted_golden_apple",
		"potion",
		"splash_potion",
		"lingering_potion",
		"honey_bottle",
		"cookie",
		"milk_bucket",
		"water_bucket",
		"lava_bucket",
		"writable_book",
		"written_book",
		"knowledge_book"
	);

	private PlayerStatsParser() {
	}

	public static String normalizeUuid(String uuid) {
		if (uuid == null) {
			return "";
		}
		return NON_HEX_PATTERN.matcher(uuid).replaceAll("").toLowerCase(Locale.ROOT);
	}

	/**
	 * Carpet fake players / offline UUIDs use version 3 UUIDs ({@code xxxxxxxx-xxxx-3xxx-...}).
	 */
	public static boolean isOfflineBotUuid(String uuid) {
		String clean = normalizeUuid(uuid);
		return clean.length() == 32 && clean.charAt(12) == '3';
	}

	public static String formatBlockLabel(String rawId) {
		String clean = stripNamespace(rawId).trim();
		if (clean.isEmpty()) {
			return "Unknown";
		}
		String[] parts = clean.split("_");
		StringBuilder sb = new StringBuilder();
		for (String part : parts) {
			if (part.isEmpty()) {
				continue;
			}
			if (sb.length() > 0) {
				sb.append(' ');
			}
			sb.append(Character.toUpperCase(part.charAt(0)));
			if (part.length() > 1) {
				sb.append(part.substring(1));
			}
		}
		return sb.length() > 0 ? sb.toString() : "Unknown";
	}

	public static PlayerStatsModel.PlayerStatsEntry parse(String name, String uuid, JsonObject rawStats) {
		JsonObject rootStats = getObjectOrNull(rawStats, "stats");
		JsonObject custom = getObjectOrNull(rootStats, "minecraft:custom");
		JsonObject mined = getObjectOrNull(rootStats, "minecraft:mined");
		JsonObject used = getObjectOrNull(rootStats, "minecraft:used");

		double playTimeTicks = safeNonNegativeDouble(custom, "minecraft:play_time");
		if (playTimeTicks == 0.0) {
			playTimeTicks = safeNonNegativeDouble(custom, "minecraft:play_one_minute");
		}
		double playTimeHours = round1(playTimeTicks / 20.0 / 3600.0);

		long blocksMined = 0L;
		List<PlayerStatsModel.TopBlock> minedEntries = new ArrayList<>();
		if (mined != null) {
			for (Map.Entry<String, JsonElement> entry : mined.entrySet()) {
				long count = Math.round(safeNonNegativeDouble(entry.getValue()));
				if (count > 0L) {
					blocksMined += count;
					String id = stripNamespace(entry.getKey());
					if (!id.isEmpty()) {
						minedEntries.add(new PlayerStatsModel.TopBlock(
							id,
							formatBlockLabel(entry.getKey()),
							count
						));
					}
				}
			}
		}

		long blocksPlaced = 0L;
		if (used != null) {
			for (Map.Entry<String, JsonElement> entry : used.entrySet()) {
				if (isExcludedUsedItem(entry.getKey())) {
					continue;
				}
				blocksPlaced += Math.round(safeNonNegativeDouble(entry.getValue()));
			}
		}

		long deaths = Math.round(safeNonNegativeDouble(custom, "minecraft:deaths"));
		long mobKills = Math.round(safeNonNegativeDouble(custom, "minecraft:mob_kills"));

		double distanceCm = 0.0;
		if (custom != null) {
			for (Map.Entry<String, JsonElement> entry : custom.entrySet()) {
				if (entry.getKey().endsWith("_one_cm")) {
					distanceCm += safeNonNegativeDouble(entry.getValue());
				}
			}
		}
		double distanceKm = round1(distanceCm / 100_000.0);

		minedEntries.sort(
			Comparator.comparingLong(PlayerStatsModel.TopBlock::count)
				.reversed()
				.thenComparing(PlayerStatsModel.TopBlock::id)
		);
		List<PlayerStatsModel.TopBlock> topBlocks = minedEntries.size() <= 3
			? List.copyOf(minedEntries)
			: List.copyOf(minedEntries.subList(0, 3));

		String cleanUuid = normalizeUuid(uuid);
		String safeName = (name != null && !name.isBlank())
			? name.trim()
			: (!cleanUuid.isEmpty() ? cleanUuid : "Unknown");

		return new PlayerStatsModel.PlayerStatsEntry(
			safeName,
			cleanUuid.length() == 32 ? cleanUuid : null,
			playTimeHours,
			blocksMined,
			blocksPlaced,
			deaths,
			mobKills,
			distanceKm,
			blocksMined + blocksPlaced,
			topBlocks
		);
	}

	static boolean isExcludedUsedItem(String rawId) {
		String id = stripNamespace(rawId).toLowerCase(Locale.ROOT);
		if (id.isEmpty()) {
			return true;
		}
		if (EXCLUDED_USED_ITEMS.contains(id)) {
			return true;
		}
		for (String prefix : EXCLUDED_USED_PREFIXES) {
			if (id.startsWith(prefix)) {
				return true;
			}
		}
		for (String suffix : EXCLUDED_USED_SUFFIXES) {
			if (id.endsWith(suffix)) {
				return true;
			}
		}
		return false;
	}

	private static String stripNamespace(String rawId) {
		if (rawId == null) {
			return "";
		}
		return MINECRAFT_PREFIX_PATTERN.matcher(rawId).replaceFirst("");
	}

	private static JsonObject getObjectOrNull(JsonObject parent, String key) {
		if (parent == null || !parent.has(key)) {
			return null;
		}
		JsonElement el = parent.get(key);
		return el != null && el.isJsonObject() ? el.getAsJsonObject() : null;
	}

	private static double safeNonNegativeDouble(JsonObject obj, String key) {
		if (obj == null || !obj.has(key)) {
			return 0.0;
		}
		return safeNonNegativeDouble(obj.get(key));
	}

	private static double safeNonNegativeDouble(JsonElement el) {
		if (el == null || !el.isJsonPrimitive()) {
			return 0.0;
		}
		JsonPrimitive prim = el.getAsJsonPrimitive();
		try {
			double v = prim.getAsDouble();
			return Double.isFinite(v) && v > 0.0 ? v : 0.0;
		} catch (NumberFormatException e) {
			return 0.0;
		}
	}

	private static double round1(double val) {
		if (!Double.isFinite(val) || val <= 0.0) {
			return 0.0;
		}
		return Math.round(val * 10.0) / 10.0;
	}
}
