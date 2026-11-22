package it.fermiumsmp.status;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonSyntaxException;
import org.slf4j.Logger;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * JSON configuration stored at {@code config/fermium-status.json}.
 */
public final class StatusConfig {
	public static final String DEFAULT_PASSWORD_PLACEHOLDER = "CAMBIA_CON_PASSWORD_FIREBASE";
	private static final Gson PRETTY_GSON = new GsonBuilder()
		.setPrettyPrinting()
		.disableHtmlEscaping()
		.create();

	public boolean enabled = true;
	public String firebaseProjectId = "fermiumsmp";
	public String firebaseApiKey = "AIzaSyD7oC6mepLUMAjKUHrYeuW7iwcWL9bO8vU";
	public String reporterEmail = "status-bot@fermiumsmp.local";
	public String reporterPassword = DEFAULT_PASSWORD_PLACEHOLDER;
	public int intervalSeconds = 20;
	public boolean syncPlayerStats = true;
	public int statsIntervalSeconds = 300;
	public String serverVersion = "Fabric 26.2";
	public String motdOverride = "";

	public static StatusConfig loadOrCreate(Path path, Logger logger) {
		StatusConfig config = new StatusConfig();
		try {
			if (!Files.exists(path)) {
				Path parent = path.getParent();
				if (parent != null) {
					Files.createDirectories(parent);
				}
				Files.writeString(path, PRETTY_GSON.toJson(config) + System.lineSeparator(), StandardCharsets.UTF_8);
				if (logger != null) {
					logger.info("[FermiumStatus] Creato file di configurazione {}", path.toAbsolutePath());
				}
				return config;
			}

			String raw = Files.readString(path, StandardCharsets.UTF_8);
			StatusConfig parsed = PRETTY_GSON.fromJson(raw, StatusConfig.class);
			if (parsed != null) {
				config = parsed;
			}
		} catch (JsonSyntaxException e) {
			if (logger != null) {
				logger.warn("[FermiumStatus] JSON non valido in {} ({}). Uso i default.", path, e.getMessage());
			}
		} catch (IOException e) {
			if (logger != null) {
				logger.warn("[FermiumStatus] Impossibile leggere/creare {} ({}). Uso i default.", path, e.getMessage());
			}
		}

		config.sanitize();
		return config;
	}

	public void sanitize() {
		if (firebaseProjectId == null || firebaseProjectId.isBlank()) {
			firebaseProjectId = "fermiumsmp";
		}
		if (firebaseApiKey == null || firebaseApiKey.isBlank()) {
			firebaseApiKey = "AIzaSyD7oC6mepLUMAjKUHrYeuW7iwcWL9bO8vU";
		}
		if (reporterEmail == null || reporterEmail.isBlank()) {
			reporterEmail = "status-bot@fermiumsmp.local";
		}
		if (reporterPassword == null) {
			reporterPassword = DEFAULT_PASSWORD_PLACEHOLDER;
		}
		if (serverVersion == null || serverVersion.isBlank()) {
			serverVersion = "Fabric 26.2";
		}
		if (motdOverride == null) {
			motdOverride = "";
		}
		if (intervalSeconds < 10) {
			intervalSeconds = 10;
		} else if (intervalSeconds > 60) {
			intervalSeconds = 60;
		}
		if (statsIntervalSeconds < 60) {
			statsIntervalSeconds = 60;
		} else if (statsIntervalSeconds > 3600) {
			statsIntervalSeconds = 3600;
		}
	}

	/**
	 * Resolves reporter password giving precedence to environment variables so secrets
	 * do not need to be stored on disk when running under Pterodactyl/Docker.
	 */
	public String resolvePassword() {
		String envPrimary = System.getenv("FERMIUM_STATUS_PASSWORD");
		if (isUsableSecret(envPrimary)) {
			return envPrimary;
		}
		String envSecondary = System.getenv("STATUS_BOT_PASSWORD");
		if (isUsableSecret(envSecondary)) {
			return envSecondary;
		}
		if (isUsableSecret(reporterPassword)) {
			return reporterPassword;
		}
		return null;
	}

	private static boolean isUsableSecret(String value) {
		return value != null
			&& !value.isBlank()
			&& !DEFAULT_PASSWORD_PLACEHOLDER.equals(value.trim());
	}
}
