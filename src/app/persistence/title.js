const { query } = require("../../common/persistence/base/mysql");
const util = require("../../common/util/commonUtils");
const { insertTransaction } = require("../../common/persistence/simple");

/** IDからTEST取得 */
exports.getTitles = async () => {
  const list = await query(
    `SELECT
      ID as id,
      TITLE_NAME as titleName,
      OVERVIEW as overview,
      GENRE as genre,
      INSERT_DATE as insertDate,
      UPDATE_DATE as updateDate
    FROM
      TITLE
    ORDER BY INSERT_DATE desc`,
    null,
    null,
    "get TITLE"
  );
  return util.optional(list);
};

/** TEST 登録 */
exports.insertTitle = async (con, titleName, overview, genre) => {
  await insertTransaction(con, "TITLE", {
    TITLE_NAME: titleName,
    OVERVIEW: overview,
    GENRE: genre,
    INSERT_DATE: new Date(),
  });
};
