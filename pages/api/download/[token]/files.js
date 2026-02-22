import bcrypt from 'bcryptjs';
import { getDb } from '../../../../lib/db';
import { normalizeFilename } from '../../../../lib/filename';
import {
  clearAuthFailures,
  getClientIp,
  isAuthLocked,
  recordAuthFailure,
} from '../../../../lib/security';

async function resolveFiles(db, token, transfer) {
  const files = await db.all(
    `SELECT id, original_name, mime_type, file_size
     FROM transfer_files
     WHERE transfer_token = ?
     ORDER BY id ASC`,
    token
  );

  if (files.length > 0) {
    return files.map((file) => ({
      ...file,
      original_name: normalizeFilename(file.original_name),
    }));
  }

  return [
    {
      id: 0,
      original_name: normalizeFilename(transfer.original_name),
      mime_type: transfer.mime_type,
      file_size: transfer.file_size,
    },
  ];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { token } = req.query;
  const { code } = req.body || {};

  if (!code) {
    return res.status(400).json({ error: '認証コードを入力してください。' });
  }

  const db = await getDb();
  const ip = getClientIp(req);

  if (await isAuthLocked(db, token, ip)) {
    return res.status(429).json({ error: '試行回数が上限に達しました。しばらく待ってから再試行してください。' });
  }

  const transfer = await db.get('SELECT * FROM transfers WHERE token = ?', token);

  if (!transfer) {
    return res.status(404).json({ error: 'ファイルが見つかりません。' });
  }

  if (new Date(transfer.expires_at).getTime() < Date.now()) {
    return res.status(410).json({ error: 'このリンクの有効期限は切れています。' });
  }

  const isValidCode = await bcrypt.compare(code, transfer.code_hash);
  if (!isValidCode) {
    await recordAuthFailure(db, token, ip);
    return res.status(401).json({ error: '認証コードが正しくありません。' });
  }
  await clearAuthFailures(db, token, ip);

  const files = await resolveFiles(db, token, transfer);

  return res.status(200).json({
    token,
    expiresAt: transfer.expires_at,
    files,
  });
}
