const {
  query,
} = require('../../common/persistence/base/mysql');
const util = require('../../common/util/commonUtils');
const { insertTransaction } = require('../../common/persistence/simple');

/** IDからTEST取得 */
exports.getTest = async (id) => {
  const list = await query(
    `SELECT
      *
    FROM
      TEST
    WHERE
      ID = ?
    ORDER BY REG_DATE desc`, [id], null, 'get TEST of id'
  );
  return util.optional(list);
};

/** TEST 登録 */
exports.insertTestTransaction = async (con, name, regUser) => {
  await insertTransaction(con, 'TEST', {
    NAME_TEST: name,
    REG_USER: regUser || 'SYSTEM'
  });
};
