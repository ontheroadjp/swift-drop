import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import bcrypt from 'bcryptjs';
import { getDb } from '../../../../lib/db';
import { buildContentDisposition, safeDownloadName } from '../../../../lib/download';
import { normalizeFilename } from '../../../../lib/filename';
import { UPLOAD_DIR } from '../../../../lib/storage';

function toIds(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((v) => Number(v)).filter((v) => Number.isInteger(v) && v >= 0);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((v) => Number(v.trim()))
      .filter((v) => Number.isInteger(v) && v >= 0);
  }

  return [];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { token } = req.query;
  const { code, fileIds } = req.body || {};

  if (!code) {
    return res.status(400).send('認証コードを入力してください。');
  }

  const db = await getDb();
  const transfer = await db.get('SELECT * FROM transfers WHERE token = ?', token);

  if (!transfer) {
    return res.status(404).send('ファイルが見つかりません。');
  }

  if (new Date(transfer.expires_at).getTime() < Date.now()) {
    return res.status(410).send('このリンクの有効期限は切れています。');
  }

  const isValidCode = await bcrypt.compare(code, transfer.code_hash);
  if (!isValidCode) {
    return res.status(401).send('認証コードが正しくありません。');
  }

  const requestedIds = toIds(fileIds);
  let rows = [];

  if (requestedIds.length > 0) {
    const placeholders = requestedIds.map(() => '?').join(',');
    rows = await db.all(
      `SELECT id, original_name, stored_name FROM transfer_files
       WHERE transfer_token = ? AND id IN (${placeholders})`,
      token,
      ...requestedIds
    );
  } else {
    rows = await db.all(
      `SELECT id, original_name, stored_name FROM transfer_files
       WHERE transfer_token = ?
       ORDER BY id ASC`,
      token
    );
  }

  if (rows.length === 0) {
    rows = [
      {
        id: 0,
        original_name: transfer.original_name,
        stored_name: transfer.stored_name,
      },
    ];
  }

  const availableRows = rows.filter((row) => {
    const filePath = path.join(UPLOAD_DIR, row.stored_name);
    return fs.existsSync(filePath);
  });

  if (availableRows.length === 0) {
    return res.status(404).send('保存ファイルが見つかりません。');
  }

  await db.run('UPDATE transfers SET download_count = download_count + 1 WHERE token = ?', token);

  const filename = `swift-drop-${token}.zip`;
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', buildContentDisposition(filename));

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', () => {
    if (!res.headersSent) {
      res.status(500).send('ZIP作成中にエラーが発生しました。');
    } else {
      res.end();
    }
  });

  archive.pipe(res);

  for (const row of availableRows) {
    const filePath = path.join(UPLOAD_DIR, row.stored_name);
    archive.file(filePath, { name: safeDownloadName(normalizeFilename(row.original_name)) });
  }

  await archive.finalize();
}
