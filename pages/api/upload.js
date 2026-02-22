import fs from 'fs';
import path from 'path';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../lib/db';
import {
  CODE_LENGTH,
  DEFAULT_EXPIRE_DAYS,
  MAX_EXPIRE_DAYS,
  MAX_FILE_SIZE_BYTES,
  MIN_EXPIRE_DAYS,
} from '../../lib/constants';
import { normalizeFilename } from '../../lib/filename';
import { allowUploadRequest, getClientIp, getPublicBaseUrl } from '../../lib/security';
import { ensureDirectories, UPLOAD_DIR } from '../../lib/storage';

ensureDirectories();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(normalizeFilename(file.originalname));
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 20,
  },
});

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
}

function createCode() {
  const max = 10 ** CODE_LENGTH;
  const min = 10 ** (CODE_LENGTH - 1);
  return String(Math.floor(Math.random() * (max - min) + min));
}

function parseExpireDays(value) {
  if (value === undefined || value === null || value === '') {
    return DEFAULT_EXPIRE_DAYS;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < MIN_EXPIRE_DAYS || parsed > MAX_EXPIRE_DAYS) {
    return null;
  }

  return parsed;
}

function removeUploadedFiles(files) {
  for (const file of files || []) {
    if (!file?.path) {
      continue;
    }
    try {
      fs.unlinkSync(file.path);
    } catch {
      // Ignore cleanup errors.
    }
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const ip = getClientIp(req);
  if (!allowUploadRequest(ip)) {
    return res.status(429).json({ error: 'リクエストが多すぎます。しばらく待ってから再試行してください。' });
  }

  try {
    await runMiddleware(req, res, upload.array('files', 20));
  } catch (error) {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'ファイルサイズは 100MB までです。' });
    }
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: '1回のアップロードは20ファイルまでです。' });
    }
    return res.status(400).json({ error: 'アップロードに失敗しました。' });
  }

  const files = req.files || [];
  if (files.length === 0) {
    return res.status(400).json({ error: 'ファイルが見つかりません。' });
  }
  const normalizedFiles = files.map((file) => ({
    ...file,
    originalname: normalizeFilename(file.originalname),
  }));

  const expireDays = parseExpireDays(req.body?.expiresInDays);
  if (expireDays === null) {
    removeUploadedFiles(files);
    return res.status(400).json({
      error: `有効期限は ${MIN_EXPIRE_DAYS}〜${MAX_EXPIRE_DAYS} 日で指定してください。`,
    });
  }

  const token = uuidv4();
  const authCode = createCode();
  const codeHash = await bcrypt.hash(authCode, 10);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + expireDays * 24 * 60 * 60 * 1000);
  const firstFile = normalizedFiles[0];

  const db = await getDb();
  try {
    await db.run('BEGIN');

    await db.run(
      `
        INSERT INTO transfers (
          token,
          original_name,
          stored_name,
          mime_type,
          file_size,
          code_hash,
          created_at,
          expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      token,
      firstFile.originalname,
      firstFile.filename,
      firstFile.mimetype || 'application/octet-stream',
      firstFile.size,
      codeHash,
      now.toISOString(),
      expiresAt.toISOString()
    );

    for (const file of normalizedFiles) {
      await db.run(
        `
          INSERT INTO transfer_files (
            transfer_token,
            original_name,
            stored_name,
            mime_type,
            file_size,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?)
        `,
        token,
        file.originalname,
        file.filename,
        file.mimetype || 'application/octet-stream',
        file.size,
        now.toISOString()
      );
    }

    await db.run('COMMIT');
  } catch {
    await db.run('ROLLBACK');
    removeUploadedFiles(files);
    return res.status(500).json({ error: 'メタデータ保存に失敗しました。' });
  }

  const baseUrl = getPublicBaseUrl();
  const downloadUrl = baseUrl ? `${baseUrl}/d/${token}` : `/d/${token}`;
  const totalSize = normalizedFiles.reduce((sum, file) => sum + file.size, 0);

  return res.status(200).json({
    downloadUrl,
    authCode,
    expiresAt: expiresAt.toISOString(),
    expiresInDays: expireDays,
    fileCount: normalizedFiles.length,
    totalSize,
  });
}
