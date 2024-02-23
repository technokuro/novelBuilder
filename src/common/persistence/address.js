const { isNotEmptyArray, isNotEmpty } = require('../util/commonUtils');
const {
    query,
} = require('./base/mysql');

/**
 * 都道府県 SELECT.
 * @param {CHAR(2)} prefCd
 */
exports.getPref = async (prefCd) => {
    let result = await query(
        'SELECT ' +
        '  PREF_CD as prefCd,' +
        '  PREF_NAME as prefName,' +
        '  HIDE_FLG as hideFlg' +
        ' FROM PREF' +
        ' WHERE' +
        '     PREF_CD = ?' +
        ' AND HIDE_FLG = ?'
        ,[prefCd, '0'], null, 'GET PREF'
    );
    return result;
};

/**
 * 都道府県カナ検索
 * @param {string} kana 全角カナ
 */
exports.getPrefByKana = async (kana) => {
    const result = await query(
        'SELECT ' +
        '  PREF_CD as prefCd,' +
        '  PREF_NAME as prefName,' +
        '  HIDE_FLG as hideFlg' +
        ' FROM PREF' +
        ' WHERE' +
        '     PREF_NAME_KANA LIKE ?' +
        ' AND HIDE_FLG = ?'
        ,[`%${kana}%`, '0'], null, 'GET PREF BY KANA'
    );
    return result;
};

/**
 * 都道府県 都道府県CDからリストで取得 SELECT.
 * @param {array|null} prefCdList 指定がなければ対象都道府県すべてを返却
 */
 exports.getPrefsByPrefList = async (prefCdList) => {
    let param = [];
    let sql = 'SELECT ' +
        '  PREF_CD as prefCd,' +
        '  PREF_NAME as prefName,' +
        '  HIDE_FLG as hideFlg' +
        ' FROM PREF' +
        ' WHERE' +
        '     HIDE_FLG = ?';
    param.push('0');
    if(isNotEmptyArray(prefCdList)){
        sql += ' AND PREF_CD IN (?)';
        param.push(prefCdList);
    }
    let result = await query(
        sql, param,null, 'GET PREFS BY PREF_CD_LIST'
    );
    return result;
};

/**
 * 市区町村 SELECT.
 * @param {CHAR(2)} prefCd
 * @param {CHAR(5)} cityCd
 */
 exports.getCity = async (prefCd, cityCd) => {
    let result = await query(
        'SELECT ' +
        '  C.PREF_CD as prefCd,' +
        '  C.CITY_CD as cityCd,' +
        '  C.CITY_NAME as cityName,' +
        '  C.HIDE_FLG as hideFlg,' +
        '  C.DEL_DATE as delDate' +
        ' FROM CITY C' +
        ' WHERE' +
        '     C.PREF_CD = ?' +
        ' AND C.CITY_CD = ?' +
        ' AND C.HIDE_FLG = ?' +
        ' AND C.DEL_DATE IS NULL' +
        ' AND EXISTS(' +
        '       SELECT 1 FROM PREF P' +
        '       WHERE P.PREF_CD = C.PREF_CD' +
        '         AND P.HIDE_FLG = ?' +
        '     )'
        ,[prefCd, cityCd, '0', '0'], null, 'GET CITY'
    );
    return result;
};

/**
 * 市区町村カナ検索
 * @param {string} kana 全角カナ
 * @param {string} prefCd 都道府県コード（任意）
 */
exports.getCityByKana = async (kana, prefCd) => {
    const values = [`%${kana}%`, '0', '0'];
    if (!!prefCd) {
        values.push(prefCd);
    }
    const result = await query(
        `SELECT
          C.PREF_CD as prefCd,
          C.CITY_CD as cityCd,
          C.CITY_NAME as cityName,
          C.HIDE_FLG as hideFlg,
          C.DEL_DATE as delDate
         FROM CITY C
         WHERE
             C.CITY_NAME_KANA LIKE ?
         AND C.HIDE_FLG = ?
         AND C.DEL_DATE IS NULL
         AND EXISTS(
               SELECT 1 FROM PREF P
               WHERE P.PREF_CD = C.PREF_CD
                 AND P.HIDE_FLG = ?
         )
         ${!!prefCd ? 'AND C.PREF_CD = ?' : ''}`,
        values, null, 'GET CITY BY KANA'
    );
    return result;
};

/**
 * 市区町村 都道府県CDからリストで取得 SELECT.
 * @param {array} prefCdList
 */
 exports.getCitiesByPrefList = async (prefCdList) => {
    let result = await query(
        'SELECT ' +
        '  C.PREF_CD as prefCd,' +
        '  C.CITY_CD as cityCd,' +
        '  C.CITY_NAME as cityName,' +
        '  C.HIDE_FLG as hideFlg,' +
        '  C.DEL_DATE as delDate' +
        ' FROM CITY C' +
        ' WHERE' +
        '     C.PREF_CD IN (?)' +
        ' AND C.HIDE_FLG = ?' +
        ' AND C.DEL_DATE IS NULL' +
        ' AND EXISTS(' +
        '       SELECT 1 FROM PREF P' +
        '       WHERE P.PREF_CD = C.PREF_CD' +
        '         AND P.HIDE_FLG = ?' +
        '     )'
        ,[prefCdList, '0', '0'], null, 'GET CITIES BY PREF_CD_LIST'
    );
    return result;
};

/**
 * 路線 都道府県、市区町村コードに存在する駅が関連する路線に絞る SELECT.
 * @param {Array|MEDIUMINT|null} lineCd
 * @param {Array|MEDIUMINT|null} prefCd
 * @param {Array|MEDIUMINT|null} cityCd
 */
 exports.getLine = async (lineCd, prefCd, cityCd) => {
    let param = [];
    let sql = 'SELECT ' +
        '  L.LINE_CD as lineCd,' +
        '  L.LINE_NAME as lineName,' +
        '  L.HIDE_FLG as hideFlg,' +
        '  L.DEL_DATE as delDate' +
        ' FROM LINE L' +
        ' WHERE' +
        '     L.HIDE_FLG = ?' +
        ' AND L.DEL_DATE IS NULL';
    param.push('0');
    if(isNotEmpty(lineCd)){
        sql += ` AND L.LINE_CD ${Array.isArray(lineCd) ? 'IN (?)' : '= ?'}`;
        param.push(lineCd);
    }
    sql += ' AND ' +
        '  EXISTS(' +
        '   SELECT 1' +
        '   FROM STATION S' +
        '     INNER JOIN' +
        '         (SELECT PREF_CD ' +
        '           FROM PREF WHERE' +
        '                HIDE_FLG = ?';
    param.push('0');
    if(isNotEmpty(prefCd)){
        sql += ` AND PREF_CD ${Array.isArray(prefCd) ? 'IN (?)' : '= ?'}`;
        param.push(prefCd);
    }
    sql += ') P' +
        '       ON S.PREF_CD = P.PREF_CD' +
        '     INNER JOIN' +
        '         (SELECT CITY_CD ' +
        '           FROM CITY WHERE' +
        '                HIDE_FLG = ?';
    param.push('0');
    if(isNotEmpty(cityCd)){
        sql += ` AND CITY_CD ${Array.isArray(cityCd) ? 'IN (?)' : '= ?'}`;
        param.push(cityCd);
    }
    sql += ') C' +
        '       ON S.CITY_CD = C.CITY_CD OR S.CITY_CD = \'99999\'' +
        '   WHERE S.LINE_CD = L.LINE_CD' +
        ')';
    sql += ' ORDER BY L.LINE_CD';
    let result = await query(
        sql ,param, null, 'GET LINE'
    );
    return result;
};

/**
 * 駅 都道府県、市区町村コードに存在する駅が関連する路線に絞る SELECT.
 * @param {Array|MEDIUMINT|null} stationGCd
 * @param {Array|MEDIUMINT|null} lineCd
 * @param {Array|MEDIUMINT|null} prefCd
 * @param {Array|MEDIUMINT|null} cityCd
 */
 exports.getStation = async (stationGCd, lineCd, prefCd, cityCd) => {
    let param = [];
    let sql = 'SELECT ' +
        '  S.STATION_CD as stationCd,' +
        '  S.STATION_G_CD as stationGCd,' +
        '  S.LINE_CD as lineCd,' +
        '  S.STATION_NAME as stationName,' +
        '  S.PREF_CD as prefCd,' +
        '  S.CITY_CD as cityCd,' +
        '  S.HIDE_FLG as hideFlg,' +
        '  S.DEL_DATE as delDate' +
        ' FROM STATION S' +
        ' WHERE' +
        '     S.HIDE_FLG = ?' +
        ' AND S.DEL_DATE IS NULL'
    param.push('0');
    if(isNotEmpty(stationGCd)){
        sql += ` AND S.STATION_G_CD ${Array.isArray(stationGCd) ? 'IN (?)' : '= ?'}`;
        param.push(stationGCd);
    }
    if(isNotEmpty(lineCd)){
        sql += ` AND S.LINE_CD ${Array.isArray(lineCd) ? 'IN (?)' : '= ?'}`;
        param.push(lineCd);
    }
    sql += ' AND ' +
        '  EXISTS(' +
        '   SELECT 1' +
        '   FROM ' +
        '     (SELECT PREF_CD ' +
        '       FROM PREF WHERE' +
        '            HIDE_FLG = ?';
    param.push('0');
    if(isNotEmpty(prefCd)){
        sql += ` AND PREF_CD ${Array.isArray(prefCd) ? 'IN (?)' : '= ?'}`;
        param.push(prefCd);
    }
    sql += ') P' +
        '   INNER JOIN' +
        '     (SELECT PREF_CD, CITY_CD ' +
        '       FROM CITY WHERE' +
        '            HIDE_FLG = ?';
    param.push('0');
    if(isNotEmpty(cityCd)){
        sql += ` AND CITY_CD ${Array.isArray(cityCd) ? 'IN (?)' : '= ?'}`;
        param.push(cityCd);
    }
    sql += ') C' +
        '     ON P.PREF_CD = C.PREF_CD' +
        '   WHERE S.PREF_CD = P.PREF_CD' +
        '     AND (S.CITY_CD = C.CITY_CD OR S.CITY_CD = \'99999\')' + //CITY_CD 99999 の駅がある
        ')';
    sql += ' ORDER BY S.LINE_CD, S.STATION_CD';
    let result = await query(
        sql ,param, null, 'GET STATION'
    );
    return result;
};
