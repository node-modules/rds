# Changelog

## [1.3.0](https://github.com/node-modules/rds/compare/v1.2.2...v1.3.0) (2025-03-09)


### Features

* add custom logging ([#122](https://github.com/node-modules/rds/issues/122)) ([#11](https://github.com/node-modules/rds/issues/11)) ([4b97cb0](https://github.com/node-modules/rds/commit/4b97cb0ad6b63d373edc8acdf1cf0167d8525ffe))

## [1.2.2](https://github.com/node-modules/rds/compare/v1.2.1...v1.2.2) (2025-03-09)


### Bug Fixes

* add missing sqlstring deps ([#10](https://github.com/node-modules/rds/issues/10)) ([7339921](https://github.com/node-modules/rds/commit/733992139f596352408f465676328d201c3299e8))

## [1.2.1](https://github.com/node-modules/rds/compare/v1.2.0...v1.2.1) (2024-09-06)


### Bug Fixes

* fix mysql2 invalid configuration option poolWaitTimeout ([#8](https://github.com/node-modules/rds/issues/8)) ([7293c2e](https://github.com/node-modules/rds/commit/7293c2e9794099c2c7ae6bf773e38498cd2b22d4))

## [1.2.0](https://github.com/node-modules/rds/compare/v1.1.0...v1.2.0) (2024-08-12)


### Features

* impl PoolWaitTimeoutError ([#7](https://github.com/node-modules/rds/issues/7)) ([f42012d](https://github.com/node-modules/rds/commit/f42012d1bf7d0b5ab08643a7a0cfcda0eb958c32))

## [1.1.0](https://github.com/node-modules/rds/compare/v1.0.1...v1.1.0) (2024-04-18)


### Features

* auto use transaction in db.query ([#5](https://github.com/node-modules/rds/issues/5)) ([ba7cd37](https://github.com/node-modules/rds/commit/ba7cd3734ddd26a4f52660815d032c11750c0950))

## [1.0.1](https://github.com/node-modules/rds/compare/v1.0.0...v1.0.1) (2024-03-26)


### Bug Fixes

* exports types ([#3](https://github.com/node-modules/rds/issues/3)) ([66882d6](https://github.com/node-modules/rds/commit/66882d668a8fc80179fc5935d7d6442ba36a96f1))

## 1.0.0 (2024-01-30)


### ⚠ BREAKING CHANGES

* In `Promise.all` case, Parallel beginTransactionScope will create isolated transactions.
* drop Node.js < 16 support

### Features

* add *beginTransactionScope(scope) ([0013a63](https://github.com/node-modules/rds/commit/0013a6395377ab24b9a4a68a509fa2a049f6d720))
* add count(table, where) ([6286c46](https://github.com/node-modules/rds/commit/6286c4696d272fd2b4e1fc80139933360e054ebc))
* add get(), list(), insert(), update() ([9cae1cb](https://github.com/node-modules/rds/commit/9cae1cbc10ce6402cbdf8e272d929a0be5899ff4))
* add options.needFields, default is true ([18e0dea](https://github.com/node-modules/rds/commit/18e0deab80f399e49db36fced6f31aad8ab3d690))
* add queryOne api ([#9](https://github.com/node-modules/rds/issues/9)) ([19fc1bb](https://github.com/node-modules/rds/commit/19fc1bb64d14533e7432f6bc1a729d40080d28a9))
* add Transaction ([cfdcf26](https://github.com/node-modules/rds/commit/cfdcf26cf792ca7b4dab3da1a9b8ced3c6f8899e))
* add unlock/lock tables ([#97](https://github.com/node-modules/rds/issues/97)) ([4dc3452](https://github.com/node-modules/rds/commit/4dc3452a375e0c242084e23c6e5f1cb76f1b647d))
* add unlock/lock tables ([#97](https://github.com/node-modules/rds/issues/97)) ([0a61be6](https://github.com/node-modules/rds/commit/0a61be6048db4df298bfff33c6d23bdcc0119b9a))
* dynamic retrieval of database connection configuration ([#110](https://github.com/node-modules/rds/issues/110)) ([f437efb](https://github.com/node-modules/rds/commit/f437efb439c1770561c1d4dc79318c632e7321d9))
* export connection and query diagnostics_channel ([#111](https://github.com/node-modules/rds/issues/111)) ([64aa75d](https://github.com/node-modules/rds/commit/64aa75d121d63ddae4fa4bd2a6e097773f280dfe))
* export sqlstring method ([#79](https://github.com/node-modules/rds/issues/79)) ([2e99ab8](https://github.com/node-modules/rds/commit/2e99ab8ce872b8482fe2b0a29af51a7a99aaff84))
* impl with typescript ([#103](https://github.com/node-modules/rds/issues/103)) ([1cf7814](https://github.com/node-modules/rds/commit/1cf7814effb2876919e73d331547ecd14caf45f4))
* promiseify ([#20](https://github.com/node-modules/rds/issues/20)) ([e4aed30](https://github.com/node-modules/rds/commit/e4aed300183bd511b9b57412b1e2cd7f5bb0cef8))
* stats 增加使用中的连接数 ([#115](https://github.com/node-modules/rds/issues/115)) ([2b152a1](https://github.com/node-modules/rds/commit/2b152a14b39291665c74910f2fe803d8318843db))
* support custom query lifecricle ([#104](https://github.com/node-modules/rds/issues/104)) ([5941c69](https://github.com/node-modules/rds/commit/5941c69b461ad581aa88c211ee6c60a88d4f5420))
* support doomed transaction scope on test cases ([#58](https://github.com/node-modules/rds/issues/58)) ([b227bc1](https://github.com/node-modules/rds/commit/b227bc12e5c6252264d4761b72f915b73d53c688))
* support end() ([b3eab93](https://github.com/node-modules/rds/commit/b3eab93ac7ca5c9fab361765a97c858830de6f63))
* support insert multi rows ([abb4804](https://github.com/node-modules/rds/commit/abb4804f91af4a963ee14a00242cf815c7170ecb))
* support mysql2 ([#1](https://github.com/node-modules/rds/issues/1)) ([eb9f391](https://github.com/node-modules/rds/commit/eb9f3919a90bf088c8591e78563496790fefb361))
* support query(sql, object) ([#12](https://github.com/node-modules/rds/issues/12)) ([a55e82f](https://github.com/node-modules/rds/commit/a55e82fabc1a80031a8787425939ec62bd70d52d))
* support transaction on one request ctx ([#7](https://github.com/node-modules/rds/issues/7)) ([3bd4e44](https://github.com/node-modules/rds/commit/3bd4e44bc2b4e5297d9d3df2be04b4342b61e92d))
* update multiple rows ([#55](https://github.com/node-modules/rds/issues/55)) ([859d818](https://github.com/node-modules/rds/commit/859d818d7e327d1ff590d363dfbf3135d8c90454))
* use AsyncLocalStorage to refactor transaction, to make it more safe ([#108](https://github.com/node-modules/rds/issues/108)) ([ae327fa](https://github.com/node-modules/rds/commit/ae327fa5a350b48c4e1f56c2769524c5786e1152))
* where condition support NULL value ([#60](https://github.com/node-modules/rds/issues/60)) ([0d4d4ab](https://github.com/node-modules/rds/commit/0d4d4ab99a7cd655180f22d4d95e3cfef8c8714b))
* wrap generator function to promise ([#19](https://github.com/node-modules/rds/issues/19)) ([fe1b4a3](https://github.com/node-modules/rds/commit/fe1b4a38d761468baf54aa0638d013eaeb842dd2))


### Bug Fixes

* `where` with empty object ([#15](https://github.com/node-modules/rds/issues/15)) ([db0b90e](https://github.com/node-modules/rds/commit/db0b90ecc48b7c3ea3cf77fd2102efc128009749))
* add default value now() of `gmt_modified` and `gmt_create` ([#56](https://github.com/node-modules/rds/issues/56)) ([db6d596](https://github.com/node-modules/rds/commit/db6d59616f4b5083142bed554fb104c1b5a7c14e))
* don't export protected methods ([#106](https://github.com/node-modules/rds/issues/106)) ([b2757df](https://github.com/node-modules/rds/commit/b2757dffdf76bb74e9fff8a89632d19704b03e4f))
* don't redefined sqlstring.escape ([#39](https://github.com/node-modules/rds/issues/39)) ([5ca4489](https://github.com/node-modules/rds/commit/5ca4489b903923302c81a8c9c8ac94c0afbce819))
* export pool getter from rds client ([#102](https://github.com/node-modules/rds/issues/102)) ([4048807](https://github.com/node-modules/rds/commit/40488070b8bbae853a75ebe7d82a6cff6c8d071d))
* handle concurrent transaction ([#85](https://github.com/node-modules/rds/issues/85)) ([d983478](https://github.com/node-modules/rds/commit/d983478d40203357c71187c94f44ef3afab0b604))
* move sql to error stack ([#8](https://github.com/node-modules/rds/issues/8)) ([54349cd](https://github.com/node-modules/rds/commit/54349cd0ccaf504387e1bc9a0349dd101af32970))
* mysql type not found ([#109](https://github.com/node-modules/rds/issues/109)) ([6a9bc45](https://github.com/node-modules/rds/commit/6a9bc452a8a73f9d697ee0e55f91b823ef153df4))
* query parameters are not allowed to be included in where ([#67](https://github.com/node-modules/rds/issues/67)) ([52147de](https://github.com/node-modules/rds/commit/52147de9d7405b02efcf84ef28a11a4097675972))
* should export conn property ([#101](https://github.com/node-modules/rds/issues/101)) ([37afa42](https://github.com/node-modules/rds/commit/37afa420f3330cbc7a5e6e68da88086339a2a955))
* support multi lifecricle hooks ([#105](https://github.com/node-modules/rds/issues/105)) ([53b0a70](https://github.com/node-modules/rds/commit/53b0a7058e4f3e583dc4610b1d1338014b9f2c15))
* use master branch ([758877d](https://github.com/node-modules/rds/commit/758877d9e01df74b9df12c65b7f625275996656b))

## [6.3.0](https://github.com/node-modules/rds/v6.2.0...v6.3.0) (2023-07-31)


### Features

* stats 增加使用中的连接数 ([#115](https://github.com/node-modules/rds/issues/115)) ([2b152a1](https://github.com/node-modules/rds/commit/2b152a14b39291665c74910f2fe803d8318843db))

## [6.2.0](https://github.com/node-modules/rds/v6.1.0...v6.2.0) (2023-06-10)


### Features

* export connection and query diagnostics_channel ([#111](https://github.com/node-modules/rds/issues/111)) ([64aa75d](https://github.com/node-modules/rds/commit/64aa75d121d63ddae4fa4bd2a6e097773f280dfe))

## [6.1.0](https://github.com/node-modules/rds/v6.0.1...v6.1.0) (2023-06-09)


### Features

* dynamic retrieval of database connection configuration ([#110](https://github.com/node-modules/rds/issues/110)) ([f437efb](https://github.com/node-modules/rds/commit/f437efb439c1770561c1d4dc79318c632e7321d9))

## [6.0.1](https://github.com/node-modules/rds/v6.0.0...v6.0.1) (2023-06-05)


### Bug Fixes

* mysql type not found ([#109](https://github.com/node-modules/rds/issues/109)) ([6a9bc45](https://github.com/node-modules/rds/commit/6a9bc452a8a73f9d697ee0e55f91b823ef153df4))

## [6.0.0](https://github.com/node-modules/rds/v5.1.2...v6.0.0) (2023-06-03)


### ⚠ BREAKING CHANGES

* In `Promise.all` case, Parallel beginTransactionScope will create isolated transactions.

### Features

* use AsyncLocalStorage to refactor transaction, to make it more safe ([#108](https://github.com/node-modules/rds/issues/108)) ([ae327fa](https://github.com/node-modules/rds/commit/ae327fa5a350b48c4e1f56c2769524c5786e1152))


### Bug Fixes

* use master branch ([758877d](https://github.com/node-modules/rds/commit/758877d9e01df74b9df12c65b7f625275996656b))

## [5.1.2](https://github.com/node-modules/rds/v5.1.1...v5.1.2) (2023-03-06)


### Bug Fixes

* don't export protected methods ([#106](https://github.com/node-modules/rds/issues/106)) ([b2757df](https://github.com/node-modules/rds/commit/b2757dffdf76bb74e9fff8a89632d19704b03e4f))

## [5.1.1](https://github.com/node-modules/rds/v5.1.0...v5.1.1) (2023-03-05)


### Bug Fixes

* support multi lifecircle hooks ([#105](https://github.com/node-modules/rds/issues/105)) ([53b0a70](https://github.com/node-modules/rds/commit/53b0a7058e4f3e583dc4610b1d1338014b9f2c15))

## [5.1.0](https://github.com/node-modules/rds/v5.0.0...v5.1.0) (2023-03-05)


### Features

* support custom query lifecircle ([#104](https://github.com/node-modules/rds/issues/104)) ([5941c69](https://github.com/node-modules/rds/commit/5941c69b461ad581aa88c211ee6c60a88d4f5420))

## [5.0.0](https://github.com/node-modules/rds/v4.1.0...v5.0.0) (2023-03-04)


### ⚠ BREAKING CHANGES

* drop Node.js < 16 support

### Features

* impl with typescript ([#103](https://github.com/node-modules/rds/issues/103)) ([1cf7814](https://github.com/node-modules/rds/commit/1cf7814effb2876919e73d331547ecd14caf45f4))

## [4.1.0](https://github.com/node-modules/rds/v4.0.3...v4.1.0) (2023-01-01)


### Features

* add unlock/lock tables ([#97](https://github.com/node-modules/rds/issues/97)) ([4dc3452](https://github.com/node-modules/rds/commit/4dc3452a375e0c242084e23c6e5f1cb76f1b647d))
* add unlock/lock tables ([#97](https://github.com/node-modules/rds/issues/97)) ([0a61be6](https://github.com/node-modules/rds/commit/0a61be6048db4df298bfff33c6d23bdcc0119b9a))

## [4.0.3](https://github.com/node-modules/rds/v4.0.2...v4.0.3) (2022-12-22)


### Bug Fixes

* export pool getter from rds client ([#102](https://github.com/node-modules/rds/issues/102)) ([4048807](https://github.com/node-modules/rds/commit/40488070b8bbae853a75ebe7d82a6cff6c8d071d))

## [4.0.2](https://github.com/node-modules/rds/v4.0.1...v4.0.2) (2022-12-22)


### Bug Fixes

* should export conn property ([#101](https://github.com/node-modules/rds/issues/101)) ([37afa42](https://github.com/node-modules/rds/commit/37afa420f3330cbc7a5e6e68da88086339a2a955))

---

4.0.1 / 2022-12-14
==================

**fixes**
  * [[`add4669`](http://github.com/node-modules/rds/commit/add466917422b15deddd434c25595b6f6082bb6b)] - 🐛 FIX: Export db pool stats (#95) (fengmk2 <<fengmk2@gmail.com>>)

4.0.0 / 2022-12-14
==================

**features**
  * [[`6296b5b`](http://github.com/node-modules/rds/commit/6296b5b1a0e08bf88097937a0b579a4c90b13a2d)] - 📦 NEW: [BREAKING] Refactor impl base on async/await (#94) (fengmk2 <<fengmk2@gmail.com>>)

3.4.1 / 2022-12-13
==================

**fixes**
  * [[`d983478`](http://github.com/node-modules/rds/commit/d983478d40203357c71187c94f44ef3afab0b604)] - fix: handle concurrent transaction (#85) (killa <<killa123@126.com>>)

**others**
  * [[`61e8e38`](http://github.com/node-modules/rds/commit/61e8e38208acf4a9cc1780128063318f7f0e17ac)] - Create codeql.yml (fengmk2 <<fengmk2@gmail.com>>)

3.4.0 / 2020-07-16
==================

**features**
  * [[`2e99ab8`](http://github.com/node-modules/rds/commit/2e99ab8ce872b8482fe2b0a29af51a7a99aaff84)] - feat: export sqlstring method (#79) (Haoliang Gao <<sakura9515@gmail.com>>)

3.3.1 / 2019-04-24
==================

**fixes**
  * [[`52147de`](git@github.com:node-modules/rds/commit/52147de9d7405b02efcf84ef28a11a4097675972)] - fix: query parameters are not allowed to be included in where (#67) (Hoyt <<hoythan@gmail.com>>)

**others**
  * [[`0f9f23b`](git@github.com:node-modules/rds/commit/0f9f23bbd935650a1440537b18aaa982a6db2d44)] - chore: remove node 4 in ci (dead-horse <<dead_horse@qq.com>>)

3.3.0 / 2018-12-11
==================

**features**
  * [[`0d4d4ab`](http://github.com/node-modules/rds/commit/0d4d4ab99a7cd655180f22d4d95e3cfef8c8714b)] - feat: where condition support NULL value (#60) (fengmk2 <<fengmk2@gmail.com>>)

3.2.0 / 2018-11-19
==================

**features**
  * [[`b227bc1`](http://github.com/node-modules/rds/commit/b227bc12e5c6252264d4761b72f915b73d53c688)] - feat: support doomed transaction scope on test cases (#58) (AngrySean <<xujihui1985@gmail.com>>)

3.1.0 / 2018-09-30
==================

**features**
  * [[`859d818`](http://github.com/node-modules/rds/commit/859d818d7e327d1ff590d363dfbf3135d8c90454)] - feat: update multiple rows (#55) (Hang Jiang <<jianghangscu@gmail.com>>)

**fixes**
  * [[`db6d596`](http://github.com/node-modules/rds/commit/db6d59616f4b5083142bed554fb104c1b5a7c14e)] - fix: add default value now() of `gmt_modified` and `gmt_create` (#56) (Hang Jiang <<jianghangscu@gmail.com>>)

**others**
  * [[`db3524c`](http://github.com/node-modules/rds/commit/db3524c8da7f8b32291695a2fc5497ea8fddd155)] - doc: add object arguments in readme (#52) (凯 方 <<fkvsssl@126.com>>)

3.0.1 / 2017-09-26
==================

**fixes**
  * [[`5ca4489`](http://github.com/node-modules/rds/commit/5ca4489b903923302c81a8c9c8ac94c0afbce819)] - fix: don't redefined sqlstring.escape (#39) (Yiyu He <<dead_horse@qq.com>>)

**others**
  * [[`004713c`](http://github.com/node-modules/rds/commit/004713cf9a4aa2da84a9f02348996b1a8ec82430)] - doc: fix typo 'Can\'t not' => 'Can not' (#34) (dreamswhite <<dreamswhite@aliyun.com>>)

3.0.0 / 2017-04-02
==================

  * feat: promiseify (#20)

2.7.0 / 2017-03-31
==================

  * feat: wrap generator function to promise (#19)

2.6.1 / 2017-01-20
==================

  * fix: `where` with empty object (#15)

2.6.0 / 2016-08-09
==================

  * feat: support query(sql, object) (#12)
  * test: use travis ci local mysql server (#13)

2.5.0 / 2016-06-07
==================

  * feat: support end()

2.4.0 / 2016-06-07
==================

  * feat: add queryOne api (#9)

2.3.1 / 2016-06-02
==================

  * fix: move sql to error stack (#8)

2.3.0 / 2016-05-15
==================

  * feat: support transaction on one request ctx (#7)

2.2.0 / 2016-01-13
==================

  * deps: mysql@2.10.2

2.1.0 / 2015-06-08
==================

 * feat: add *beginTransactionScope(scope)
 * docs: require myrds

2.0.0 / 2015-06-08
==================

 * test: only test on iojs-2
 * feat: add count(table, where)
 * refactor: use const and let instead of var
 * feat: add Transaction
 * feat: support insert multi rows
 * break: remove fields property from result
 * refactor: use options params style
 * feat: add get(), list(), insert(), update()

1.1.0 / 2015-06-02
==================

 * test: improve test coverage
 * test: make sure name prefix is different
 * feat: add options.needFields, default is true

1.0.0 / 2015-02-25
==================

 * first release, only support MySQL
