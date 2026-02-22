const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_LOCK_MS = 15 * 60 * 1000;
const AUTH_MAX_ATTEMPTS = 10;

const UPLOAD_WINDOW_MS = 60 * 1000;
const UPLOAD_MAX_REQUESTS = 30;
const uploadRequestTracker = new Map();

export function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) {
    return xff.split(',')[0].trim();
  }

  if (Array.isArray(xff) && xff.length > 0) {
    return String(xff[0]).trim();
  }

  return req.socket?.remoteAddress || 'unknown';
}

export function getPublicBaseUrl() {
  const base = process.env.APP_BASE_URL;
  if (!base) {
    return '';
  }

  try {
    const parsed = new URL(base);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }
    return parsed.origin;
  } catch {
    return '';
  }
}

export function allowUploadRequest(ip, now = Date.now()) {
  const key = ip || 'unknown';
  const previous = uploadRequestTracker.get(key) || [];
  const active = previous.filter((ts) => now - ts < UPLOAD_WINDOW_MS);
  if (active.length >= UPLOAD_MAX_REQUESTS) {
    uploadRequestTracker.set(key, active);
    return false;
  }

  active.push(now);
  uploadRequestTracker.set(key, active);
  return true;
}

function toIso(ts) {
  return new Date(ts).toISOString();
}

export async function isAuthLocked(db, token, ip, now = Date.now()) {
  const row = await db.get(
    `SELECT failed_count, first_failed_at, locked_until
     FROM auth_attempts
     WHERE token = ? AND ip_address = ?`,
    token,
    ip
  );

  if (!row) {
    return false;
  }

  const lockedUntil = row.locked_until ? new Date(row.locked_until).getTime() : 0;
  if (lockedUntil > now) {
    return true;
  }

  const firstFailedAt = row.first_failed_at ? new Date(row.first_failed_at).getTime() : 0;
  if (!firstFailedAt || now - firstFailedAt > AUTH_WINDOW_MS) {
    await db.run(
      'DELETE FROM auth_attempts WHERE token = ? AND ip_address = ?',
      token,
      ip
    );
  }

  return false;
}

export async function recordAuthFailure(db, token, ip, now = Date.now()) {
  const row = await db.get(
    `SELECT failed_count, first_failed_at
     FROM auth_attempts
     WHERE token = ? AND ip_address = ?`,
    token,
    ip
  );

  if (!row) {
    const first = toIso(now);
    const lockedUntil = AUTH_MAX_ATTEMPTS <= 1 ? toIso(now + AUTH_LOCK_MS) : null;
    await db.run(
      `INSERT INTO auth_attempts (
        token, ip_address, failed_count, first_failed_at, locked_until, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      token,
      ip,
      1,
      first,
      lockedUntil,
      first
    );
    return;
  }

  const firstFailedAt = row.first_failed_at ? new Date(row.first_failed_at).getTime() : now;
  const inWindow = now - firstFailedAt <= AUTH_WINDOW_MS;
  const nextCount = inWindow ? row.failed_count + 1 : 1;
  const nextFirst = inWindow ? firstFailedAt : now;
  const lock = nextCount >= AUTH_MAX_ATTEMPTS ? toIso(now + AUTH_LOCK_MS) : null;
  const updated = toIso(now);

  await db.run(
    `UPDATE auth_attempts
     SET failed_count = ?, first_failed_at = ?, locked_until = ?, updated_at = ?
     WHERE token = ? AND ip_address = ?`,
    nextCount,
    toIso(nextFirst),
    lock,
    updated,
    token,
    ip
  );
}

export async function clearAuthFailures(db, token, ip) {
  await db.run(
    'DELETE FROM auth_attempts WHERE token = ? AND ip_address = ?',
    token,
    ip
  );
}
