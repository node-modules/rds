# @eggjs/rds

[![NPM version][npm-image]][npm-url]
[![Node.js CI](https://github.com/node-modules/rds/actions/workflows/nodejs.yml/badge.svg)](https://github.com/node-modules/rds/actions/workflows/nodejs.yml)
[![Test coverage][codecov-image]][codecov-url]
[![npm download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/@eggjs/rds.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@eggjs/rds
[codecov-image]: https://codecov.io/github/node-modules/rds/coverage.svg?branch=master
[codecov-url]: https://codecov.io/github/node-modules/rds?branch=master
[download-image]: https://img.shields.io/npm/dm/@eggjs/rds.svg?style=flat-square
[download-url]: https://npmjs.org/package/@eggjs/rds

A RDS client.
RDS, Relational Database Service. Equal to well know Amazon [RDS](http://aws.amazon.com/rds/).

Support `MySQL` protocol only.

## Usage

### Create RDS instance

```ts
import { RDSClient } from '@eggjs/rds';

const db = new RDSClient({
  host: 'your-rds-address.mysql.rds.aliyuncs.com',
  port: 3306,
  user: 'your-username',
  password: 'your-password',
  database: 'your-database-name',
  // optional params
  // The charset for the connection.
  // This is called "collation" in the SQL-level of MySQL (like utf8_general_ci).
  // If a SQL-level charset is specified (like utf8mb4)
  // then the default collation for that charset is used. (Default: 'UTF8_GENERAL_CI')
  // charset: 'utf8_general_ci',
  //
  // The maximum number of connections to create at once. (Default: 10)
  // connectionLimit: 10,
  //
  // The maximum number of connection requests the pool will queue
  // before returning an error from getConnection.
  // If set to 0, there is no limit to the number of queued connection requests. (Default: 0)
  // queueLimit: 0,
  // Set asyncLocalStorage manually for transaction
  // connectionStorage: new AsyncLocalStorage(),
  // If create multiple RDSClient instances with the same connectionStorage, use this key to distinguish between the instances
  // connectionStorageKey: 'datasource',
  
  // The timeout for connecting to the MySQL server. (Default: 500 milliseconds)
  // connectTimeout: 500,

  // The timeout for waiting for a connection from the connection pool. (Default: 500 milliseconds)
  // So max timeout for get a connection is (connectTimeout + poolWaitTimeout)
  // poolWaitTimeout: 500,
});
```

### Insert

- Insert one row

```js
const row = {
  name: 'fengmk2',
  otherField: 'other field value',
  createdAt: db.literals.now, // `now()` on db server
  // ...
};
const result = await db.insert('table-name', row);
console.log(result);
{ fieldCount: 0,
  affectedRows: 1,
  insertId: 3710,
  serverStatus: 2,
  warningCount: 2,
  message: '',
  protocol41: true,
  changedRows: 0 }
```

- Insert multi rows

Will execute under a transaction and auto commit.

```js
const rows = [
  {
    name: 'fengmk1',
    otherField: 'other field value',
    createdAt: db.literals.now, // `now()` on db server
    // ...
  },
  {
    name: 'fengmk2',
    otherField: 'other field value',
    createdAt: db.literals.now, // `now()` on db server
    // ...
  },
  // ...
];

const results = await db.insert('table-name', rows);
console.log(result);
{ fieldCount: 0,
  affectedRows: 2,
  insertId: 3840,
  serverStatus: 2,
  warningCount: 2,
  message: '&Records: 2  Duplicates: 0  Warnings: 0',
  protocol41: true,
  changedRows: 0 }
```

### Update

- Update a row with primary key: `id`

```js
const row = {
  id: 123,
  name: 'fengmk2',
  otherField: 'other field value',
  modifiedAt: db.literals.now, // `now()` on db server
};
const result = await db.update('table-name', row);
console.log(result);
{ fieldCount: 0,
  affectedRows: 1,
  insertId: 0,
  serverStatus: 2,
  warningCount: 0,
  message: '(Rows matched: 1  Changed: 1  Warnings: 0',
  protocol41: true,
  changedRows: 1 }
```

- Update a row with `options.where` and `options.columns`

```js
const row = {
  name: 'fengmk2',
  otherField: 'other field value',
  modifiedAt: db.literals.now, // `now()` on db server
};
const result = await db.update('table-name', row, {
  where: { name: row.name },
  columns: [ 'otherField', 'modifiedAt' ]
});
console.log(result);
{ fieldCount: 0,
  affectedRows: 1,
  insertId: 0,
  serverStatus: 2,
  warningCount: 0,
  message: '(Rows matched: 1  Changed: 1  Warnings: 0',
  protocol41: true,
  changedRows: 1 }
```

### Update multiple rows

- Update multiple rows with primary key: `id`

```js
const options = [{
  id: 123,
  name: 'fengmk2',
  email: 'm@fengmk2.com',
  otherField: 'other field value',
  modifiedAt: db.literals.now, // `now()` on db server
}, {
   id: 124,
  name: 'fengmk2_2',
  email: 'm@fengmk2_2.com',
  otherField: 'other field value 2',
  modifiedAt: db.literals.now, // `now()` on db server
}]
const result = await db.updateRows('table-name', options);
console.log(result);
{ fieldCount: 0,
  affectedRows: 2,
  insertId: 0,
  serverStatus: 2,
  warningCount: 0,
  message: '(Rows matched: 2  Changed: 2  Warnings: 0',
  protocol41: true,
  changedRows: 2 }
```

- Update multiple rows with `row` and `where` properties

```js
const options = [{
  row: {
    email: 'm@fengmk2.com',
    otherField: 'other field value',
    modifiedAt: db.literals.now, // `now()` on db server
  },
  where: {
    id: 123,
    name: 'fengmk2',
  }
}, {
  row: {
    email: 'm@fengmk2_2.com',
    otherField: 'other field value2',
    modifiedAt: db.literals.now, // `now()` on db server
  }, 
  where: {
    id: 124,
    name: 'fengmk2_2',
  }
}]
const result = await db.updateRows('table-name', options);
console.log(result);
{ fieldCount: 0,
  affectedRows: 2,
  insertId: 0,
  serverStatus: 2,
  warningCount: 0,
  message: '(Rows matched: 2  Changed: 2  Warnings: 0',
  protocol41: true,
  changedRows: 2 }
```

### Get

- Get a row

```js
const row = await db.get('table-name', { name: 'fengmk2' });

=> SELECT * FROM `table-name` WHERE `name` = 'fengmk2'
```

### Select

- Select all rows

```js
const rows = await db.select('table-name');

=> SELECT * FROM `table-name`
```

- Select rows with condition

```js
const rows = await db.select('table-name', {
  where: {
    type: 'javascript'
  },
  columns: ['author', 'title'],
  orders: [['id', 'desc']]
});

=> SELECT `author`, `title` FROM `table-name`
 WHERE `type` = 'javascript' ORDER BY `id` DESC
```

### Delete

- Delete with condition

```js
const result = await db.delete('table-name', {
  name: 'fengmk2'
});

=> DELETE FROM `table-name` WHERE `name` = 'fengmk2'
```

### Count

- Get count from a table with condition

```js
const count = await db.count('table-name', {
  type: 'javascript'
});

=> SELECT COUNT(*) AS count FROM `table-name` WHERE `type` = 'javascript';
```

### Transactions

beginTransaction, commit or rollback

```js
const tran = await db.beginTransaction();

try {
  await tran.insert(table, row1);
  await tran.update(table, row2);
  await tran.commit();
} catch (err) {
  // error, rollback
  await tran.rollback(); // rollback call won't throw err
  throw err;
}
```

#### Transaction with scope

API: `async beginTransactionScope(scope)`

All query run in scope will under a same transaction.
We will auto commit or rollback for you.

```js
const result = await db.beginTransactionScope(async conn => {
  // don't commit or rollback by yourself
  await conn.insert(table, row1);
  await conn.update(table, row2);
  return { success: true };
});
// if error throw on scope, will auto rollback
```

In `Promise.all` case, Parallel beginTransactionScope will create isolated transactions.

```js
const result = await Promise.all([
  db.beginTransactionScope(async conn => {
    // commit and success
  }),
  db.beginTransactionScope(async conn => {
    // throw err and rollback
  }),
])
```

### Raw Queries

- Query without arguments

```js
const rows = await db.query('SELECT * FROM your_table LIMIT 100');
console.log(rows);
```

- Query with array arguments

```js
const rows = await db.query('SELECT * FROM your_table WHERE id=?', [ 123 ]);
console.log(rows);
```

- Query with object arguments

```js
const rows = await db.query('SELECT * FROM your_table WHERE id=:id', { id: 123 });
console.log(rows);
```

### Custom query lifecircle

```ts
db.beforeQuery((sql: string) => {
  // change sql string
  return `/* add custom format here */ ${sql}`;
});

db.afterQuery((sql: string, result: any, execDuration: number, err?: Error) => {
  // handle logger here
});
```

## APIs

- `*` Meaning this function is yieldable.

### IO queries

- async query(sql[, values)
- async queryOne(sql[, values)
- async select(table, options)
- async get(table, where, options)
- async insert(table, row[s], options)
- async update(table, row, options)
- async updateRows(table, options)
- async delete(table, where)
- async count(table, where)

### Transactions Helpers

- async beginTransaction()
- async beginTransactionScope(scope)

### Utils

- escape(value, stringifyObjects, timeZone)
- escapeId(value, forbidQualified)
- format(sql, values, stringifyObjects, timeZone)

### Literals

```js
await db.insert('user', {
  name: 'fengmk2',
  createdAt: db.literals.now,
});

=>

INSERT INTO `user` SET `name` = 'fengmk2', `createdAt` = now()
```

#### Custom Literal

```js
const session = new db.literals.Literal('session()');
```

## Class Relation

```txt
+-----------+                          +----------------+
| RDSClient +-- beginTransaction() --> + RDSTransaction |
+--+----+---+                          +----+----+------+
   |    | getConnection()            .conn  |    |
   |    |         +---------------+         |    |
   |    +-------->+ RDSConnection +<--------+    |
   |              +-------+-------+              |
   |                      | extends              |
   |                      v                      |
   |   extends    +-------+-------+    extends   |
   +------------->+   Operator    +<-------------+
                  |    query()    |
                  +---------------+
```

## For the local dev

Run docker compose to start test mysql service

```bash
docker compose -f docker-compose.yml up -d
# if you run the first time, should wait for ~20s to let mysql service init started
```

Run the unit tests

```bash
npm test
```

Stop test mysql service

```bash
docker compose -f docker-compose.yml down
```

## License

[MIT](LICENSE)

## Contributors

[![Contributors](https://contrib.rocks/image?repo=node-modules/rds)](https://github.com/node-modules/rds/graphs/contributors)

Made with [contributors-img](https://contrib.rocks).
