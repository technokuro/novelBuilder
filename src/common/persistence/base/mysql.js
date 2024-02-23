const waitPort = require('wait-port');
const mysql = require('mysql2');
const logger = require('../../util/log');
const { DB_ERROR } = require('../../definition');

let pool;

module.exports = {
   pool,
   teardown,
   init,
   query,
   update,
   getConnection,
   beginTransaction,
   queryTransaction,
   updateTransaction,
   commitTransaction,
   rollbackTransaction,
   returnOne,
   checkUpdateResult,
};

async function init(host, user, password, database, port, timeout) {

   await waitPort({ host, port, timeout });

   return new Promise((acc, rej) => {
      try {
         pool = mysql.createPool({
            connectionLimit: 10,
            host,
            user,
            password,
            database,
         });
         logger.info(`Connected to mysql db at host ${host} db:${database}`);
         acc();
      } catch (err) {
         logger.error('connection error:' + err);
         rej(err);
      }
   });
}

async function teardown() {
   return new Promise((acc, rej) => {
      pool.end(err => {
         if (err) {
            logger.error('disconnect error:' + err);
            rej(err);
         } else {
            logger.info('disconnect');
            acc();
         }
      });
   });
}

/**
 * Select Query.
 * @param {String} sql
 * @param {Array} params
 * @param {Function} rowsFunction
 * @param {String} logHeader
 */
async function query(sql, params, rowsFunction, logHeader) {
   let result;
   if (typeof rowsFunction === 'funtion') {
      result = await queryTransaction(pool, sql, params, rowsFunction, logHeader);
   } else {
      result = await queryTransaction(pool, sql, params, null, logHeader);
   }
   return result;
}

/**
 * Update Query.
 * @param {String} sql
 * @param {Array} params
 * @param {String} logHeader
 */
async function update(sql, params, logHeader) {
   const result = await updateTransaction(pool, sql, params, logHeader);
   return result;
}

async function getConnection() {
   return new Promise((acc, rej) => {
      pool.getConnection(function (err, connection) {
         if (err) {
            logger.error(`getConnection error: ${err}`);
            rej(err);
         } else {
            acc(connection);
         }
      });
   });
}

async function beginTransaction(connection) {
   return new Promise((acc, rej) => {
      connection.beginTransaction((err) => {
         if (err) {
            logger.error(`beginTran error: ${err}`);
            rej(err);
         } else {
            acc();
         }
      });
   });
}

async function queryTransaction(connection, sql, params, rowsFunction, logHeader) {
   if (!logHeader && rowsFunction && typeof rowsFunction === 'string') {
      logHeader = rowsFunction; //パラメタ４つで指定した場合の対応
   }
   return new Promise((acc, rej) => {
      connection.query(sql, params, (err, rows) => {
         if (err) {
            logger.error(
               `query ${logHeader}`,
               `sql:${sqlLog(sql, params)}`,
               `error:${err}`
            );
            return rej(err);
         } else {
            if (logHeader) {
               logger.debug(
                  `query ${logHeader}`,
                  `sql:${sqlLog(sql, params)}`,
                  `count:${rows ? rows.length : ' is empty'}`
               );
            }
            if (typeof rowsFunction === 'function') {
               try {
                  acc(rowsFunction(rows));
               } catch (_err) {
                  rej(_err);
               }
            } else {
               acc(rows);
            }
         }
      });
   });
}

async function updateTransaction(connection, sql, params, logHeader) {
   return new Promise((acc, rej) => {
      connection.query(sql, params, (err, result, fields) => {
         if (err) {
            logger.error(
               `update [${logHeader}]`,
               `sql:${sqlLog(sql, params)}`,
               `error:${err}`
            );
            return rej(err);
         } else {
            if (logHeader) {
               logger.debug(
                  `update [${logHeader}]`,
                  `sql:${sqlLog(sql, params)}`,
                  `OK:${JSON.stringify(result)}`,
               );
            }
            acc(result);
         }
      });
   });
}

async function commitTransaction(connection) {
   return new Promise((acc, rej) => {
      connection.commit((err) => {
         if (err) {
            logger.error(`commitTran error: ${err}`);
            rej(err);
         } else {
            acc();
         }
         logger.info('commitTran release');
         connection.release();
      });
   });
}

async function rollbackTransaction(connection, err) {
   return new Promise((acc, rej) => {
      connection.rollback((err2) => {
         if (err2) {
            logger.error(`rollbackTran error: ${err2}`);
            rej(err2);
         } else {
            acc(err);
         }
         logger.info('rolback release');
         connection.release();
      });
   });
}


/**
 * 結果値が 1 を想定しているところ、2件以上はエラー、0件は null を返却
 * 配列でなくても null を返却
 * @param {Array} result
 * @param {boolean} isEnableNoRec trueの場合、例外ではなく、null を返却する
 */
function returnOne(result, isEnableNoRec) {
   if (Array.isArray(result)) {
      if (result.length > 1 && !isEnableNoRec) {
         throw new Error('expect result 0 or 1 but 2');
      }
      if (result.length == 1) {
         return result[0];
      }
   }
   return null;
}

/**
 * insert 結果のチェック
 * @param {*} updateResult
 * @param {number} expectCount
 */
function checkUpdateResult(updateResult, expectCount) {
   if (!updateResult) {
      throw DB_ERROR.UNKNOWN;
   }
   if (expectCount) {
      if (updateResult.affectedRows === 0 && expectCount > 0) {
         throw DB_ERROR.NOT_FOUND;
      }
      if (updateResult.affectedRows != expectCount) {
         throw DB_ERROR.UNEXPECTED;
      }
   }
}

/**
 * sql 文字列 ? に params を挿入した文字列に調整
 * @param {string} sql
 * @param {array} params
 */
function sqlLog(sql, params) {
   const splitedSql = sql.split('?');
   // param 考慮なし そのまま返却
   if (!splitedSql || splitedSql.length < 2 || !params || params.length < 1) {
      return sql;
   }
   let result = '';
   for (let index = 0; index < splitedSql.length; index++) {
      // プレースホルダにセットする文字を決定
      let setChar;
      if (params.length <= index) {
         setChar = ''; // params 要素不足 or 最後
      } else if (Array.isArray(params[index])) {
         setChar = `[${params.join(',')}]`;
      } else {
         setChar = params[index];
      }
      result += splitedSql[index] + setChar;
   }
   return result;
}
