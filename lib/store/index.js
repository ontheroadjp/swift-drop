import { SQLiteStore } from './sqlite-store';
import { TursoStore } from './turso-store';

let storePromise;

function createStoreFromEnv() {
  const provider = String(process.env.DB_PROVIDER || 'sqlite').toLowerCase();
  if (provider === 'turso') {
    return new TursoStore({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return new SQLiteStore();
}

export async function getStore() {
  if (!storePromise) {
    storePromise = (async () => {
      const store = createStoreFromEnv();
      await store.initialize();
      return store;
    })();
  }
  return storePromise;
}
