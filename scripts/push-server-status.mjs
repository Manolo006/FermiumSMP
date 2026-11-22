/**
 * Reference Node telemetry pusher for GameHosting / CI -> Firebase Firestore (`server_status/live`).
 * Uses only built-in Node 20+ fetch + public Fermium Web API key + dedicated reporter credentials:
 *   STATUS_BOT_EMAIL (default: status-bot@fermiumsmp.local)
 *   STATUS_BOT_PASSWORD (required)
 */

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'fermiumsmp';
const FIREBASE_API_KEY =
  process.env.FIREBASE_API_KEY || 'AIzaSyD7oC6mepLUMAjKUHrYeuW7iwcWL9bO8vU';
const STATUS_BOT_EMAIL = process.env.STATUS_BOT_EMAIL || 'status-bot@fermiumsmp.local';
const STATUS_BOT_PASSWORD = process.env.STATUS_BOT_PASSWORD;

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map((item) => toFirestoreValue(item)) } };
  }
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

async function signInReporter() {
  if (!STATUS_BOT_PASSWORD) {
    throw new Error('Imposta la variabile ambiente STATUS_BOT_PASSWORD prima di eseguire.');
  }
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: STATUS_BOT_EMAIL,
        password: STATUS_BOT_PASSWORD,
        returnSecureToken: true,
      }),
    }
  );
  const data = await res.json();
  if (!res.ok || !data?.idToken) {
    throw new Error(`Firebase sign-in failed: ${JSON.stringify(data?.error || data)}`);
  }
  return data.idToken;
}

export async function pushServerStatus(payload) {
  const idToken = await signInReporter();
  const docBody = {
    fields: {},
  };
  const enriched = {
    online: Boolean(payload.online),
    tps: Number(payload.tps ?? 20),
    mspt: Number(payload.mspt ?? 0),
    playersOnline: Math.round(Number(payload.playersOnline ?? 0)),
    maxPlayers: Math.round(Number(payload.maxPlayers ?? 20)),
    updatedAtMs: Number(payload.updatedAtMs ?? Date.now()),
    ...payload,
  };
  for (const [k, v] of Object.entries(enriched)) {
    if (v !== undefined) {
      docBody.fields[k] = toFirestoreValue(v);
    }
  }

  const endpoint = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/server_status/live`;
  const res = await fetch(endpoint, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(docBody),
  });
  const out = await res.json();
  if (!res.ok) {
    throw new Error(`Firestore PATCH failed: ${JSON.stringify(out?.error || out)}`);
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('push-server-status.mjs')) {
  const sample = {
    online: process.env.SERVER_ONLINE !== 'false',
    tps: Number(process.env.SERVER_TPS ?? 20.0),
    mspt: Number(process.env.SERVER_MSPT ?? 14.2),
    playersOnline: Number(process.env.SERVER_PLAYERS ?? 0),
    botsOnline: Number(process.env.SERVER_BOTS ?? 0),
    maxPlayers: Number(process.env.SERVER_MAX_PLAYERS ?? 20),
    version: process.env.SERVER_VERSION || 'Fabric 1.21.4',
    updatedAtMs: Date.now(),
  };
  pushServerStatus(sample)
    .then(() => console.log('Updated server_status/live cleanly.'))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
