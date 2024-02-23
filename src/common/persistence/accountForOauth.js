const {
    query,
    update,
    returnOne,
    checkUpdateResult,
} = require('./base/mysql');
const { DB_ERROR } = require('../definition');

/**
 * メールとハッシュからアカウントを返却
 * Google OAUTH用
 */
exports.selectAccountByMailForOauthGoogle = async (gmail) => {
    const result = await query(
        `SELECT
            accountNo,
            gmail as mail,
            activate,
            regDate,
            updDate
        FROM
            account
        WHERE
            gmail = ? AND
            hash IS NULL
            AND isOauthFlg = ?`,
        [gmail, '1'], null, 'selectAccountByMailForOauthGoogle'
    );
    return returnOne(result);
};

/**
 * アカウントを登録.
 * Google OAUTH用
 */
exports.insertNewAccountForOauthGoogle = async (gmail) => {
    try {
        const insertResult = await update(
            `INSERT INTO account(
                mail, hash, passwordResetId, isOauthFlg, activate, gmail
            ) VALUES (?, NULL, NULL, ?, ?, ?)`,
            [gmail, '1', '1', gmail], 'insertNewAccountForOauthGoogle'
        );
        checkUpdateResult(insertResult, 1);
        return insertResult.insertId;
    } catch (err) {
        throw DB_ERROR.is(err);
    }
};
