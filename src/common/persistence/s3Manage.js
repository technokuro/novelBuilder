const { DB_ERROR } = require('../definition');
const { isNotEmptyArray, isNotEmpty } = require('../util/commonUtils');
const { logger } = require('../util/log');
const {
    query, update, updateTransaction, checkUpdateResult, returnOne,
} = require('./base/mysql');
const {
    selectWhenNothingInsert, selectOne, select,
} = require('./simple');

/**
 * s3 manage から値を取得
 * なければNULL返却
 * @param {array} s3Keis
 * @return json array
 *  key: s3Key
 *  url: url
 *  expireDate: 有効期限
 */
exports.getListAndDelExpired = async (s3Keis) => {
    const db = await query(
        `SELECT
            S3_KEY,
            URL,
            EXPIRE_DATE
        FROM S3_URL_MANAGE
        WHERE
            DEL_DATE IS NULL
        AND S3_KEY IN (?)`
        ,[s3Keis], null, 'GET S3 MANAGE RECS'
    );
    // 期限有効なものと、期限切れなものを選別
    // 期限有効なもののみ返却、期限切れはあれば delete する
    const ret = [];
    const expiredKeis = [];
    const now = Date.now();
    for (let rec of db) {
        const expireDate = rec.EXPIRE_DATE.getTime();
        if (expireDate <= now) {
            expiredKeis.push(rec.S3_KEY);
        } else {
            ret.push({
                key: rec.S3_KEY,
                url: rec.URL,
                expireDate,
            });
        }
    }
    // expired があれば削除
    if (isNotEmptyArray(expiredKeis)) {
        await update(
            'DELETE FROM S3_URL_MANAGE WHERE S3_KEY IN (?)',
            [expiredKeis],
            `delete s3_url_manage expired s3Keies: ${expiredKeis}`
        );
    }
    return ret;
};

exports.del = async (s3Key) => {
    await update(
        'DELETE FROM S3_URL_MANAGE WHERE S3_KEY = ?',
        [s3Key],
        `delete s3_url_manage replace s3Keies: ${s3Key}`
    );
};

/**
 * s3_url_manage を登録.
 * キーを消してから登録
 */
 exports.saveNew = async (s3Key, url, expireDate) => {
    this.del(s3Key);
    const insertResult = await update(
        'INSERT INTO S3_URL_MANAGE(S3_KEY, URL, EXPIRE_DATE) VALUES (?, ?, ?)',
        [s3Key, url, expireDate],
        `insert New s3_url_manage s3Key: ${s3Key}`
    );
    checkUpdateResult(insertResult, 1);
    return insertResult.insertId;
};

/**
 * s3_url_manage を登録.
 * キーを消してから登録
 */
exports.saveNewTrunsaction = async (connection, s3Key, url, expireDate) => {
    await updateTransaction(
        connection,
        'DELETE FROM S3_URL_MANAGE WHERE S3_KEY = ?',
        [s3Key],
        `delete s3_url_manage replace s3Keies: ${s3Key}`
    );
    const insertResult = await updateTransaction(
        connection,
        'INSERT INTO S3_URL_MANAGE(S3_KEY, URL, EXPIRE_DATE) VALUES (?, ?, ?)',
        [s3Key, url, expireDate],
        `insert New s3_url_manage s3Key: ${s3Key}`
    );
    checkUpdateResult(insertResult, 1);
    return insertResult.insertId;
};
