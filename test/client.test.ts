import { AsyncLocalStorage } from 'node:async_hooks';
import { strict as assert } from 'node:assert';
import fs from 'node:fs/promises';
import { setTimeout } from 'node:timers/promises';
import path from 'node:path';
import mm from 'mm';
import { RDSTransaction } from '../src/transaction';
import config from './config';
import { RDSClient } from '../src/client';

interface MockMateSpyObject<T extends (...args: any[]) => any> {
  called?: number;
  calledArguments?: Array<Parameters<T>>;
  lastCalledArguments?: Parameters<T>;
}

const mmSpy = <T extends (...args: any[]) => any>(target: T) => target as MockMateSpyObject<T>;

describe('test/client.test.ts', () => {
  const prefix = 'prefix-' + process.version + '-';
  const table = 'myrds-test-user';
  let db: RDSClient;
  before(async () => {
    db = new RDSClient(config);
    try {
      const sql = await fs.readFile(path.join(__dirname, 'rds_init.sql'), 'utf-8');
      await db.query(sql);
    } catch (err) {
      console.log('init table error: %s', err);
    }
    await db.query('delete from ?? where name like ?', [ table, prefix + '%' ]);
  });

  after(async () => {
    return await db.end();
  });

  afterEach(() => {
    mm.restore();
  });

  describe('new RDSClient(options)', () => {
    it('should access pool', async () => {
      assert(db.pool.config.connectionConfig.database);
    });

    it('should connect rds success', async () => {
      const rows = await db.query('show tables');
      // console.log(rows);
      assert(rows);
      assert(Array.isArray(rows));
    });

    it('should connection query return rows', async () => {
      const conn = await db.getConnection();
      const rows = await conn.query('show tables');
      // console.log(rows);
      conn.release();
      assert(rows);
      assert(Array.isArray(rows));
    });

    it('should connection query one row', async () => {
      const conn = await db.getConnection();
      const row = await conn.queryOne('show tables');
      conn.release();
      assert(row);
    });
  });

  describe('escape()', () => {
    it('should client return escape string', () => {
      assert.equal(db.escape('\'\"?<//\\'), '\'\\\'\\"?<//\\\\\'');
    });

    it('should connection return escape string', async () => {
      const conn = await db.getConnection();
      assert.equal(conn.escape('\'\"?<//\\'), '\'\\\'\\"?<//\\\\\'');
      conn.release();
    });
  });

  describe('query(), queryOne()', () => {
    before(async () => {
      await db.query(`insert into ??(name, email, gmt_create, gmt_modified) 
        values(?, ?, now(), now())`, [ table, prefix + 'fengmk2', prefix + 'm@fengmk2.com' ]);
      await db.query(`insert into ??(name, email, gmt_create, gmt_modified)
        values(?, ?, now(), now())`, [ table, prefix + 'fengmk3', prefix + 'm@fengmk2.com' ]);
    });

    it('should select 2 rows', async () => {
      const rows = await db.query('select * from ?? where email=? order by id',
        [ table, prefix + 'm@fengmk2.com' ]);
      assert.equal(rows.length, 2);
      assert.equal(rows[0].name, prefix + 'fengmk2');
      assert.equal(rows[1].name, prefix + 'fengmk3');
    });

    it('should select 1 row', async () => {
      const row = await db.queryOne('select * from ?? where email=? order by id',
        [ table, prefix + 'm@fengmk2.com' ]);
      assert.equal(row.name, prefix + 'fengmk2');
    });

    it('should support promise', () => {
      return db.queryOne('select * from ?? where email=? order by id',
        [ table, prefix + 'm@fengmk2.com' ])
        .then(row => {
          assert.equal(row.name, prefix + 'fengmk2');
        });
    });
  });

  describe('locks([...]), lockOne(name, lockType, alias), unlock()', () => {
    it('validate arguments', async () => {
      await assert.rejects(async () => {
        await db.locks([
          { tableName: 'xxxx' } as any,
        ]);
      }, new Error('No lock_type provided while trying to lock table `xxxx`'));

      await assert.rejects(async () => {
        await db.locks([
          { lockType: 'READ' } as any,
        ]);
      }, new Error('No table_name provided while trying to lock table'));
    });

    it('should lock a table', async () => {
      // assert.equal(sql.replace(/\s+/g, ' '), 'LOCK TABLES `posts` READ;');
      await assert.rejects(async () => {
        await db.locks([
          { tableName: table, lockType: 'READ' } as any,
          { tableName: table, lockType: 'READ' } as any,
        ]);
      }, (err: any) => {
        err.sql.includes('LOCK TABLES  `' + table + '`  READ,  `' + table + '`  READ;');
        return true;
      });
    });

    it('should lock multiple tables', async () => {
      // assert.equal(sql.replaceAll(/\s+/g, ' '), 'LOCK TABLES `posts` READ, `posts2` WRITE, `posts3` AS `t` WRITE;');
      await assert.rejects(async () => {
        await db.locks([
          { tableName: table, lockType: 'READ' } as any,
          { tableName: table, lockType: 'WRITE' } as any,
          { tableName: table, lockType: 'WRITE', tableAlias: 't' },
        ]);
      }, (err: any) => {
        err.sql.includes('LOCK TABLES  `' + table + '`  READ,  `' + table + '`  WRITE,  `' + table + '`  AS `t`  WRITE;');
        return true;
      });
      await assert.rejects(async () => {
        await db.locks([
          { tableName: 'xxxx' } as any,
        ]);
      }, new Error('No lock_type provided while trying to lock table `xxxx`'));
    });
    it('should unlock tables', async () => {
      await db.lockOne('myrds-test-user', 'READ', 't');
      // error thrown: when table locked with alias, you can only query with the alias.
      await assert.rejects(async () => {
        await db.query('select * from `myrds-test-user` limit 1;');
      });
      await db.unlock();
      // recovered after unlock.
      await db.query('select * from `myrds-test-user` limit 1;');
    });
  });

  describe('transactions', () => {
    it('should beginTransaction error', async () => {
      const failDB = new RDSClient({
        port: 12312,
        host: '127.0.0.1',
      });
      await assert.rejects(async () => {
        await failDB.beginTransaction();
      }, (err: Error) => {
        assert.equal(err.name, 'RDSClientGetConnectionError');
        return true;
      });
    });

    it('should throw error after transaction rollback', async () => {
      const tran = await db.beginTransaction();
      await tran.rollback();

      await assert.rejects(async () => {
        await tran.select(table);
      }, (err: Error) => {
        assert.equal(err.message, 'transaction was commit or rollback');
        return true;
      });

      await assert.rejects(async () => {
        await tran.rollback();
      }, (err: Error) => {
        assert.equal(err.message, 'transaction was commit or rollback');
        return true;
      });

      await assert.rejects(async () => {
        await tran.commit();
      }, (err: Error) => {
        assert.equal(err.message, 'transaction was commit or rollback');
        return true;
      });
    });

    it('should throw error after transaction commit', async () => {
      const tran = await db.beginTransaction();
      await tran.commit();

      await assert.rejects(async () => {
        await tran.select(table);
      }, (err: Error) => {
        assert.equal(err.message, 'transaction was commit or rollback');
        return true;
      });

      await assert.rejects(async () => {
        await tran.rollback();
      }, (err: Error) => {
        assert.equal(err.message, 'transaction was commit or rollback');
        return true;
      });

      await assert.rejects(async () => {
        await tran.commit();
      }, (err: Error) => {
        assert.equal(err.message, 'transaction was commit or rollback');
        return true;
      });
    });

    it('should insert 2 rows in a transaction', async () => {
      const conn = await db.getConnection();
      await conn.beginTransaction();

      try {
        await conn.query(`insert into ??(name, email, gmt_create, gmt_modified)
          values(?, ?, now(), now())`,
        [ table, prefix + 'transaction1', prefix + 'm@transaction.com' ]);
        await conn.query(`insert into ??(name, email, gmt_create, gmt_modified)
          values(?, ?, now(), now())`,
        [ table, prefix + 'transaction2', prefix + 'm@transaction.com' ]);
        await conn.commit();
      } catch (err) {
        // error, rollback
        await conn.rollback(); // rollback call won't throw err
        throw err;
      } finally {
        // should release connection whatever
        conn.release();
      }

      const rows = await db.query('select * from ?? where email=? order by id',
        [ table, prefix + 'm@transaction.com' ]);
      assert.equal(rows.length, 2);
      assert.equal(rows[0].name, prefix + 'transaction1');
      assert.equal(rows[1].name, prefix + 'transaction2');
    });

    it('should use db.beginTransaction()', async () => {
      const tran = await db.beginTransaction();
      try {
        await tran.query(`insert into ??(name, email, gmt_create, gmt_modified)
          values(?, ?, now(), now())`,
        [ table, prefix + 'beginTransaction1', prefix + 'm@beginTransaction.com' ]);
        await tran.query(`insert into ??(name, email, gmt_create, gmt_modified)
          values(?, ?, now(), now())`,
        [ table, prefix + 'beginTransaction2', prefix + 'm@beginTransaction.com' ]);
        await tran.commit();
      } catch (err) {
        // error, rollback
        await tran.rollback(); // rollback call won't throw err
        throw err;
      }

      const rows = await db.query('select * from ?? where email=? order by id',
        [ table, prefix + 'm@beginTransaction.com' ]);
      assert.equal(rows.length, 2);
      assert.equal(rows[0].name, prefix + 'beginTransaction1');
      assert.equal(rows[1].name, prefix + 'beginTransaction2');
    });

    it('should lock & unlock table during transaction', async () => {
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();
        await conn.lockOne('myrds-test-user', 'READ', 't');
        // error thrown: when table locked with alias, you can only query with the alias.
        await assert.rejects(async () => {
          await conn.query('select * from `myrds-test-user` limit 1;');
        });
        await conn.unlock();
        // recovered after unlock.
        await conn.query('select * from `myrds-test-user` limit 1;');
      } catch (err) {
        throw err;
      } finally {
        conn.release();
      }
    });

    it('should rollback when query fail', async () => {
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();
      } catch (err) {
        conn.release();
        throw err;
      }

      try {
        await conn.query(`insert into ??(name, email, gmt_create, gmt_modified)
          values(?, ?, now(), now())`,
        [ table, prefix + 'transaction-fail1', 'm@transaction-fail.com' ]);
        await conn.query(`insert into ??(name, email, gmt_create, gmt_modified)
          valuefail(?, ?, now(), now())`,
        [ table, prefix + 'transaction-fail12', 'm@transaction-fail.com' ]);
        await conn.commit();
      } catch (err) {
        // error, rollback
        await conn.rollback(); // rollback call won't throw err
        assert.equal(err.code, 'ER_PARSE_ERROR');
        assert.match(err.stack, /sql: insert into/);
      } finally {
        // should release connection whatever
        conn.release();
      }

      const rows = await db.query('select * from ?? where email=? order by id',
        [ table, prefix + 'm@transaction-fail.com' ]);
      assert.equal(rows.length, 0);
    });
  });

  describe('logging', () => {
    const mockLogs: string[] = [];

    it('should logging sql', async () => {
      const db = new RDSClient({
        ...config,
        logging: (sql, { threadId }) => {
          assert.equal(typeof threadId, 'number');
          mockLogs.push(sql);
        },
      });

      await db.query('show tables');
      assert.deepEqual(mockLogs, [ 'show tables' ]);
      // logging SQL string with variable replaced
      await db.query('select * from ?? where email = ? limit 1',
        [ table, prefix + 'm@fengmk2.com' ]);
      assert.deepEqual(mockLogs, [
        'show tables',
        `select * from \`${table}\` where email = '${prefix + 'm@fengmk2.com'}' limit 1`,
      ]);
    });
  });

  describe('beginTransactionScope(scope)', () => {
    it('should beginTransactionScope() error', async () => {
      const failDB = new RDSClient({
        port: 12312,
        host: '127.0.0.1',
      });
      await assert.rejects(async () => {
        await failDB.beginTransactionScope(async () => {
          // do nothing
        });
      }, (err: Error) => {
        assert.equal(err.name, 'RDSClientGetConnectionError');
        return true;
      });
    });

    it('should throw rollback error with cause error when rollback failed', async () => {
      mm(RDSTransaction.prototype, 'rollback', async function(this: RDSTransaction) {
        this.conn!.release();
        throw new Error('fake rollback error');
      });
      await assert.rejects(
        db.beginTransactionScope(async conn => {
          await conn.query(`insert into ??(name, email, gmt_create, gmt_modified)
            valuefail(?, ?, now(), now())`,
          [ table, prefix + 'beginTransactionScope-fail12', 'm@beginTransactionScope-fail.com' ]);
        }),
        (err: any) =>
          err.message === 'fake rollback error' &&
          err.cause.code === 'ER_PARSE_ERROR',
      );
    });

    it('should rollback when query fail', async () => {
      await assert.rejects(
        db.beginTransactionScope(async conn => {
          await conn.query(`insert into ??(name, email, gmt_create, gmt_modified)
            values(?, ?, now(), now())`,
          [ table, prefix + 'beginTransactionScope-fail1', 'm@beginTransactionScope-fail.com' ]);
          await conn.query(`insert into ??(name, email, gmt_create, gmt_modified)
            valuefail(?, ?, now(), now())`,
          [ table, prefix + 'beginTransactionScope-fail12', 'm@beginTransactionScope-fail.com' ]);
          return true;
        }),
        (err: any) => err.code === 'ER_PARSE_ERROR',
      );

      const rows = await db.query('select * from ?? where email=? order by id',
        [ table, prefix + 'm@beginTransactionScope-fail.com' ]);
      assert.equal(rows.length, 0);
    });

    it('should rollback all when query failed in nested scope', async () => {
      mm.spy(RDSTransaction.prototype, 'rollback');

      const inner = async () => {
        return db.beginTransactionScope(async conn => {
          await conn.query(`insert into ??(name, email, gmt_create, gmt_modified)
            values(?, ?, now(), now())`,
          [ table, prefix + 'beginTransactionScope-fail1', 'm@beginTransactionScope-nested-fail.com' ]);
          await conn.query(`insert into ??(name, email, gmt_create, gmt_modified)
            valuefail(?, ?, now(), now())`,
          [ table, prefix + 'beginTransactionScope-fail12', 'm@beginTransactionScope-nested-fail.com' ]);
          return true;
        });
      };

      const outter = async () => {
        return await db.beginTransactionScope(async conn => {
          await conn.query(`insert into ??(name, email, gmt_create, gmt_modified)
              values(?, ?, now(), now())`,
          [ table, prefix + 'beginTransactionScopeCtx3', 'm@beginTransactionScope-nested-fail.com' ]);
          await inner();
          await conn.query(`insert into ??(name, email, gmt_create, gmt_modified)
              values(?, ?, now(), now())`,
          [ table, prefix + 'beginTransactionScopeCtx4', 'm@beginTransactionScope-nested-fail.com' ]);
          return true;
        });
      };

      await assert.rejects(outter(), (err: any) => err.code === 'ER_PARSE_ERROR');
      assert.strictEqual(mmSpy(RDSTransaction.prototype.rollback).called, 1);

      const rows = await db.query('select * from ?? where email=? order by id',
        [ table, 'm@beginTransactionScope-nested-fail.com' ]);
      assert.equal(rows.length, 0);
    });

    it('should not commit when catch query error in nested scope', async () => {
      mm.spy(RDSTransaction.prototype, 'commit');
      mm.spy(RDSTransaction.prototype, 'rollback');

      const inner = async () => {
        return await db.beginTransactionScope(async conn => {
          await conn.query(`insert into ??(name, email, gmt_create, gmt_modified)
            valuefail(?, ?, now(), now())`,
          [ table, prefix + 'beginTransactionScope-fail12', 'm@beginTransactionScope-catch-nested-error.com' ]);
          return true;
        });
      };

      const err = await db.beginTransactionScope(async conn => {
        await conn.query(`insert into ??(name, email, gmt_create, gmt_modified)
            values(?, ?, now(), now())`,
        [ table, prefix + 'beginTransactionScope-fail1', 'm@beginTransactionScope-catch-nested-error.com' ]);
        return await inner().catch(err => err);
      });

      assert.strictEqual(err.code, 'ER_PARSE_ERROR');
      assert.strictEqual(mmSpy(RDSTransaction.prototype.rollback).called, 1);
      assert.strictEqual(mmSpy(RDSTransaction.prototype.commit).called, undefined);
      const rows = await db.query('select * from ?? where email=? order by id',
        [ table, 'm@beginTransactionScope-catch-nested-error.com' ]);
      assert.equal(rows.length, 0);
    });

    it('should fail when query after catch nested error', async () => {
      mm.spy(RDSTransaction.prototype, 'rollback');

      const inner = async () => {
        return await db.beginTransactionScope(async conn => {
          await conn.query(`insert into ??(name, email, gmt_create, gmt_modified)
            valuefail(?, ?, now(), now())`,
          [ table, prefix + 'beginTransactionScope-fail12', 'm@beginTransactionScope-query-catch-nested-error.com' ]);
          return true;
        });
      };

      await assert.rejects(
        db.beginTransactionScope(async conn => {
          await inner().catch(() => { /* ignore */ });
          await conn.query(`insert into ??(name, email, gmt_create, gmt_modified)
            values(?, ?, now(), now())`,
          [ table, prefix + 'beginTransactionScope-fail1', 'm@beginTransactionScope-query-catch-nested-error.com' ]);
        }),
        (err: Error) => err.message === 'transaction was commit or rollback',
      );

      assert.strictEqual(mmSpy(RDSTransaction.prototype.rollback).called, 1);
    });

    it('should partially success when query failed in parallel transaction', async () => {
      const p1 = async () => {
        return await db.beginTransactionScope(async conn => {
          await conn.query(`insert into ??(name, email, gmt_create, gmt_modified)
              values(?, ?, now(), now())`,
          [ table, prefix + 'beginTransactionScopeCtx-partial1', 'm@beginTransactionScope-parallel-fail.com' ]);
          await conn.query(`insert into ??(name, email, gmt_create, gmt_modified)
              values(?, ?, now(), now())`,
          [ table, prefix + 'beginTransactionScopeCtx-partial2', 'm@beginTransactionScope-parallel-fail.com' ]);
          return true;
        });
      };

      const p2 = async () => {
        return db.beginTransactionScope(async conn => {
          await conn.query(`insert into ??(name, email, gmt_create, gmt_modified)
            values(?, ?, now(), now())`,
          [ table, prefix + 'beginTransactionScope-fail1', 'm@beginTransactionScope-parallel-fail.com' ]);
          await conn.query(`insert into ??(name, email, gmt_create, gmt_modified)
            valuefail(?, ?, now(), now())`,
          [ table, prefix + 'beginTransactionScope-fail12', 'm@beginTransactionScope-parallel-fail.com' ]);
          return true;
        });
      };

      const [ p1Res, p2Res ] = await Promise.all([ p1(), p2().catch(err => {
        return err;
      }) ]);
      assert.strictEqual(p1Res, true);
      assert.strictEqual(p2Res.code, 'ER_PARSE_ERROR');
      const rows = await db.query('select * from ?? where email=? order by id',
        [ table, 'm@beginTransactionScope-parallel-fail.com' ]);
      assert.equal(rows.length, 2);
    });

    it('should insert 2 rows in a transaction', async () => {
      const result = await db.beginTransactionScope(async conn => {
        await conn.query(`insert into ??(name, email, gmt_create, gmt_modified)
          values(?, ?, now(), now())`,
        [ table, prefix + 'beginTransactionScope1', prefix + 'm@beginTransactionScope1.com' ]);
        await conn.query(`insert into ??(name, email, gmt_create, gmt_modified)
          values(?, ?, now(), now())`,
        [ table, prefix + 'beginTransactionScope2', prefix + 'm@beginTransactionScope1.com' ]);
        return true;
      });
      assert.equal(result, true);
      const rows = await db.query('select * from ?? where email=? order by id',
        [ table, prefix + 'm@beginTransactionScope1.com' ]);
      assert.equal(rows.length, 2);
      assert.equal(rows[0].name, prefix + 'beginTransactionScope1');
      assert.equal(rows[1].name, prefix + 'beginTransactionScope2');
    });

    it('should insert 4 rows in nested and parallel scopes', async () => {
      mm.spy(RDSTransaction.prototype, 'commit');
      const nestedNestedScope = async () => {
        return await db.beginTransactionScope(async conn => {
          await conn.query(`insert into ??(name, email, gmt_create, gmt_modified)
              values(?, ?, now(), now())`,
          [ table, prefix + 'beginTransactionScopeCtx1', prefix + 'm@beginTransactionScope-success.com' ]);
          return conn;
        });
      };

      const nestedScope = async () => {
        return await db.beginTransactionScope(async conn => {
          const nested = await nestedNestedScope();
          await conn.query(`insert into ??(name, email, gmt_create, gmt_modified)
              values(?, ?, now(), now())`,
          [ table, prefix + 'beginTransactionScopeCtx2', prefix + 'm@beginTransactionScope-success.com' ]);
          return [ conn, nested ];
        });
      };

      const scope = async () => {
        return await db.beginTransactionScope(async conn => {
          const nested = await nestedScope();
          await conn.query(`insert into ??(name, email, gmt_create, gmt_modified)
              values(?, ?, now(), now())`,
          [ table, prefix + 'beginTransactionScopeCtx3', prefix + 'm@beginTransactionScope-success.com' ]);
          return [ conn, ...nested ];
        });
      };

      const parallelScope = async () => {
        return await db.beginTransactionScope(async conn => {
          await conn.query(`insert into ??(name, email, gmt_create, gmt_modified)
              values(?, ?, now(), now())`,
          [ table, prefix + 'beginTransactionScopeCtx4', prefix + 'm@beginTransactionScope-success.com' ]);
          return conn;
        });
      };

      const [[ conn1, conn2, conn3 ], conn4 ] = await Promise.all([ scope(), parallelScope() ]);
      assert.strictEqual(conn1, conn2);
      assert.strictEqual(conn2, conn3);
      assert.notStrictEqual(conn1, conn4);

      const rows = await db.query('select * from ?? where email=? order by id',
        [ table, prefix + 'm@beginTransactionScope-success.com' ]);
      assert.equal(rows.length, 4);
      assert.strictEqual(mmSpy(RDSTransaction.prototype.commit).called, 2);
    });

    it('should multiple instances works', async () => {
      mm.spy(RDSTransaction.prototype, 'commit');
      const db2 = new RDSClient(config);

      const [ conn1, conn2 ] = await Promise.all([
        db.beginTransactionScope(async conn => {
          await conn.query(`insert into ??(name, email, gmt_create, gmt_modified)
            values(?, ?, now(), now())`,
          [ table, prefix + 'multiple-instance1', prefix + 'm@multiple-instance.com' ]);
          return conn;
        }),
        db2.beginTransactionScope(async conn => {
          await conn.query(`insert into ??(name, email, gmt_create, gmt_modified)
            values(?, ?, now(), now())`,
          [ table, prefix + 'multiple-instance2', prefix + 'm@multiple-instance.com' ]);
          return conn;
        }),
      ]);

      assert.notStrictEqual(conn1, conn2);
      assert.strictEqual(mmSpy(RDSTransaction.prototype.commit).called, 2);

      const rows = await db.query('select * from ?? where email=? order by id',
        [ table, prefix + 'm@multiple-instance.com' ]);
      assert.equal(rows.length, 2);

      await db2.end();
    });

    it('should multiple instances with the same asyncLocalStorage works', async () => {
      mm.spy(RDSTransaction.prototype, 'commit');

      const storage = new AsyncLocalStorage<any>();
      const db1 = new RDSClient({
        ...config,
        connectionStorage: storage,
        connectionStorageKey: 'datasource1',
      });
      const db2 = new RDSClient({
        ...config,
        connectionStorage: storage,
        connectionStorageKey: 'datasource2',
      });

      const [ conn1, conn2 ] = await Promise.all([
        db1.beginTransactionScope(async conn => {
          await conn.query(`insert into ??(name, email, gmt_create, gmt_modified)
            values(?, ?, now(), now())`,
          [ table, prefix + 'multiple-instance-als1', prefix + 'm@multiple-instance-als.com' ]);
          return conn;
        }),
        db2.beginTransactionScope(async conn => {
          await conn.query(`insert into ??(name, email, gmt_create, gmt_modified)
            values(?, ?, now(), now())`,
          [ table, prefix + 'multiple-instance-als2', prefix + 'm@multiple-instance-als.com' ]);
          return conn;
        }),
      ]);

      assert.notStrictEqual(conn1, conn2);
      assert.strictEqual(mmSpy(RDSTransaction.prototype.commit).called, 2);

      const rows = await db.query('select * from ?? where email=? order by id',
        [ table, prefix + 'm@multiple-instance-als.com' ]);
      assert.equal(rows.length, 2);

      await db1.end();
      await db2.end();
    });

    it('should db.query in transaction scope works', async () => {
      let querySql: string | undefined;
      mm(RDSTransaction.prototype, 'query', async (sql: string) => {
        querySql = sql;
      });
      await db.beginTransactionScope(async () => {
        await db.query(`insert into ??(name, email, gmt_create, gmt_modified)
            values(?, ?, now(), now())`,
        [ table, prefix + 'multiple-instance1', prefix + 'm@multiple-instance.com' ]);
        return db;
      });
      assert(querySql);
    });

    it('should db.query specify conn in transaction scope works', async () => {
      let transactionQuerySql: string | undefined;
      let connQuerySql: string | undefined;
      mm(RDSTransaction.prototype, 'query', async (sql: string) => {
        transactionQuerySql = sql;
      });
      const conn = await db.getConnection();
      mm(conn, 'query', async (sql: string) => {
        connQuerySql = sql;
      });
      await db.beginTransactionScope(async () => {
        await db.query(`insert into ??(name, email, gmt_create, gmt_modified)
            values(?, ?, now(), now())`,
        [ table, prefix + 'multiple-instance1', prefix + 'm@multiple-instance.com' ], {
          conn,
        });
        return db;
      });
      conn.release();
      assert(connQuerySql);
      assert(!transactionQuerySql);
    });
  });

  describe('beginDoomedTransactionScope(scope)', () => {
    it('should rollback when query success', async () => {
      mm.spy(RDSTransaction.prototype, 'rollback');
      const inner = async () => {
        return await db.beginDoomedTransactionScope(async conn => {
          await conn.query(`insert into ??(name, email, gmt_create, gmt_modified)
              values(?, ?, now(), now())`,
          [ table, prefix + 'beginDoomedTransactionScopeCtx1', prefix + 'm@beginDoomedTransactionScope-success.com' ]);
          return conn;
        });
      };

      const [ conn, nestedConn ] = await db.beginDoomedTransactionScope(async conn => {
        await conn.query(`insert into ??(name, email, gmt_create, gmt_modified)
            values(?, ?, now(), now())`,
        [ table, prefix + 'beginDoomedTransactionScopeCtx2', prefix + 'm@beginDoomedTransactionScope-success.com' ]);
        const nestedConn = await inner();
        return [ conn, nestedConn ];
      });

      assert.strictEqual(conn, nestedConn);
      assert.strictEqual(mmSpy(RDSTransaction.prototype.rollback).called, 1);

      const rows = await db.query('select * from ?? where email=? order by id',
        [ table, prefix + 'm@beginDoomedTransactionScope-success.com' ]);
      assert.equal(rows.length, 0);
    });

    it('should rollback when query fail', async () => {
      mm.spy(RDSTransaction.prototype, 'rollback');
      const inner = async () => {
        return await db.beginDoomedTransactionScope(async conn => {
          await conn.query(`insert into ??(name, email, gmt_create, gmt_modified)
              valuefail(?, ?, now(), now())`,
          [ table, prefix + 'beginDoomedTransactionScopeCtx1', prefix + 'm@beginDoomedTransactionScope-fail.com' ]);
        });
      };

      await assert.rejects(
        db.beginDoomedTransactionScope(async conn => {
          await conn.query(`insert into ??(name, email, gmt_create, gmt_modified)
            values(?, ?, now(), now())`,
          [ table, prefix + 'beginDoomedTransactionScopeCtx2', prefix + 'm@beginDoomedTransactionScope-fail.com' ]);
          await inner();
        }),
        (err: any) => err.code === 'ER_PARSE_ERROR',
      );

      assert.strictEqual(mmSpy(RDSTransaction.prototype.rollback).called, 1);

      const rows = await db.query('select * from ?? where email=? order by id',
        [ table, prefix + 'm@beginDoomedTransactionScope-fail.com' ]);
      assert.equal(rows.length, 0);
    });
  });

  describe('get(table, obj, options), select(table, options)', () => {
    before(async () => {
      let result = await db.insert(table, {
        name: prefix + 'fengmk2-get',
        email: prefix + 'm@fengmk2-get.com',
      });
      assert.equal(result.affectedRows, 1);

      result = await db.insert(table, {
        name: prefix + 'fengmk3-get',
        email: prefix + 'm@fengmk2-get.com',
      });
      assert.equal(result.affectedRows, 1);
    });

    it('should get exists object without columns', async () => {
      let user = await db.get(table, { email: prefix + 'm@fengmk2-get.com' });
      assert(user);
      assert.deepEqual(Object.keys(user), [ 'id', 'gmt_create', 'gmt_modified', 'name', 'email', 'mobile' ]);
      assert.equal(user.name, prefix + 'fengmk2-get');

      user = await db.get(table, { email: prefix + 'm@fengmk2-get.com' }, {
        orders: [[ 'id', 'desc' ]],
      });
      assert(user);
      assert.deepEqual(Object.keys(user), [ 'id', 'gmt_create', 'gmt_modified', 'name', 'email', 'mobile' ]);
      assert.equal(user.name, prefix + 'fengmk3-get');

      user = await db.get(table, { email: prefix + 'm@fengmk2-get.com' }, {
        orders: [[ 'id', 'desc' ], 'gmt_modified', [ 'gmt_create', 'asc' ]],
      });
      assert(user);
      assert.deepEqual(Object.keys(user), [ 'id', 'gmt_create', 'gmt_modified', 'name', 'email', 'mobile' ]);
      assert.equal(user.name, prefix + 'fengmk3-get');
    });

    it('should get exists object with columns', async () => {
      const user = await db.get(table, { email: prefix + 'm@fengmk2-get.com' }, {
        columns: [ 'id', 'name' ],
      });
      assert(user);
      assert.deepEqual(Object.keys(user), [ 'id', 'name' ]);
      assert.equal(user.name, prefix + 'fengmk2-get');
    });

    it('should get null when row not exists', async () => {
      const user = await db.get(table, { email: prefix + 'm@fengmk2-get-not-exists.com' }, {
        columns: [ 'id', 'name' ],
      });
      assert.strictEqual(user, null);
    });

    it('should select objects without columns', async () => {
      let users = await db.select(table, {
        where: { email: prefix + 'm@fengmk2-get.com' },
      });
      assert(users);
      assert.equal(users.length, 2);
      assert.deepEqual(Object.keys(users[0]), [ 'id', 'gmt_create', 'gmt_modified', 'name', 'email', 'mobile' ]);
      assert.equal(users[0].name, prefix + 'fengmk2-get');

      users = await db.select(table, {
        where: { email: prefix + 'm@fengmk2-get.com' },
        orders: [[ 'id', 'desc' ]],
        limit: 1,
      });
      assert(users);
      assert.equal(users.length, 1);
      assert.deepEqual(Object.keys(users[0]), [ 'id', 'gmt_create', 'gmt_modified', 'name', 'email', 'mobile' ]);
      assert.equal(users[0].name, prefix + 'fengmk3-get');

      users = await db.select(table, {
        where: { email: prefix + 'm@fengmk2-get.com' },
        orders: [[ 'id', 'desc' ]],
        limit: 1,
        offset: 1,
      });
      assert(users);
      assert.equal(users.length, 1);
      assert.deepEqual(Object.keys(users[0]), [ 'id', 'gmt_create', 'gmt_modified', 'name', 'email', 'mobile' ]);
      assert.equal(users[0].name, prefix + 'fengmk2-get');

      users = await db.select(table, {
        where: { email: prefix + 'm@fengmk2-get.com' },
        orders: [[ 'id', 'desc' ]],
        limit: 10,
        offset: 100,
      });
      assert(users);
      assert.equal(users.length, 0);
    });

    it('should select without options.where', async () => {
      const users = await db.select(table);
      assert(users);
      assert.equal(users.length > 2, true);
      assert.deepEqual(Object.keys(users[0]), [ 'id', 'gmt_create', 'gmt_modified', 'name', 'email', 'mobile' ]);
    });

    it('should select with options.orders', async () => {
      let users = await db.select(table, {
        orders: 'id',
      });
      assert(users.length >= 2);
      assert(users[0].id < users[1].id);

      users = await db.select(table, {
        orders: [[ 'id', 'desc' ], null, 1 ],
      });
      assert(users.length >= 2);
      assert(users[0].id > users[1].id);

      users = await db.select(table, {
        orders: [ 'id', [ 'name', 'foo' ]],
      });
      assert(users.length >= 2);
      assert(users[0].id < users[1].id);
    });
  });

  describe('insert(table, row[s])', () => {
    it('should set now() as a default value for `gmt_create` and `gmt_modified`', async () => {
      const result = await db.insert(table, [{
        name: prefix + 'fengmk2-insert00',
        email: prefix + 'm@fengmk2-insert.com',
      }, {
        name: prefix + 'fengmk2-insert01',
        email: prefix + 'm@fengmk2-insert.com',
        gmt_create: db.literals.now,
        gmt_modified: db.literals.now,
      }]);
      assert.equal(result.affectedRows, 2);

      const result1 = await db.get(table, { name: prefix + 'fengmk2-insert00' }, { columns: [ 'gmt_create', 'gmt_modified' ] });
      const result2 = await db.get(table, { name: prefix + 'fengmk2-insert01' }, { columns: [ 'gmt_create', 'gmt_modified' ] });
      assert.deepEqual(result1.gmt_create, result2.gmt_create);
      assert.deepEqual(result2.gmt_modified, result2.gmt_modified);
    });

    it('should insert one row', async () => {
      const result = await db.insert(table, {
        name: prefix + 'fengmk2-insert1',
        email: prefix + 'm@fengmk2-insert.com',
      });
      assert.equal(result.affectedRows, 1);
    });

    it('should insert with columns', async () => {
      const result = await db.insert(table, {
        name: prefix + 'fengmk2-insert-with-columns',
        email: prefix + 'm@fengmk2-insert-with-columns.com',
        ignoretitle: 'foo title',
      }, {
        columns: [ 'name', 'email' ],
      });
      assert.equal(result.affectedRows, 1);
    });

    it('should insert multi rows', async () => {
      const result = await db.insert(table, [
        {
          name: prefix + 'fengmk2-insert2',
          email: prefix + 'm@fengmk2-insert.com',
        },
        {
          name: prefix + 'fengmk2-insert3',
          email: prefix + 'm@fengmk2-insert.com',
        },
      ]);
      assert.equal(result.affectedRows, 2);
      const row = await db.get(table, { id: result.insertId });
      assert(row);
      assert.equal(row.id, result.insertId);
    });

    it('should insert multi fail', async () => {
      try {
        await db.insert(table, [
          {
            name: prefix + 'fengmk2-insert4',
            email: prefix + 'm@fengmk2-insert.com',
          },
          {
            name: prefix + 'fengmk2-insert4',
            email: prefix + 'm@fengmk2-insert.com',
          },
        ]);
        throw new Error('should not run this');
      } catch (err) {
        assert.equal(err.code, 'ER_DUP_ENTRY');
      }
      const row = await db.get(table, { name: prefix + 'fengmk2-insert4' });
      assert(!row);
    });

    it('should part success on Duplicate key without transaction', async () => {
      const result = await db.insert(table, {
        name: prefix + 'fengmk2-insert-no-tran',
        email: prefix + 'm@fengmk2-insert.com',
      });
      assert.equal(result.affectedRows, 1);
      let rows = await db.select(table, {
        where: { name: prefix + 'fengmk2-insert-no-tran' },
      });
      assert.equal(rows.length, 1);

      try {
        await db.insert(table, {
          name: prefix + 'fengmk2-insert-no-tran',
          email: prefix + 'm@fengmk2-insert.com',
        });
        throw new Error('should not run this');
      } catch (err) {
        assert.equal(err.code, 'ER_DUP_ENTRY');
      }
      rows = await db.select(table, {
        where: { name: prefix + 'fengmk2-insert-no-tran' },
      });
      assert.equal(rows.length, 1);
    });

    it('should all fail on Duplicate key with transaction', async () => {
      const tran = await db.beginTransaction();
      try {
        const result = await tran.insert(table, {
          name: prefix + 'fengmk2-insert-has-tran',
          email: prefix + 'm@fengmk2-insert.com',
        });
        assert.equal(result.affectedRows, 1);
        const rows = await tran.select(table, {
          where: { name: prefix + 'fengmk2-insert-has-tran' },
        });
        assert.equal(rows.length, 1);

        await tran.insert(table, {
          name: prefix + 'fengmk2-insert-has-tran',
          email: prefix + 'm@fengmk2-insert.com',
        });

        await tran.commit();
      } catch (err) {
        await tran.rollback();
        assert.equal(err.code, 'ER_DUP_ENTRY');
      }

      const rows = await db.select(table, {
        where: { name: prefix + 'fengmk2-insert-has-tran' },
      });
      assert.equal(rows.length, 0);
    });
  });

  describe('update(table, obj, options)', () => {
    before(async () => {
      await db.insert(table, {
        name: prefix + 'fengmk2-update',
        email: prefix + 'm@fengmk2-update.com',
        gmt_create: db.literals.now,
        gmt_modified: db.literals.now,
      });
    });

    it('should throw error when cannot auto detect update condition', async () => {
      try {
        await db.update(table, {});
        throw new Error('should not run this');
      } catch (err) {
        assert.equal(err.message,
          'Can not auto detect update condition, please set option.where, or make sure obj.id exists');
      }
    });

    it('should get and update', async () => {
      await db.insert(table, {
        name: prefix + 'fengmk2-update2',
        email: prefix + 'm@fengmk2-update2.com',
        gmt_create: db.literals.now,
        gmt_modified: db.literals.now,
      });

      const user = await db.get(table, {
        name: prefix + 'fengmk2-update2',
      });
      user.email = prefix + 'm@fengmk2-update2-again.com';
      const result = await db.update(table, user);
      assert.equal(result.affectedRows, 1);

      const row = await db.get(table, { id: user.id });
      assert.equal(row.email, user.email);
    });

    it('should update exists row', async () => {
      let user = await db.get(table, {
        name: prefix + 'fengmk2-update',
      });
      assert.equal(user.email, prefix + 'm@fengmk2-update.com');

      let result;

      try {
        result = await db.update(table, {
          name: prefix + 'fengmk2-update',
          email: prefix + 'm@fengmk2-update2.com',
          gmt_create: 'now()', // invalid date
          gmt_modified: db.literals.now,
        }, {
          where: {
            name: prefix + 'fengmk2-update',
          },
        });
        throw new Error('should not run this');
      } catch (error) {
        assert(error.message.includes("Incorrect datetime value: 'now()' for column"));
      }

      result = await db.update(table, {
        name: prefix + 'fengmk2-update',
        email: prefix + 'm@fengmk2-update2.com',
        gmt_create: new Date('2000'),
        gmt_modified: db.literals.now,
      }, {
        where: {
          name: prefix + 'fengmk2-update',
        },
      });
      assert.equal(result.affectedRows, 1);

      result = await db.update(table, {
        email: prefix + 'm@fengmk2-update3.com',
      }, {
        where: {
          name: prefix + 'fengmk2-update',
          email: prefix + 'm@fengmk2-update2.com',
        },
      });
      assert.equal(result.affectedRows, 1);

      user = await db.get(table, {
        name: prefix + 'fengmk2-update',
      });
      assert.deepEqual(user.email, prefix + 'm@fengmk2-update3.com');
      assert.deepEqual(new Date(user.gmt_create), new Date('2000'));
      assert(user.gmt_modified instanceof Date);

      user.email = prefix + 'm@fengmk2-update3.com';
      result = await db.update(table, user, {
        columns: [ 'email' ],
      });
      assert.equal(result.affectedRows, 1);
      const row = await db.get(table, { id: user.id });
      assert.equal(row.email, user.email);
    });
  });

  describe('updateRows(table, rows)', () => {
    before(async () => {
      await db.insert(table, [{
        name: prefix + 'fengmk2-updateRows1',
        email: prefix + 'm@fengmk2-updateRows1.com',
        gmt_create: db.literals.now,
        gmt_modified: db.literals.now,
      }, {
        name: prefix + 'fengmk2-updateRows2',
        email: prefix + 'm@fengmk2-updateRows2.com',
        gmt_create: db.literals.now,
        gmt_modified: db.literals.now,
      }]);
    });

    it('should throw error when param options is not an array', async () => {
      try {
        await db.updateRows(table, {} as any);
        throw new Error('should not run this');
      } catch (err) {
        assert.equal(err.message, 'updateRows should be array');
      }
    });

    it('should throw error when rows has neither primary key `id` nor `row` and `where` properties', async () => {
      try {
        await db.updateRows(table, [{
          name: prefix + 'fengmk2-updateRows1-updated',
        }]);
        throw new Error('should not run this');
      } catch (err) {
        assert.equal(err.message, 'Can not auto detect updateRows condition, please set updateRow.where, or make sure updateRow.id exists');
      }
    });

    it('should get and update with primary key `id`', async () => {
      const rows = [{
        name: prefix + 'fengmk2-updateRows1-again',
        email: prefix + 'm@fengmk2-updateRows1-again.com',
        gmt_create: db.literals.now,
        gmt_modified: db.literals.now,
      }, {
        name: prefix + 'fengmk2-updateRows2-again',
        email: prefix + 'm@fengmk2-updateRows2-again.com',
        gmt_create: db.literals.now,
        gmt_modified: db.literals.now,
      }];
      await db.insert(table, rows);

      const names = rows.map(item => item.name);
      let users = await db.select(table, {
        where: { name: names },
      });

      users = users.map((item, index) => {
        item.email = prefix + 'm@fengmk2-updateRows-again-updated' + (index + 1) + '.com';
        item.gmt_create = new Date('1970');
        return item;
      });

      const result = await db.updateRows(table, users);
      assert.equal(result.affectedRows, 2);
      assert.equal(result.changedRows, 2);
      // console.log(result);

      const rowsUpdated = await db.select(table, {
        where: { name: names },
      });
      assert.deepEqual(users.map(o => o.email), rowsUpdated.map(o => o.email));
    });

    it('should update exists rows with primary key `id`', async () => {
      const names = [
        prefix + 'fengmk2-updateRows1',
        prefix + 'fengmk2-updateRows2',
      ];
      const emails = [
        prefix + 'm@fengmk2-updateRows1.com',
        prefix + 'm@fengmk2-updateRows2.com',
      ];
      let users = await db.select(table, {
        where: { name: names },
      });
      assert.deepEqual(users.map(o => o.email), emails);

      users = users.map((item, index) => {
        item.email = prefix + 'm@fengmk2-updateRows-updated' + (index + 1) + '.com';
        item.gmt_create = new Date('1970');
        return item;
      });

      let result = await db.updateRows(table, users);
      assert.equal(result.affectedRows, 2);

      users = await db.select(table, {
        where: { name: names },
      });
      assert.deepEqual(users.map(o => o.email), [
        prefix + 'm@fengmk2-updateRows-updated1.com',
        prefix + 'm@fengmk2-updateRows-updated2.com',
      ]);

      const newGmtCreate = new Date('2000');
      users = users.map((item, index) => {
        const newItem = {
          id: item.id,
          email: prefix + 'm@fengmk2-updateRows-again-updated' + (index + 1) + '.com',
        } as any;
        if (index >= 1) {
          newItem.gmt_create = newGmtCreate;
        }
        return newItem;
      });
      result = await db.updateRows(table, users);
      assert.equal(result.affectedRows, 2);
      users = await db.select(table, {
        where: { name: names },
      });
      assert.deepEqual(users[0].gmt_create, new Date('1970'));
      assert.deepEqual(users[1].gmt_create, newGmtCreate);
      assert.deepEqual(users.map(o => o.email), [
        prefix + 'm@fengmk2-updateRows-again-updated1.com',
        prefix + 'm@fengmk2-updateRows-again-updated2.com',
      ]);
    });

    it('should update rows with `row` and `where` properties', async () => {
      const users = [{
        name: prefix + 'fengmk2-updateRows0001',
        email: prefix + 'm@fengmk2-updateRows0001.com',
      }, {
        name: prefix + 'fengmk2-updateRows0002',
        email: prefix + 'm@fengmk2-updateRows0002.com',
      }, {
        name: prefix + 'fengmk2-updateRows0003',
        email: prefix + 'm@fengmk2-updateRows0003.com',
      }];
      await db.insert(table, users);
      let gmtModified = new Date('2050-01-01');
      let newUsers = [{
        row: {
          email: prefix + 'm@fengmk2-updateRows0001.com-updated1',
          gmt_modified: gmtModified,
        },
        where: {
          name: prefix + 'fengmk2-updateRows0001',
        },
      }, {
        row: {
          email: prefix + 'm@fengmk2-updateRows0002.com-updated2',
          gmt_modified: gmtModified,
        },
        where: {
          name: prefix + 'fengmk2-updateRows0002',
        },
      }, {
        row: {
          email: prefix + 'm@fengmk2-updateRows0003.com-updated3',
          gmt_modified: gmtModified,
        },
        where: {
          name: prefix + 'fengmk2-updateRows0003',
        },
      }];
      await db.updateRows(table, newUsers);
      let updatedUsers = await db.select(table, {
        where: { name: newUsers.map(item => item.where.name) },
      });
      assert.deepEqual(
        newUsers.map(o => ({ email: o.row.email, gmt_modified: new Date(o.row.gmt_modified) })),
        updatedUsers.map(o => ({ email: o.email, gmt_modified: new Date(o.gmt_modified) })),
      );

      gmtModified = new Date('2100-01-01');
      newUsers = updatedUsers.map(item => ({
        row: {
          email: item.email + '-again',
          gmt_modified: gmtModified,
        },
        where: {
          id: item.id,
          name: item.name,
        },
      }));
      await db.updateRows(table, newUsers);

      updatedUsers = await db.select(table, {
        where: { name: newUsers.map(item => item.where.name) },
      });
      assert.deepEqual(
        newUsers.map(o => ({ email: o.row.email, gmt_modified: new Date(o.row.gmt_modified) })),
        updatedUsers.map(o => ({ email: o.email, gmt_modified: new Date(o.gmt_modified) })),
      );
    });
  });

  describe('delete(table, where)', () => {
    before(async () => {
      let result = await db.insert(table, {
        name: prefix + 'fengmk2-delete',
        email: prefix + 'm@fengmk2-delete.com',
      });
      assert.equal(result.affectedRows, 1);
      assert(result.insertId > 0);

      result = await db.insert(table, {
        name: prefix + 'fengmk3-delete',
        email: prefix + 'm@fengmk2-delete.com',
      });
      assert.equal(result.affectedRows, 1);
    });

    it('should delete exists rows', async () => {
      const result = await db.delete(table, { email: prefix + 'm@fengmk2-delete.com' });
      assert.equal(result.affectedRows, 2);
      assert.equal(result.insertId, 0);

      const user = await db.get(table, { email: prefix + 'm@fengmk2-delete.com' });
      assert(!user);
    });

    it('should delete not exists rows', async () => {
      const result = await db.delete(table, { email: prefix + 'm@fengmk2-delete-not-exists.com' });
      assert.equal(result.affectedRows, 0);
      assert.equal(result.insertId, 0);
    });

    it('should delete all rows when where = null', async () => {
      let result = await db.insert(table, {
        name: prefix + 'fengmk2-delete2',
        email: prefix + 'm@fengmk2-delete2.com',
      });
      assert.equal(result.affectedRows, 1);
      assert(result.insertId > 0);
      result = await db.delete(table);
      assert(result.affectedRows > 0);
      console.log('delete %d rows', result.affectedRows);

      result = await db.insert(table, {
        name: prefix + 'fengmk2-delete3',
        email: prefix + 'm@fengmk2-delete3.com',
      });
      assert.equal(result.affectedRows, 1);
      assert(result.insertId > 0);
      result = await db.delete(table, null);
      assert(result.affectedRows > 0);

      const conn = await db.getConnection();
      result = await conn.insert(table, {
        name: prefix + 'fengmk2-delete3',
        email: prefix + 'm@fengmk2-delete3.com',
      });
      assert.equal(result.affectedRows, 1);
      assert(result.insertId > 0);
      result = await conn.delete(table);
      assert(result.affectedRows > 0);
      assert.equal(typeof conn.threadId, 'number');
      assert(conn.threadId! > 0);
      conn.release();
    });
  });

  describe('getConnection()', () => {
    it('should throw error when mysql connect fail', async () => {
      const db = new RDSClient({
        port: 33061,
        host: '127.0.0.1',
      });
      try {
        await db.getConnection();
        throw new Error('should not run this');
      } catch (err) {
        assert.equal(err.name, 'RDSClientGetConnectionError');
        assert.equal(err.message.indexOf('connect ECONNREFUSED'), 0);
      }
    });
  });

  describe('get stats()', () => {
    it('should get client stats', async () => {
      const stats = db.stats;
      assert.equal(typeof stats.allConnections, 'number');
      assert.equal(typeof stats.freeConnections, 'number');
      assert.equal(typeof stats.connectionQueue, 'number');
      assert.equal(typeof stats.busyConnections, 'number');
    });
  });

  describe('count()', () => {
    before(async () => {
      await db.query(`insert into ??(name, email, gmt_create, gmt_modified)
        values(?, ?, now(), now())`,
      [ table, prefix + 'fengmk2-count', prefix + 'm@fengmk2-count.com' ]);
      await db.query(`insert into ??(name, email, gmt_create, gmt_modified)
        values(?, ?, now(), now())`,
      [ table, prefix + 'fengmk3-count', prefix + 'm@fengmk2-count.com' ]);
    });

    it('should get total table rows count', async () => {
      let count = await db.count(table);
      assert(count >= 2);

      count = await db.count(table, {
        email: prefix + 'm@fengmk2-count.com',
      });
      assert.equal(count, 2);

      count = await db.count(table, { id: -1 });
      assert.equal(count, 0);
    });
  });

  describe('mock query after client end', () => {
    it('should query throw error after end', async () => {
      const db = new RDSClient(config);
      await db.query('select * from ?? limit 10', [ table ]);
      await db.end();
      const db2 = new RDSClient(config);

      try {
        await db.query('select * from ?? limit 10', [ table ]);
        throw new Error('should not run this');
      } catch (err) {
        assert.equal(err.message, 'Pool is closed.');
      }

      await db2.query('select * from ?? limit 10', [ table ]);
      await db2.end();
    });
  });

  describe('query lifecircle work', () => {
    it('should work on client and transactions', async () => {
      const db = new RDSClient(config);
      let count = 0;
      let lastSql = '';
      let counter2Before = 0;
      let counter2After = 0;
      db.beforeQuery(sql => {
        count++;
        lastSql = sql;
      });
      db.beforeQuery(() => {
        counter2Before++;
      });
      let lastArgs: any;
      db.afterQuery((...args) => {
        lastArgs = args;
      });
      db.afterQuery(() => {
        counter2After++;
      });
      await db.query('select * from ?? limit 10', [ table ]);
      assert.equal(lastSql, 'select * from `myrds-test-user` limit 10');
      assert.equal(lastArgs[0], lastSql);
      assert.equal(Array.isArray(lastArgs[1]), true);
      assert.equal(count, 1);

      await db.beginTransactionScope(async conn => {
        assert.equal(typeof conn.threadId, 'number');
        assert(conn.threadId! > 0);
        assert.equal(conn.threadId, conn.conn!.threadId);
        await conn.query(`insert into ??(name, email, gmt_create, gmt_modified)
          values(?, ?, now(), now())`,
        [ table, prefix + 'beginTransactionScope1', prefix + 'm@beginTransactionScope1.com' ]);
      });
      assert.equal(lastSql, 'insert into `myrds-test-user`(name, email, gmt_create, gmt_modified)\n' +
        `          values('${prefix}beginTransactionScope1', '${prefix}m@beginTransactionScope1.com', now(), now())`);
      assert.equal(lastArgs[0], lastSql);
      assert.equal(lastArgs[1].affectedRows, 1);
      assert.equal(count, 2);

      await db.beginDoomedTransactionScope(async conn => {
        await conn.query(`insert into ??(name, email, gmt_create, gmt_modified)
          values(?, ?, now(), now())`,
        [ table, prefix + 'beginDoomedTransactionScope1', prefix + 'm@beginDoomedTransactionScope1.com' ]);
      });
      assert.equal(lastSql, 'insert into `myrds-test-user`(name, email, gmt_create, gmt_modified)\n' +
        `          values('${prefix}beginDoomedTransactionScope1', '${prefix}m@beginDoomedTransactionScope1.com', now(), now())`);
      assert.equal(lastArgs[0], lastSql);
      assert.equal(lastArgs[1].affectedRows, 1);
      assert.equal(count, 3);

      const conn = await db.getConnection();
      await conn.beginTransaction();
      await conn.query(`insert into ??(name, email, gmt_create, gmt_modified)
        values(?, ?, now(), now())`,
      [ table, prefix + 'transaction1', prefix + 'm@transaction1.com' ]);
      await conn.commit();
      assert.equal(lastSql, 'insert into `myrds-test-user`(name, email, gmt_create, gmt_modified)\n' +
        `        values('${prefix}transaction1', '${prefix}m@transaction1.com', now(), now())`);
      assert.equal(lastArgs[0], lastSql);
      assert.equal(lastArgs[1].affectedRows, 1);
      assert.equal(count, 4);
      assert.equal(counter2Before, 4);
      assert.equal(counter2After, 4);
    });
  });

  describe('PoolWaitTimeout', () => {
    async function longQuery(timeout?: number) {
      await db.beginTransactionScope(async conn => {
        await setTimeout(timeout ?? 1000);
        await conn.query('SELECT 1+1');
      });
    }

    it('should throw error if pool wait timeout', async () => {
      const tasks: Array<Promise<void>> = [];
      for (let i = 0; i < 10; i++) {
        tasks.push(longQuery());
      }
      const tasksPromise = Promise.all(tasks);
      await assert.rejects(async () => {
        await longQuery();
      }, /get connection timeout after/);
      await tasksPromise;
    });

    it('should release conn to pool', async () => {
      const tasks: Array<Promise<void>> = [];
      const timeoutTasks: Array<Promise<void>> = [];
      // 1. fill the pool
      for (let i = 0; i < 10; i++) {
        tasks.push(longQuery());
      }
      // 2. add more conn and wait for timeout
      for (let i = 0; i < 10; i++) {
        timeoutTasks.push(longQuery());
      }
      const [ succeedTasks, failedTasks ] = await Promise.all([
        Promise.allSettled(tasks),
        Promise.allSettled(timeoutTasks),
      ]);
      const succeedCount = succeedTasks.filter(t => t.status === 'fulfilled').length;
      assert.equal(succeedCount, 10);

      const failedCount = failedTasks.filter(t => t.status === 'rejected').length;
      assert.equal(failedCount, 10);

      // 3. after pool empty, create new tasks
      const retryTasks: Array<Promise<void>> = [];
      for (let i = 0; i < 10; i++) {
        retryTasks.push(longQuery());
      }
      await Promise.all(retryTasks);
    });

    it('should not wait too long', async () => {
      const tasks: Array<Promise<void>> = [];
      const timeoutTasks: Array<Promise<void>> = [];
      const fastTasks: Array<Promise<void>> = [];
      const start = performance.now();
      // 1. fill the pool
      for (let i = 0; i < 10; i++) {
        tasks.push(longQuery());
      }
      const tasksPromise = Promise.allSettled(tasks);
      // 2. add more conn and wait for timeout
      for (let i = 0; i < 10; i++) {
        timeoutTasks.push(longQuery());
      }
      const timeoutTasksPromise = Promise.allSettled(timeoutTasks);
      await setTimeout(600);
      // 3. add fast query
      for (let i = 0; i < 10; i++) {
        fastTasks.push(longQuery(1));
      }
      const fastTasksPromise = Promise.allSettled(fastTasks);
      const [ succeedTasks, failedTasks, fastTaskResults ] = await Promise.all([
        tasksPromise,
        timeoutTasksPromise,
        fastTasksPromise,
      ]);
      const duration = performance.now() - start;
      const succeedCount = succeedTasks.filter(t => t.status === 'fulfilled').length;
      assert.equal(succeedCount, 10);

      const failedCount = failedTasks.filter(t => t.status === 'rejected').length;
      assert.equal(failedCount, 10);

      const faskTaskSucceedCount = fastTaskResults.filter(t => t.status === 'fulfilled').length;
      assert.equal(faskTaskSucceedCount, 10);

      // - 10 long queries cost 1000ms
      // - 10 timeout queries should be timeout in long query execution so not cost time
      // - 10 fast queries wait long query to finish, cost 1ms
      // 1000ms + 0ms + 1ms < 1100ms
      assert(duration < 1100);
    });

  });
});
