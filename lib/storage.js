import fs from 'fs';
import path from 'path';

export const ROOT_DIR = process.cwd();
const RUNTIME_ROOT = process.env.VERCEL ? '/tmp' : ROOT_DIR;
export const UPLOAD_DIR = path.join(RUNTIME_ROOT, 'uploads');
export const DATA_DIR = path.join(RUNTIME_ROOT, 'data');

export function ensureDirectories() {
  for (const dir of [UPLOAD_DIR, DATA_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
