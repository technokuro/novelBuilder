const { isNotEmptyArray } = require('../util/commonUtils');
const {
    query, update,  checkUpdateResult,
} = require('./base/mysql');
const {
    selectWhenNothingInsert, selectOne, select,
} = require('./simple');

/**
 * 指定されたキーのレコードと、期限が切れたレコードを削除する
 * 期限切れレコードは必ず削除される
 * @param {string} k 未指定ならば、期限切れレコードのみ削除する / 指定されたら、そのキーは強制削除する
 */
const delExpiredAndKey = async (k) => {
    const sql = `DELETE FROM KV WHERE EXPIRE_DATE < NOW() ${!!k ? ' OR K = ?': ''}`;
    const params = [];
    if (!!k) {
        params.push(k);
    }
    await update(sql, params, `delete kv expired ${!!k ? ` and Key = ${k}` : ''}`);
};

/**
 * k 値を取得
 * なければNULL返却
 * @param {array} k
 * @return v
 */
exports.get = async (k) => {
    const db = await query(
        `SELECT
            V
        FROM KV
        WHERE
            K = ?
        AND EXPIRE_DATE > NOW()`
        ,[k], null, `GET K [${k}]`
    );
    return isNotEmptyArray(db) ? db[0]?.V : null;
};

/**
 * 登録.
 */
 exports.save = async (k, v, minute) => {
    // 登録前に削除
    await delExpiredAndKey(k);

    const expireDate = new Date();
    expireDate.setMinutes(expireDate.getMinutes() + minute);
    const insertResult = await update(
        'INSERT INTO KV(K, V, EXPIRE_DATE) VALUES (?, ?, ?)',
        [k, v, expireDate],
        `insert New kv`
    );
    checkUpdateResult(insertResult, 1);
};

/**
 * 有効期限を更新.
 */
exports.updateExpireDate = async (k, minute) => {
    const expireDate = new Date();
    expireDate.setMinutes(expireDate.getMinutes() + minute);
    const updateResult = await update(
        'UPDATE KV SET EXPIRE_DATE = ? WHERE K = ?',
        [expireDate, k],
        `update kv expireDate`
    );
    checkUpdateResult(updateResult, 1);
};

/**
 * キーを削除.
 */
exports.del = async (k) => {
    await delExpiredAndKey(k);
};

/**
 * 複数キーを取得.
 * @param {array} array
 * @returns
 */
exports.getList = async (array) => {
    const db = await query(
        `SELECT
            K,V
        FROM KV
        WHERE
            K IN (?)
        AND EXPIRE_DATE > NOW()`
        ,[array], null, `GET K LIST`
    );
    return isNotEmptyArray(db) ? db : null;
};
