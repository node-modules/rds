import EventEmitter from 'events';
import * as mysql2 from 'mysql2';
import { Pool } from 'mysql2';

declare module "mysql2" {
  module.exports = mysql2;

  export class Pool extends EventEmitter {}
  export class ConnectionConfig {
    constructor(options: mysql2.ConnectionOptions);
  }
}