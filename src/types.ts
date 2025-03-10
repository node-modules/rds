import { AsyncLocalStorage } from 'node:async_hooks';
import type { PoolConnection, PoolOptions, ConnectionConfig } from 'mysql2';
import { RDSTransaction } from './transaction';

export type GetConnectionConfig = () => Partial<ConnectionConfig>;

export interface RDSClientOptions extends PoolOptions {
  connectionStorageKey?: string;
  connectionStorage?: AsyncLocalStorage<Record<PropertyKey, RDSTransaction>>;
  getConnectionConfig?: GetConnectionConfig;
  poolWaitTimeout?: number;
  logging?: Logging;
}

export interface PoolConnectionPromisify extends Omit<PoolConnection, 'query'> {
  query(sql: string): Promise<any>;
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export type SelectOption = {
  where?: object;
  columns?: string | string[];
  orders?: string | any[];
  limit?: number;
  offset?: number;
};

export type InsertOption = {
  columns?: string[];
};

export type InsertResult = {
  fieldCount: number;
  affectedRows: number;
  insertId: number;
  serverStatus: number;
  warningCount: number;
  message: string;
  protocol41: boolean;
  changedRows: number;
};

export type UpdateOption = {
  where?: object;
  columns?: string[];
};

export type UpdateResult = InsertResult;
export type DeleteResult = InsertResult;
export type LockResult = InsertResult;

export type UpdateRow = {
  row?: object;
  where?: object;
  [key: string]: any;
};

export type LockTableOption = {
  tableName: string;
  lockType: string;
  tableAlias: string;
};

export type BeforeQueryHandler = (sql: string) => string | undefined | void;
export type AfterQueryHandler = (sql: string, result: any, execDuration: number, err?: Error) => void;

export type TransactionContext = Record<PropertyKey, RDSTransaction | null>;
export type TransactionScope = (transaction: RDSTransaction) => Promise<any>;

export type Logging = (message: string, ...args: any[]) => any;
