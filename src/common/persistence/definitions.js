const { DB_ERROR } = require('../definition');
const { isNotEmptyArray, isEmpty, isValue } = require('../util/commonUtils');
const { logger } = require('../util/log');
const {
    query, update, updateTransaction, checkUpdateResult,
} = require('./base/mysql');
const {
    selectWhenNothingInsertTransaction, select, insertTransaction, selectOneTransaction
} = require('./simple');

/**
 * 定義語 SELECT.
 * すでに１点に決まっている定義語を取得する
 * integrate_no を解決した状態の view を参照する
 *
 * @param {VARCHAR(32)} category
 * @param {INT} no
 */
exports.getOne = async (category, no) => {
    const result = await query(
        'SELECT ' +
        '  CATEGORY as category,' +
        '  DEF_NO as no,' +
        '  LABEL as label,' +
        '  INTEGRATE_NO as integrateNo,' +
        '  REG_DATE as regDate' +
        ' FROM V_DEFINITIONS' +
        ' WHERE' +
        '     CATEGORY = ?' +
        ' AND DEF_NO = ?' +
        ' AND DEL_DATE IS NULL'
        ,[category, no], null, 'GET DEFINITIONS ONE'
    );
    if (!Array.isArray(result) || result.length === 0) {
        throw DB_ERROR.NOT_FOUND;
    }
    const ret = result[0];
    if (ret?.integrateNo) {
        return getOne(category, ret.integrateNo);
    }
    return ret;
};

/**
 * 定義語 SELECT.
 * 選択用にカテゴリ中のリストを得る
 * prefix を与えるとサジェストの効果
 * 選択肢として取得されることを期待し、実テーブルを参照する
 * integrate_no がないものを返却
 * @param {VARCHAR(32) || array} category
 * @param {VARCHAR(32)} prefix
 */
 exports.getList = async (category, prefix) => {
    let sql = `
        SELECT
            D.CATEGORY as category,
            D.DEF_NO as no,
            D.LABEL as label,
            D.REG_DATE as regDate
        FROM DEFINITIONS D
        WHERE
            D.CATEGORY ${Array.isArray(category) ? 'IN (?)' : '= ?'}
        AND D.INTEGRATE_NO IS NULL
        AND D.DEL_DATE IS NULL`;

    const params = [category, category, category, category];

    if (prefix) {
        sql += ' AND LABEL LIKE ?';
        params.push(`${prefix}%`);
    }

    sql += ' ORDER BY CATEGORY ASC, D.DEF_NO ASC';

    const result = await query(
        sql,
        params,
        null,
        `GET DEFINITIONS CATEGORY ${category} LIST ${prefix ? `prefix:${prefix}` : ''}`
    );
    if (!Array.isArray(result) || result.length === 0) {
        throw DB_ERROR.NOT_FOUND;
    }
    return result;
};

/**
 * 定義語を登録.
 */
 exports.saveNew = async (category, label) => {
    if (!isValue(category) || !isValue(label)) {
        return null;
    }
    const insertResult = await update(
        'INSERT INTO DEFINITIONS(CATEGORY, LABEL) VALUES (?, ?)',
        [category, label],
        `insert New DEFINITIONS category: ${category}`
    );
    checkUpdateResult(insertResult, 1);
    return insertResult.insertId;
};

/**
 * 定義語を登録.
 */
exports.saveNewTrunsaction = async (connection, category, label) => {
    if (!isValue(category) || !isValue(label)) {
        return null;
    }
    const insertResult = await updateTransaction(
        connection,
        'INSERT INTO DEFINITIONS(CATEGORY, LABEL) VALUES (?, ?)',
        [category, label],
        `insert New DEFINITIONS category: ${category}`
    );
    checkUpdateResult(insertResult, 1);
    return insertResult.insertId;
};

/**
 * もしあれば返却、なければ登録して返却.
 * @param defNo 0以上が与えられたら、そもそも存在前提で取得返却、なければエラーログ書いてnull返却
 *
 */
exports.selectWhenNothingNewTransaction = async (connection, defNo, category, label) => {
    // defNo category label が null の場合は何もしない
    if (!isValue(defNo) || !isValue(category) || !isValue(label)) return null;
    let current; // defNo で検索し、ないか defNo < 0 ならば label で検索する
    if (defNo && defNo >= 0) {
        current = await selectOneTransaction(
            connection,
            'V_DEFINITIONS',
            {
                DEF_NO: defNo,
                CATEGORY: category,
            },
            true);

        if (current?.LABEL == label) {
            return current;
        }
    }
    // labelで
    if (!current) {
        current = await selectOneTransaction(
            connection,
            'V_DEFINITIONS',
            {
                CATEGORY: category,
                LABEL: label,
            },
            true);
        if (current) {
            return current;
        }
    }

    // nothing insert
    const resultId = await insertTransaction(connection, 'DEFINITIONS', {
        CATEGORY: category,
        LABEL: label,
    });

    const result = await selectOneTransaction(
        connection,
        'V_DEFINITIONS',
        {
            DEF_NO: resultId,
            CATEGORY: category,
            LABEL: label,
        });

    if (result) {
        return result;
    }

    logger.error(
        'DEFINITIONS defNo 登録に失敗',
        JSON.stringify({
            input: {
                defNo, category, label
            },
        })
    );
    return null;
};
