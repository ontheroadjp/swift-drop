import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { BaseStore } from './base-store';
import { DATA_DIR, ensureDirectories } from '../storage';

export class SQLiteStore extends BaseStore {
  constructor() {
    super();
    this.dbPromise = null;
    this.initPromise = null;
  }

  async initialize() {
    if (!this.dbPromise) {
      ensureDirectories();
      this.dbPromise = open({
        filename: path.join(DATA_DIR, 'swift_drop.db'),
        driver: sqlite3.Database,
      });
    }
    if (!this.initPromise) {
      this.initPromise = (async () => {
        const db = await this.dbPromise;
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

          CREATE TABLE IF NOT EXISTS auth_attempts (
            token TEXT NOT NULL,
            ip_address TEXT NOT NULL,
            failed_count INTEGER NOT NULL,
            first_failed_at TEXT NOT NULL,
            locked_until TEXT,
            updated_at TEXT NOT NULL,
            PRIMARY KEY (token, ip_address)
          );

          CREATE INDEX IF NOT EXISTS idx_auth_attempts_locked_until
          ON auth_attempts(locked_until);
        `);
      })();
    }
    await this.initPromise;
  }

  async run(sql, ...args) {
    await this.initialize();
    const db = await this.dbPromise;
    return db.run(sql, ...args);
  }

  async get(sql, ...args) {
    await this.initialize();
    const db = await this.dbPromise;
    return db.get(sql, ...args);
  }

  async all(sql, ...args) {
    await this.initialize();
    const db = await this.dbPromise;
    return db.all(sql, ...args);
  }

  async withTransaction(fn) {
    await this.initialize();
    const db = await this.dbPromise;
    await db.run('BEGIN');
    try {
      const tx = {
        run: (sql, ...args) => db.run(sql, ...args),
        get: (sql, ...args) => db.get(sql, ...args),
        all: (sql, ...args) => db.all(sql, ...args),
      };
      const result = await fn(tx);
      await db.run('COMMIT');
      return result;
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  }
}
