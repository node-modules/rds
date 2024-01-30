import { ConnectionConfig } from 'mysql2';
import type { PoolOptions } from 'mysql2';
import type { GetConnectionConfig } from './types';

export class RDSPoolConfig {
  #getConnectionConfig: GetConnectionConfig;
  #options: PoolOptions;

  waitForConnections: boolean;
  connectionLimit: number;
  maxIdle: number;
  idleTimeout: number;
  queueLimit: number;

  constructor(options: PoolOptions, getConnectionConfig: GetConnectionConfig) {
    this.#options = options;
    this.#getConnectionConfig = getConnectionConfig;

    // mysql2 has not exports ConnectionConfig
    // so impl it mauanlly
    this.waitForConnections = options.waitForConnections === undefined ? true : Boolean(options.waitForConnections);
    this.connectionLimit = isNaN(options.connectionLimit!) ? 10 : Number(options.connectionLimit);
    this.maxIdle = isNaN(options.maxIdle!) ? this.connectionLimit : Number(options.maxIdle);
    this.idleTimeout = isNaN(options.idleTimeout!) ? 60000 : Number(options.idleTimeout);
    this.queueLimit = isNaN(options.queueLimit!) ? 0 : Number(options.queueLimit);
  }

  get connectionConfig(): any {
    return new ConnectionConfig({
      ...this.#options,
      ...this.#getConnectionConfig(),
    });
  }
}
