import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { DATA_DIR, ensureDirectories } from './storage';

let dbPromise;

export async function getDb() {
  if (!dbPromise) {
    ensureDirectories();
    dbPromise = open({
      filename: path.join(DATA_DIR, 'swift_drop.db'),
      driver: sqlite3.Database,
    });

    const db = await dbPromise;
    await db.exec(`
      CREATE TABLE IF NOT EXISTS transfers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token TEXT NOT NULL UNIQUE,
        original_name TEXT NOT NULL,
        stored_name TEXT NOT NULL,
        mime_type TEXT,
        file_size INTEGER NOT NULL,
        code_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        download_count INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS transfer_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transfer_token TEXT NOT NULL,
        original_name TEXT NOT NULL,
        stored_name TEXT NOT NULL,
        mime_type TEXT,
        file_size INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_transfer_files_token
      ON transfer_files(transfer_token);
    `);
  }

  return dbPromise;
}
