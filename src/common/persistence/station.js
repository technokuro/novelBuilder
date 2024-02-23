const { isNotEmptyArray, isNotEmpty } = require('../util/commonUtils');
const {
    query,
} = require('./base/mysql');

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
        sql += ` AND L.LINE_CD ${isNotEmptyArray(lineCd) ? 'IN (?)' : '= ?'}`;
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
        sql += ` AND PREF_CD ${isNotEmptyArray(prefCd) ? 'IN (?)' : '= ?'}`;
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
        sql += ` AND CITY_CD ${isNotEmptyArray(cityCd) ? 'IN (?)' : '= ?'}`;
        param.push(cityCd);
    }
    sql += ') C' +
        '       ON S.CITY_CD = C.CITY_CD OR S.CITY_CD = \'99999\'' +
        '   WHERE S.LINE_CD = L.LINE_CD' +
        ')' +
        ' ORDER BY L.LINE_CD';
    let result = await query(
        sql ,param, null, 'GET LINE'
    );
    return result;
};

/**
 * 駅 都道府県、市区町村コードに存在する駅に絞る SELECT.
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
        sql += ` AND S.STATION_G_CD ${isNotEmptyArray(stationGCd) ? 'IN (?)' : '= ?'}`;
        param.push(stationGCd);
    }
    if(isNotEmpty(lineCd)){
        sql += ` AND S.LINE_CD ${isNotEmptyArray(lineCd) ? 'IN (?)' : '= ?'}`;
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
        sql += ` AND PREF_CD ${isNotEmptyArray(prefCd) ? 'IN (?)' : '= ?'}`;
        param.push(prefCd);
    }
    sql += ') P' +
        '   INNER JOIN' +
        '     (SELECT PREF_CD, CITY_CD ' +
        '       FROM CITY WHERE' +
        '            HIDE_FLG = ?';
    param.push('0');
    if(isNotEmpty(cityCd)){
        sql += ` AND CITY_CD ${isNotEmptyArray(cityCd) ? 'IN (?)' : '= ?'}`;
        param.push(cityCd);
    }
    sql += ') C' +
        '     ON P.PREF_CD = C.PREF_CD' +
        '   WHERE S.PREF_CD = P.PREF_CD' +
        '     AND (S.CITY_CD = C.CITY_CD OR S.CITY_CD = \'99999\')' + //CITY_CD 99999 の駅がある
        ')' +
        ' ORDER BY S.LINE_CD, S.STATION_CD';
    let result = await query(
        sql ,param, null, 'GET STATION'
    );
    return result;
}

/**
 * 駅 都道府県、市区町村コードに存在する駅　の路線を取り、その路線の全駅を取る SELECT.
 * @param {Array|MEDIUMINT|null} stationGCd
 * @param {Array|MEDIUMINT|null} lineCd
 * @param {Array|MEDIUMINT|null} prefCd
 * @param {Array|MEDIUMINT|null} cityCd
 */
exports.getStationLinesAll = async (stationGCd, lineCd, prefCd, cityCd) => {
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
        ' FROM STATION S ' +
        ' WHERE S.LINE_CD IN ( ' +
        '   SELECT DISTINCT TS.LINE_CD FROM STATION TS' +
        '     WHERE' +
        '       TS.HIDE_FLG = ?' +
        '   AND TS.DEL_DATE IS NULL'
    param.push('0');
    if(isNotEmpty(stationGCd)){
        sql += ` AND TS.STATION_G_CD ${isNotEmptyArray(stationGCd) ? 'IN (?)' : '= ?'}`;
        param.push(stationGCd);
    }
    if(isNotEmpty(lineCd)){
        sql += ` AND TS.LINE_CD ${isNotEmptyArray(lineCd) ? 'IN (?)' : '= ?'}`;
        param.push(lineCd);
    }
    sql += '   AND ' +
        '    EXISTS(' +
        '     SELECT 1' +
        '     FROM ' +
        '       (SELECT PREF_CD ' +
        '         FROM PREF WHERE' +
        '              HIDE_FLG = ?';
    param.push('0');
    if(isNotEmpty(prefCd)){
        sql += `   AND PREF_CD ${isNotEmptyArray(prefCd) ? 'IN (?)' : '= ?'}`;
        param.push(prefCd);
    }
    sql += ') P' +
        '     INNER JOIN' +
        '       (SELECT PREF_CD, CITY_CD ' +
        '         FROM CITY WHERE' +
        '              HIDE_FLG = ?';
    param.push('0');
    if(isNotEmpty(cityCd)){
        sql += `   AND CITY_CD ${isNotEmptyArray(cityCd) ? 'IN (?)' : '= ?'}`;
        param.push(cityCd);
    }
    sql += ') C' +
        '       ON P.PREF_CD = C.PREF_CD' +
        '     WHERE TS.PREF_CD = P.PREF_CD' +
        '     AND TS.CITY_CD = C.CITY_CD ' + //CITY_CD 99999 の駅は除外する(LINE_CDで包括するからいいだろう)
        '  )' +
        ' ) AND S.HIDE_FLG = ? AND S.DEL_DATE IS NULL ' +
        ' ORDER BY S.LINE_CD, S.STATION_CD';
    param.push('0');
    let result = await query(
        sql ,param, null, 'GET STATION BY LINES ALL'
    );
    return result;
}

/**
 * 駅 を STATION_G_CD のリストから、レコードを取る SELECT.
 * 複数ある場合、STATION_CD が最小のもの
 * @param {Array} stationGCdList
 */
exports.getStationByStationGCdList = async (stationGCdList) => {
    const sql = `
        SELECT
            S.STATION_G_CD as stationGCd,
            S.LINE_CD as lineCd,
            L.LINE_NAME as lineName,
            S.STATION_NAME as stationName
        FROM
            STATION S
        INNER JOIN
            (
                SELECT
                    S2.STATION_G_CD,
                    MIN(S2.STATION_CD) AS STATION_CD
                FROM
                    STATION S2
                GROUP BY S2.STATION_G_CD
            ) S1
        ON S.STATION_G_CD = S1.STATION_G_CD AND S.STATION_CD = S1.STATION_CD
        INNER JOIN
            LINE L
        ON S.LINE_CD = L.LINE_CD AND L.HIDE_FLG = ?
        WHERE
            S.HIDE_FLG = ?
        AND S.STATION_G_CD IN (?)`;

    const result = await query(
        sql ,['0', '0', stationGCdList], null, 'GET STATION LIST BY STATION_G_CD'
    );
    return result;
}
