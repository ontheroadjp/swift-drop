import { BaseStore } from './base-store';

export class TursoStore extends BaseStore {
  constructor({ url, authToken }) {
    super();
    this.url = url;
    this.authToken = authToken;
    this.client = null;
    this.initPromise = null;
  }

  async initialize() {
    if (!this.url) {
      throw new Error('Turso DB URL is not configured. Set TURSO_DATABASE_URL.');
    }
    if (!this.authToken) {
      throw new Error('Turso auth token is not configured. Set TURSO_AUTH_TOKEN.');
    }

    if (!this.client) {
      const { createClient } = await import('@libsql/client');
      this.client = createClient({
        url: this.url,
        authToken: this.authToken,
      });
    }

    if (!this.initPromise) {
      this.initPromise = (async () => {
        await this.run(`
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
          )
        `);

        await this.run(`
          CREATE TABLE IF NOT EXISTS transfer_files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            transfer_token TEXT NOT NULL,
            original_name TEXT NOT NULL,
            stored_name TEXT NOT NULL,
            mime_type TEXT,
            file_size INTEGER NOT NULL,
            created_at TEXT NOT NULL
          )
        `);

        await this.run(`
          CREATE INDEX IF NOT EXISTS idx_transfer_files_token
          ON transfer_files(transfer_token)
        `);

        await this.run(`
          CREATE TABLE IF NOT EXISTS auth_attempts (
            token TEXT NOT NULL,
            ip_address TEXT NOT NULL,
            failed_count INTEGER NOT NULL,
            first_failed_at TEXT NOT NULL,
            locked_until TEXT,
            updated_at TEXT NOT NULL,
            PRIMARY KEY (token, ip_address)
          )
        `);

        await this.run(`
          CREATE INDEX IF NOT EXISTS idx_auth_attempts_locked_until
          ON auth_attempts(locked_until)
        `);
      })();
    }

    await this.initPromise;
  }

  async run(sql, ...args) {
    await this.initializeClientOnly();
    return this.client.execute({ sql, args });
  }

  async get(sql, ...args) {
    await this.initializeClientOnly();
    const result = await this.client.execute({ sql, args });
    return result.rows?.[0];
  }

  async all(sql, ...args) {
    await this.initializeClientOnly();
    const result = await this.client.execute({ sql, args });
    return result.rows || [];
  }

  async withTransaction(fn) {
    await this.initializeClientOnly();
    await this.run('BEGIN');
    try {
      const tx = {
        run: (sql, ...args) => this.run(sql, ...args),
        get: (sql, ...args) => this.get(sql, ...args),
        all: (sql, ...args) => this.all(sql, ...args),
      };
      const result = await fn(tx);
      await this.run('COMMIT');
      return result;
    } catch (error) {
      await this.run('ROLLBACK');
      throw error;
    }
  }

  async initializeClientOnly() {
    if (!this.url) {
      throw new Error('Turso DB URL is not configured. Set TURSO_DATABASE_URL.');
    }
    if (!this.authToken) {
      throw new Error('Turso auth token is not configured. Set TURSO_AUTH_TOKEN.');
    }
    if (!this.client) {
      const { createClient } = await import('@libsql/client');
      this.client = createClient({
        url: this.url,
        authToken: this.authToken,
      });
    }
  }
}
