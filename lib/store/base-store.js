export class BaseStore {
  async initialize() {
    throw new Error('Not implemented');
  }

  async run(_sql, ..._args) {
    throw new Error('Not implemented');
  }

  async get(_sql, ..._args) {
    throw new Error('Not implemented');
  }

  async all(_sql, ..._args) {
    throw new Error('Not implemented');
  }

  async withTransaction(_fn) {
    throw new Error('Not implemented');
  }
}
