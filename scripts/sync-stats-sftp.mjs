import fs from 'node:fs';
import path from 'node:path';
import {
  isOfflineBotUuid,
  normalizeUuid,
  parsePlayerStatsJson,
  parseSftpConnectionTarget,
} from './parseMinecraftStats.mjs';

const ROOT_DIR = process.cwd();

function readLocalJsonIfExists(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

async function readRemoteBuffer(sftp, remotePath) {
  try {
    const exists = await sftp.exists(remotePath);
    if (!exists) return null;
    const data = await sftp.get(remotePath);
    return Buffer.isBuffer(data) ? data : Buffer.from(data);
  } catch {
    return null;
  }
}

async function readRemoteJson(sftp, remotePath) {
  const buf = await readRemoteBuffer(sftp, remotePath);
  if (!buf) return null;
  try {
    return JSON.parse(buf.toString('utf8'));
  } catch {
    return null;
  }
}

async function detectWorldDir(sftp) {
  const override = process.env.SFTP_WORLD_DIR?.trim().replace(/^\/+|\/+$/g, '');
  if (override) return override;

  const propsBuf =
    (await readRemoteBuffer(sftp, '/server.properties')) ??
    (await readRemoteBuffer(sftp, 'server.properties'));

  if (propsBuf) {
    const text = propsBuf.toString('utf8');
    const match = text.match(/^\s*level-name\s*=\s*(.+)$/m);
    if (match?.[1]) {
      const candidate = match[1].trim().replace(/^\/+|\/+$/g, '');
      if (candidate) return candidate;
    }
  }

  return 'world';
}

async function resolveNameFromPlayerDb(uuid) {
  try {
    const res = await fetch(`https://playerdb.co/api/player/minecraft/${uuid}`, {
      headers: { 'User-Agent': 'FermiumSMP-StatsSync/1.0' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const username = json?.data?.player?.username;
    return typeof username === 'string' && username.trim() ? username.trim() : null;
  } catch {
    return null;
  }
}

async function main() {
  const rawHost = process.env.SFTP_HOST;
  const rawPort = process.env.SFTP_PORT || '2022';
  const username = process.env.SFTP_USER?.trim();
  const password = process.env.SFTP_PASS;

  if (!rawHost || !username || !password) {
    throw new Error('Variabili SFTP_HOST, SFTP_USER o SFTP_PASS mancanti.');
  }

  const { host, port } = parseSftpConnectionTarget(rawHost, rawPort);
  const { default: SftpClient } = await import('ssh2-sftp-client');
  const sftp = new SftpClient();

  const uuidToName = new Map();
  const trackedUuids = new Set();

  const localMembers = readLocalJsonIfExists(path.join(ROOT_DIR, 'members.json'));
  if (Array.isArray(localMembers)) {
    for (const m of localMembers) {
      const uuid = normalizeUuid(m?.uuid);
      if (uuid.length === 32 && typeof m?.name === 'string' && m.name.trim()) {
        uuidToName.set(uuid, m.name.trim());
        trackedUuids.add(uuid);
      }
    }
  }

  const parsedRemotePlayers = [];

  try {
    console.log(`Connecting via SFTP to ${host}:${port}...`);
    await sftp.connect({
      host,
      port,
      username,
      password,
      readyTimeout: 20000,
    });

    const worldDir = await detectWorldDir(sftp);
    console.log(`Using Minecraft world directory: "${worldDir}"`);

    const remoteWhitelist =
      (await readRemoteJson(sftp, '/whitelist.json')) ??
      (await readRemoteJson(sftp, 'whitelist.json'));
    if (Array.isArray(remoteWhitelist)) {
      for (const entry of remoteWhitelist) {
        const uuid = normalizeUuid(entry?.uuid);
        if (uuid.length === 32 && typeof entry?.name === 'string' && entry.name.trim()) {
          if (!uuidToName.has(uuid)) uuidToName.set(uuid, entry.name.trim());
          trackedUuids.add(uuid);
        }
      }
    }

    const remoteUsercache =
      (await readRemoteJson(sftp, '/usercache.json')) ??
      (await readRemoteJson(sftp, 'usercache.json'));
    if (Array.isArray(remoteUsercache)) {
      for (const entry of remoteUsercache) {
        const uuid = normalizeUuid(entry?.uuid);
        if (uuid.length === 32 && typeof entry?.name === 'string' && entry.name.trim()) {
          if (!uuidToName.has(uuid)) uuidToName.set(uuid, entry.name.trim());
        }
      }
    }

    const statsDirCandidates = [`/${worldDir}/stats`, `${worldDir}/stats`];
    let statsDir = null;
    let fileList = [];
    for (const dir of statsDirCandidates) {
      try {
        if (await sftp.exists(dir)) {
          statsDir = dir;
          fileList = await sftp.list(dir);
          break;
        }
      } catch {
        // try next candidate
      }
    }

    if (!statsDir) {
      throw new Error(`Cartella stats non trovata in ${worldDir}/stats`);
    }

    const jsonFiles = fileList.filter(
      (f) => f && f.type !== 'd' && typeof f.name === 'string' && f.name.endsWith('.json')
    );
    console.log(`Found ${jsonFiles.length} stats files in ${statsDir}`);

    for (const file of jsonFiles) {
      const uuid = normalizeUuid(path.basename(file.name, '.json'));
      if (uuid.length !== 32) continue;

      if (isOfflineBotUuid(uuid) && !trackedUuids.has(uuid)) {
        continue;
      }

      const rawStats = await readRemoteJson(sftp, `${statsDir}/${file.name}`);
      if (!rawStats || typeof rawStats !== 'object') continue;

      let playerName = uuidToName.get(uuid);
      if (!playerName) {
        playerName = await resolveNameFromPlayerDb(uuid);
        if (playerName) uuidToName.set(uuid, playerName);
      }
      if (!playerName) continue;

      parsedRemotePlayers.push(
        parsePlayerStatsJson({
          name: playerName,
          uuid,
          rawStats,
        })
      );
    }
  } finally {
    await sftp.end().catch(() => {});
  }

  if (parsedRemotePlayers.length === 0) {
    console.warn('No player stats parsed from SFTP; leaving existing stats.json untouched.');
    return;
  }

  const seenUuids = new Set(parsedRemotePlayers.map((p) => p.uuid).filter(Boolean));
  const seenNames = new Set(parsedRemotePlayers.map((p) => p.name.toLowerCase()));

  // Preserve previous entries only for tracked members missing from this snapshot
  const previousStats = readLocalJsonIfExists(path.join(ROOT_DIR, 'stats.json'));
  const combined = [...parsedRemotePlayers];
  if (Array.isArray(previousStats)) {
    for (const prev of previousStats) {
      if (!prev || typeof prev.name !== 'string') continue;
      const prevUuid = normalizeUuid(prev.uuid);
      const isTrackedMember =
        (prevUuid && trackedUuids.has(prevUuid)) ||
        (Array.isArray(localMembers) &&
          localMembers.some(
            (m) => typeof m?.name === 'string' && m.name.toLowerCase() === prev.name.toLowerCase()
          ));
      if (!isTrackedMember) continue;
      if ((prevUuid && seenUuids.has(prevUuid)) || seenNames.has(prev.name.toLowerCase())) {
        continue;
      }
      combined.push(prev);
    }
  }

  combined.sort((a, b) => (b.carpetScore || 0) - (a.carpetScore || 0));

  const serialized = `${JSON.stringify(combined, null, 2)}\n`;
  const targets = [
    path.join(ROOT_DIR, 'stats.json'),
    path.join(ROOT_DIR, 'public', 'stats.json'),
  ];
  if (fs.existsSync(path.join(ROOT_DIR, 'docs'))) {
    targets.push(path.join(ROOT_DIR, 'docs', 'stats.json'));
  }

  for (const target of targets) {
    fs.writeFileSync(target, serialized, 'utf8');
  }

  console.log(`Synced ${combined.length} player stats to ${targets.length} targets.`);
}

main().catch((err) => {
  console.error('SFTP stats sync failed:', err);
  process.exit(1);
});
