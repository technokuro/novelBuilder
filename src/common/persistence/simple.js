const {
    query,
    update,
    returnOne,
    checkUpdateResult,
    updateTransaction,
    queryTransaction,
    getConnection: getConectionSuper,
    beginTransaction: beginTransactionSuper,
    commitTransaction: commitTransactionSuper,
    rollbackTransaction: rollbackTransactionSuper,
} = require('./base/mysql');
const { DB_ERROR } = require('../definition');
const { isNotEmptyArray, isNotEmpty } = require('../util/commonUtils');
const { logger } = require('../util/log');

/**
 * コネクションを得る
 * @returns Connection
 */
exports.getConnection = async () => {
    return await getConectionSuper();
}

/**
 * トランザクション開始
 * @param {Connection} connection
 */
exports.beginTransaction = async (connection) => {
    return await beginTransactionSuper(connection);
}

/**
 * トランザクションコミット
 * @param {Connection} connection
 */
exports.commitTransaction = async (connection) => {
    return await commitTransactionSuper(connection);
}

/**
 * トランザクションロールバック
 * @param {Connection} connection
 */
exports.rollbackTransaction = async (connection) => {
    return await rollbackTransactionSuper(connection);
}

/**
 * テーブルを全カラム取得（実態）
 * @param {string} table
 * @param {JSON} whereJson
 * @returns Array
 */
const selectMain = async (table, whereJson) => {
    return await selectMainTransaction(null, table, whereJson);
}

/**
 * テーブルを全カラム取得（トランザクション）
 * @param {Connection} connection
 * @param {string} table
 * @param {JSON} whereJson
 * @returns Array
 */
const selectMainTransaction = async (connection, table, whereJson) => {
    const where = Object.keys(whereJson).map((k) => {
        if (whereJson[k] == null) {
            return `\`${k}\` IS NULL`;
        }
        if (Array.isArray(whereJson[k])) {
            return `\`${k}\` IN (?)`;
        }
        return `\`${k}\` = ?`;
    }).join(' AND ');
    const values = Object.keys(whereJson).filter((k) => whereJson[k] != null).map((k) => whereJson[k]);
    const sql = `SELECT * FROM \`${table}\` WHERE ${where}`;
    const result = connection
        ? await queryTransaction(connection, sql, values, null, `selectSimple ${table}`)
        : await query(sql, values, null, `selectSimple ${table}`);
    return result;
};

/**
 * テーブルを全カラム取得
 * @param {string} table
 * @param {JSON} whereJson
 * @returns Array
 */
exports.select = async (table, whereJson) => {
    return await selectMain(table, whereJson);
}

/**
 * テーブルを全カラム取得（トランザクション）
 * @param {Connection} connection
 * @param {string} table
 * @param {JSON} whereJson
 * @returns Array
 */
exports.selectTransaction = async (connection, table, whereJson) => {
    return await selectMainTransaction(connection, table, whereJson);
}

/**
 * テーブルを全カラム取得（１件取得を要求）
 * 0件の場合、isEnableNoRec が false の場合、例外とする
 * @param {string} table
 * @param {JSON} whereJson
 * @param {boolean} isEnableNoRec true:0件でも例外としない
 * @returns JSON
 */
exports.selectOne = async (table, whereJson, isEnableNoRec) => {
    return returnOne(await selectMain(table, whereJson), isEnableNoRec);
};

/**
 * テーブルを全カラム取得（１件取得を要求：トランザクション）
 * 0件の場合、isEnableNoRec が false の場合、例外とする
 * @param {Connection} connection
 * @param {string} table
 * @param {JSON} whereJson
 * @param {boolean} isEnableNoRec true:0件でも例外としない
 * @returns JSON
 */
exports.selectOneTransaction = async (connection, table, whereJson, isEnableNoRec) => {
    return returnOne(await selectMainTransaction(connection, table, whereJson), isEnableNoRec);
};

/**
 * レコードの存在を得る
 * @param {string} table
 * @param {JSON} whereJson
 * @returns boolean
 */
exports.isExists = async (table, whereJson) => {
    return await this.isExistsTrunsaction(null, table, whereJson);
}

/**
 * レコードの存在を得る（トランザクション）
 * @param {Connection} connection
 * @param {string} table
 * @param {JSON} whereJson
 * @returns boolean
 */
exports.isExistsTrunsaction = async (connection, table, whereJson) => {
    const where = Object.keys(whereJson).map((k) => {
        if (whereJson[k] == null) {
            return `\`${k}\` IS NULL`;
        }
        return `${k} = ?`;
    }).join(' AND ');
    const values = Object.keys(whereJson).filter((k) => whereJson[k] != null).map((k) => whereJson[k]);
    const sql = `SELECT EXISTS(SELECT * FROM \`${table}\` WHERE ${where}) as isExists`;
    const result = connection
        ? await queryTransaction(connection, sql, values, null, `isExists Simple ${table}`)
        : await query(sql, values, null, `isExists Simple ${table}`);
    return result[0]?.isExists === 1;
};

/**
 * insert
 * @param {string} table
 * @param {JSON} valuesJson
 * @returns PK
 */
exports.insert = async (table, valuesJson) => {
    return await this.insertTransaction(null, table, valuesJson);
};

/**
 * insert（トランザクション）
 * @param {Connection} connection
 * @param {string} table
 * @param {JSON} valuesJson
 * @returns PK
 */
exports.insertTransaction = async (connection, table, valuesJson) => {
    try {
        const hasValueKeyList = Object.keys(valuesJson).filter((v) => isNotEmpty(valuesJson[v]));
        const valuesSection = hasValueKeyList.map((v) => `\`${v}\``).join(',');
        const questionList = hasValueKeyList.map((k) => '?').join(',');
        const values = hasValueKeyList.map((k) => valuesJson[k]);
        const sql = `INSERT INTO \`${table}\` (
            ${valuesSection}
        ) VALUES (${questionList})`;

        const insertResult = connection
            ? await updateTransaction(connection, sql, values, `insertSimple ${table}`)
            : await update(sql, values, `insertSimple ${table}`);
        checkUpdateResult(insertResult, 1);
        return insertResult.insertId;
    } catch (err) {
        throw DB_ERROR.is(err);
    }
};

/**
 * update
 * @param {string} table
 * @param {JSON} valuesJson 更新する値
 * @param {JSON} whereJson 検索する値
 * @param {number} expectChangeCount 期待する変更件数、与えられなければ検査しない、与えられて件数が違えば例外
 * @returns 変更件数
 */
exports.update = async (table, valuesJson, whereJson, expectChangeCount) => {
    return await this.updateTransaction(null, table, valuesJson, whereJson, expectChangeCount);
}

/**
 * update（トランザクション）
 * @param {Connection} connection
 * @param {string} table
 * @param {JSON} valuesJson 更新する値
 * @param {JSON} whereJson 検索する値
 * @param {number} expectChangeCount 期待する変更件数、与えられなければ検査しない、与えられて件数が違えば例外
 * @returns 変更件数
 */
exports.updateTransaction = async (connection, table, valuesJson, whereJson, expectChangeCount) => {
    try {
        const values = [];
        const valuesSection = [];
        const whereSection = [];

        Object.keys(valuesJson).forEach((k) => {
            valuesSection.push(`\`${k}\` = ?`);
            values.push(valuesJson[k]);
        });
        Object.keys(whereJson).forEach((k) => {
            if (whereJson[k] == null) {
                whereSection.push(`\`${k}\` IS NULL`);
            } else {
                whereSection.push(`\`${k}\` = ?`);
                values.push(whereJson[k]);
            }
        });

        const sql = `UPDATE \`${table}\` set ${valuesSection.join(',')} WHERE ${whereSection.join(' AND ')}`;
        const updateResult = connection
            ? await updateTransaction(connection, sql, values, `updateSimple ${table}`)
            : await update(sql, values, `updateSimple ${table}`);
        checkUpdateResult(updateResult, expectChangeCount);
        return updateResult.insertId;
    } catch (err) {
        throw DB_ERROR.is(err);
    }
};


exports.del = async (table, whereJson) => {
    await this.deleteTransaction(null, table, whereJson);
}

exports.deleteTransaction = async (connection, table, whereJson) => {
    try {
        const values = [];
        const whereSection = [];
        Object.keys(whereJson).forEach((k) => {
            if (Array.isArray(whereJson[k])) {
                whereSection.push(`\`${k}\` IN (?)`);
            } else {
                whereSection.push(`\`${k}\` = ?`);
            }
            values.push(whereJson[k]);
        });

        const sql = `DELETE FROM \`${table}\` WHERE ${whereSection.join(' AND ')}`;
        const deleteResult = connection
            ? await updateTransaction(connection, sql, values, `deleteSimple ${table}`)
            : await update(sql, values, `deleteSimple ${table}`);
        return deleteResult;
    } catch (err) {
        throw DB_ERROR.is(err);
    }
};

exports.selectWhenNothingInsert = async (table, valuesJson, whereJson) => {
    return await this.selectWhenNothingInsertTransaction(null, table, valuesJson, whereJson);
}

exports.selectWhenNothingInsertTransaction = async (connection, table, valuesJson, whereJson) => {
    try {
        const outer = connection
            ? await selectMainTransaction(connection, table, whereJson)
            : await selectMain(table, whereJson);
        if (isNotEmptyArray(outer)) {
            return outer;
        }
        // nothing insert
        if (connection) {
            await exports.insertTransaction(connection, table, valuesJson);
        } else {
            await exports.insert(table, valuesJson);
        }
        const newRecord = connection
            ? await selectMainTransaction(connection, table, whereJson)
            : await selectMain(table, whereJson);
        if (isNotEmptyArray(newRecord)) {
            return newRecord;
        }
        throw DB_ERROR.NOT_FOUND;
    } catch (err) {
        throw DB_ERROR.is(err);
    }
}

exports.updateWhenNothingInsert = async (table, valuesJsonInsert, valuesJsonUpdate, whereJson, expectChangeCount) => {
    return await this.updateWhenNothingInsertTransaction(null, table, valuesJsonInsert, valuesJsonUpdate, whereJson, expectChangeCount);
}

exports.updateWhenNothingInsertTransaction = async (
    connection, table, valuesJsonInsert, valuesJsonUpdate, whereJson, expectChangeCount) => {
    try {
        const outer = connection
            ? await selectMainTransaction(connection, table, whereJson)
            : await selectMain(table, whereJson);
        logger.debug('updateWhenNothingInsertTran', `table ${table} where ${JSON.stringify(whereJson)} outer.length: ${outer?.length} outerjson ${!!outer ? JSON.stringify(outer) : 'null'}`);
        if (isNotEmptyArray(outer)) {
            logger.debug('updateWhenNothingInsertTran', 'update');
            // あったらUPD
            if (connection) {
                await this.updateTransaction(connection, table, valuesJsonUpdate, whereJson, expectChangeCount);
            } else {
                await this.update(table, valuesJsonUpdate, whereJson, expectChangeCount);
            }
            // UPD後データを返却
            const newRecord = connection
                ? await selectMainTransaction(connection, table, whereJson)
                : await selectMain(table, whereJson);
            return newRecord;
        }
        logger.debug('updateWhenNothingInsertTran', 'insert');
        // nothing insert
        if (connection) {
            await exports.insertTransaction(connection, table, valuesJsonInsert);
        } else {
            await exports.insert(table, valuesJsonInsert);
        }
        const newRecord = connection
            ? await selectMainTransaction(connection, table, whereJson)
            : await selectMain(table, whereJson);
        if (isNotEmptyArray(newRecord)) {
            return newRecord;
        }
        throw DB_ERROR.NOT_FOUND;
    } catch (err) {
        throw DB_ERROR.is(err);
    }
}

/**
 * 存在確認と差分確認をし、なければINS、あれば差分確認して差分あれがUPD
 * @param {string} table
 * @param {Array<Array>} data データ2次元配列
 * @param {Array<string>} cols カラム名配列 data の並びに対応
 * @param {Array<string>} keys キーのカラム名配列 cols に内包必須
 */
exports.checkAndRegister = async (table, data, cols, keys) => {
    const conn = await this.getConnection();
    try {
        for (let r of data) {
            // キーで取得　なければINS あれば UPD
            const dataJson = {};
            cols.forEach((col, index) => {
                dataJson[col] = r[index];
            });
            const keyJson = {};
            keys.forEach((col) => {
                keyJson[col] = dataJson[col];
            });

            try {
                const current = await this.selectOne(table, keyJson);
                if (!current) {
                    throw 'no record';
                }
                // 一致チェック
                for (let colName of Object.keys(dataJson)) {
                    const colData = dataJson[colName];
                    if (colData !== current[colName]) {
                        try {
                            await this.updateTransaction(
                                conn, table, dataJson, keyJson, 1,
                            );
                            console.log(`update by diff: ${JSON.stringify(keyJson)}`);
                        } catch (updateError) {
                            console.error(`update ${JSON.stringify(keyJson)} error: ${JSON.stringify(updateError)}`);
                            throw updateError;
                        }
                    }
                }
            } catch (e) {
                //なければINS
                try {
                    await this.insertTransaction(
                        conn, 'PREF', dataJson,
                    );
                    console.log(`insert by none: ${JSON.stringify(keyJson)}`);
                } catch (insertError) {
                    console.error(`insert ${JSON.stringify(keyJson)} error: ${JSON.stringify(insertError)}`);
                    throw insertError;
                }
            }
        }
    } catch (err) {
        await this.rollbackTransaction(conn);
    }
};
