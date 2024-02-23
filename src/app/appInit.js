const path = require('path');
const express = require('express');

/** app.js から app が渡されるので、ルーターをセットする */
exports.appRouter = (app) => {
    app.use('/app/test', require('./routes/test').router);
};

/** persistence/base/initialize が ファイルによるテーブル・データの初期化時に呼ばれるので、
 * 初期化するためのファイルを返却する
 */
exports.dbInitFiles = () => {
    return {
        clearTables: path.join(__dirname, 'clearTables.sql'),
        createTables: path.join(__dirname, 'createTables.sql'),
        alterTables: path.join(__dirname, 'alterTables.sql'),
        insertMasterData: path.join(__dirname, 'insertMasterData.sql'),
    };
}

/**
 * common bin www で初期化された HttpServer に追加して初期化処理をする
 * @param {httpServer} server
 */
exports.appendInitServer = (server) => {

};
