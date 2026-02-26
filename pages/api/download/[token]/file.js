import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { getStore } from '../../../../lib/store';
import { buildContentDisposition, safeDownloadName } from '../../../../lib/download';
import { normalizeFilename } from '../../../../lib/filename';
import {
  clearAuthFailures,
  getClientIp,
  isAuthLocked,
  recordAuthFailure,
} from '../../../../lib/security';
import { UPLOAD_DIR } from '../../../../lib/storage';

async function resolveFileRow(db, token, fileId, transfer) {
  if (fileId === 0) {
    return {
      id: 0,
      original_name: transfer.original_name,
      stored_name: transfer.stored_name,
      mime_type: transfer.mime_type,
      file_size: transfer.file_size,
    };
  }

  return db.get(
    `SELECT id, original_name, stored_name, mime_type, file_size
     FROM transfer_files
     WHERE transfer_token = ? AND id = ?`,
    token,
    fileId
  );
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { token } = req.query;
  const { code, fileId } = req.body || {};

  if (!code) {
    return res.status(400).send('認証コードを入力してください。');
  }

  const parsedFileId = Number(fileId);
  if (!Number.isInteger(parsedFileId) || parsedFileId < 0) {
    return res.status(400).send('対象ファイルが不正です。');
  }

  const db = await getStore();
  const ip = getClientIp(req);

  if (await isAuthLocked(db, token, ip)) {
    return res.status(429).send('試行回数が上限に達しました。しばらく待ってから再試行してください。');
  }

  const transfer = await db.get('SELECT * FROM transfers WHERE token = ?', token);

  if (!transfer) {
    return res.status(404).send('ファイルが見つかりません。');
  }

  if (new Date(transfer.expires_at).getTime() < Date.now()) {
    return res.status(410).send('このリンクの有効期限は切れています。');
  }

  const isValidCode = await bcrypt.compare(code, transfer.code_hash);
  if (!isValidCode) {
    await recordAuthFailure(db, token, ip);
    return res.status(401).send('認証コードが正しくありません。');
  }
  await clearAuthFailures(db, token, ip);

  const row = await resolveFileRow(db, token, parsedFileId, transfer);
  if (!row) {
    return res.status(404).send('対象ファイルが見つかりません。');
  }

  const filePath = path.join(UPLOAD_DIR, row.stored_name);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('保存ファイルが見つかりません。');
  }

  await db.run('UPDATE transfers SET download_count = download_count + 1 WHERE token = ?', token);

  const downloadName = safeDownloadName(normalizeFilename(row.original_name));
  res.setHeader('Content-Type', row.mime_type || 'application/octet-stream');
  res.setHeader('Content-Length', row.file_size);
  res.setHeader('Content-Disposition', buildContentDisposition(downloadName));

  const stream = fs.createReadStream(filePath);
  stream.on('error', () => {
    if (!res.headersSent) {
      res.status(500).send('ダウンロード中にエラーが発生しました。');
    } else {
      res.end();
    }
  });
  stream.pipe(res);
}
