const fs = require('fs');
const path = require('path');
const logger = require('../../util/log');
const config = require('../../../config');
const dbBase = require('./mysql');
const childApp = require('../../../app/appInit');

exports.init = async () => {
    const host = config.DB_SETTING.host;
    const user = config.DB_SETTING.user;
    const password = config.DB_SETTING.password;
    const database = config.DB_SETTING.database;
    const port = config.DB_SETTING.port;
    const timeout = config.DB_SETTING.timeout;

    await dbBase.init(host, user, password, database, port, timeout);

    try{
        const appDbInitFiles = childApp.dbInitFiles();
        if (config.IS_RUN_TABLE_CLEARE) {
            // app から common テーブルを外部制約としているケースがあるので、こちらが先
            if (appDbInitFiles.clearTables) {
                await executeByFile(appDbInitFiles.clearTables, true)
            }
            await executeByFile(
                path.join(__dirname, config.DB_INIT_FILES.clearTables), true);
        }
        if (config.IS_RUN_TABLE_CREATION) {
            await executeByFile(
                path.join(__dirname, config.DB_INIT_FILES.createTables), true);
            if (appDbInitFiles.createTables) {
                await executeByFile(appDbInitFiles.createTables, true)
            }
        }
        if (config.IS_RUN_TABLE_ALTER) {
            await executeByFile(
                path.join(__dirname, config.DB_INIT_FILES.alterTables), true);
            if (appDbInitFiles.alterTables) {
                await executeByFile(appDbInitFiles.alterTables, true)
            }
        }
        if (config.IS_RUN_TABLE_INSERT_MASTER) {
            // await insertMasterData.execute();
            await executeByFile(
                path.join(__dirname, config.DB_INIT_FILES.insertMasterData), true);
            if (appDbInitFiles.insertMasterData) {
                await executeByFile(appDbInitFiles.insertMasterData, true)
            }
        }
    }catch(err){
        throw err;
    }
    return;
};

/** ファイルのSQLを実行
 *
 * @param {*} filePath
 * @param {*} isForceRun 途中でエラーが出ても、最後まで実行する場合 true
 */
const executeByFile = async (filePath, isForceRun) => {
    const lines = fs.readFileSync(filePath, 'utf8').split(/[\r\n]/);

    const sqlArray = [];
    for(const line of lines){
        if (!line.startsWith('--') && !line.startsWith('//')) {
            sqlArray.push(line);

            if (line.indexOf(';') >= 0) {
                const sql = sqlArray.join('');
                sqlArray.splice(0);
                logger.debug(`【${sql}】`);
                try{
                    await dbBase.update(sql);
                }catch(err){
                    logger.warn(`${err}\n\tisForceRun:${isForceRun}`);
                    if(!isForceRun){
                        throw err;
                    }
                }
            }
        }
    }
};

const teardown = async () => {
    return dbBase.teardown();
};
