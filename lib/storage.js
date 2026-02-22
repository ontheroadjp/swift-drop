import fs from 'fs';
import path from 'path';

export const ROOT_DIR = process.cwd();
export const UPLOAD_DIR = path.join(ROOT_DIR, 'uploads');
export const DATA_DIR = path.join(ROOT_DIR, 'data');

export function ensureDirectories() {
  for (const dir of [UPLOAD_DIR, DATA_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
