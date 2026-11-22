package it.fermiumsmp.status;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import org.slf4j.Logger;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

/**
 * Lightweight Firebase Auth + Firestore REST v1 client built strictly on {@link HttpClient}.
 */
public final class FirebaseTelemetryClient {
	private static final long TOKEN_REFRESH_MARGIN_MS = 300_000L;
	private static final long ERROR_LOG_COOLDOWN_MS = 300_000L;

	private final StatusConfig config;
	private final String password;
	private final Logger logger;
	private final HttpClient http;

	private String idToken;
	private String refreshToken;
	private long expiresAtEpochMs;
	private long lastErrorLogEpochMs;

	public FirebaseTelemetryClient(StatusConfig config, String password, Logger logger) {
		this.config = config;
		this.password = password;
		this.logger = logger;
		this.http = HttpClient.newBuilder()
			.connectTimeout(Duration.ofSeconds(5))
			.build();
	}

	public boolean push(StatusSnapshot.Snapshot snapshot, Duration timeout) {
		try {
			String body = FirestorePayloadBuilder.toFirestoreDocumentJson(snapshot);
			String token = ensureIdToken(timeout);
			HttpResponse<String> response = patchDocument(token, body, timeout);

			if (response.statusCode() == 401) {
				invalidateToken();
				token = ensureIdToken(timeout);
				response = patchDocument(token, body, timeout);
			}

			if (response.statusCode() >= 200 && response.statusCode() < 300) {
				return true;
			}

			logErrorRateLimited(
				"Firestore PATCH HTTP {} (verifica firestore.rules / permessi): {}",
				response.statusCode(),
				summarizeHttpBody(response.body())
			);
			return false;
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			return false;
		} catch (Exception e) {
			logErrorRateLimited("Errore invio telemetria Firebase: {}", e.getMessage());
			return false;
		}
	}

	private HttpResponse<String> patchDocument(String token, String jsonBody, Duration timeout) throws Exception {
		String endpoint = "https://firestore.googleapis.com/v1/projects/"
			+ config.firebaseProjectId
			+ "/databases/(default)/documents/server_status/live";

		HttpRequest req = HttpRequest.newBuilder(URI.create(endpoint))
			.timeout(timeout)
			.header("Content-Type", "application/json; charset=UTF-8")
			.header("Authorization", "Bearer " + token)
			.method("PATCH", HttpRequest.BodyPublishers.ofString(jsonBody, StandardCharsets.UTF_8))
			.build();

		return http.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
	}

	private synchronized void invalidateToken() {
		idToken = null;
		expiresAtEpochMs = 0L;
	}

	private synchronized String ensureIdToken(Duration timeout) throws Exception {
		long now = System.currentTimeMillis();
		if (idToken != null && now < expiresAtEpochMs - TOKEN_REFRESH_MARGIN_MS) {
			return idToken;
		}
		if (refreshToken != null) {
			try {
				return refreshViaTokenEndpoint(timeout);
			} catch (Exception ignored) {
				refreshToken = null;
			}
		}
		return signInWithPassword(timeout);
	}

	private String refreshViaTokenEndpoint(Duration timeout) throws Exception {
		JsonObject payload = new JsonObject();
		payload.addProperty("grant_type", "refresh_token");
		payload.addProperty("refresh_token", refreshToken);

		HttpRequest req = HttpRequest.newBuilder(
				URI.create("https://securetoken.googleapis.com/v1/token?key=" + config.firebaseApiKey)
			)
			.timeout(timeout)
			.header("Content-Type", "application/json; charset=UTF-8")
			.POST(HttpRequest.BodyPublishers.ofString(payload.toString(), StandardCharsets.UTF_8))
			.build();

		HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
		if (res.statusCode() < 200 || res.statusCode() >= 300) {
			throw new IllegalStateException("HTTP " + res.statusCode());
		}

		JsonObject json = JsonParser.parseString(res.body()).getAsJsonObject();
		String newIdToken = json.has("id_token") ? json.get("id_token").getAsString() : null;
		if (newIdToken == null || newIdToken.isBlank()) {
			throw new IllegalStateException("Missing id_token");
		}
		idToken = newIdToken;
		if (json.has("refresh_token")) {
			refreshToken = json.get("refresh_token").getAsString();
		}
		long ttlSeconds = json.has("expires_in") ? json.get("expires_in").getAsLong() : 3600L;
		expiresAtEpochMs = System.currentTimeMillis() + ttlSeconds * 1000L;
		return idToken;
	}

	private String signInWithPassword(Duration timeout) throws Exception {
		JsonObject payload = new JsonObject();
		payload.addProperty("email", config.reporterEmail);
		payload.addProperty("password", password);
		payload.addProperty("returnSecureToken", true);

		HttpRequest req = HttpRequest.newBuilder(
				URI.create("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" + config.firebaseApiKey)
			)
			.timeout(timeout)
			.header("Content-Type", "application/json; charset=UTF-8")
			.POST(HttpRequest.BodyPublishers.ofString(payload.toString(), StandardCharsets.UTF_8))
			.build();

		HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
		if (res.statusCode() < 200 || res.statusCode() >= 300) {
			throw new IllegalStateException("Firebase Auth HTTP " + res.statusCode() + ": " + summarizeHttpBody(res.body()));
		}

		JsonObject json = JsonParser.parseString(res.body()).getAsJsonObject();
		String newIdToken = json.has("idToken") ? json.get("idToken").getAsString() : null;
		if (newIdToken == null || newIdToken.isBlank()) {
			throw new IllegalStateException("Missing idToken in Firebase response");
		}
		idToken = newIdToken;
		refreshToken = json.has("refreshToken") ? json.get("refreshToken").getAsString() : null;
		long ttlSeconds = json.has("expiresIn") ? Long.parseLong(json.get("expiresIn").getAsString()) : 3600L;
		expiresAtEpochMs = System.currentTimeMillis() + ttlSeconds * 1000L;
		return idToken;
	}

	private synchronized void logErrorRateLimited(String message, Object... args) {
		long now = System.currentTimeMillis();
		if (lastErrorLogEpochMs == 0L || (now - lastErrorLogEpochMs) >= ERROR_LOG_COOLDOWN_MS) {
			lastErrorLogEpochMs = now;
			logger.warn("[FermiumStatus] " + message, args);
		}
	}

	private static String summarizeHttpBody(String body) {
		if (body == null) {
			return "";
		}
		String singleLine = body.replaceAll("\\s+", " ").trim();
		return singleLine.length() <= 220 ? singleLine : singleLine.substring(0, 220) + "...";
	}
}
