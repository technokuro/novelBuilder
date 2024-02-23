const { response } = require('express');
const def = require('../definition');
const logger = require('./log');

/**
 * JSONをレスポンスに書き出し
 * @param {HttpResponse} res HttpResponse
 * @param {Object} defResultCode definition.RESULT_CODE の列挙の１つ
 * @param {Object} json 
 */
function write(res, defResultCode, json){
    logger.debug(`response:${JSON.stringify(json) || 'no response'}`);
    res.status(defResultCode.httpResult).json(json);
}

/**
 * シンプルなレスポンスを書き出し
 * @param {HttpResponse} res HttpResponse
 * @param {Object} defResultCode definition.RESULT_CODE の列挙の１つ
 * @param {Object|null}  正常時 パラメタ / error時 errorDetails makeValidateError で生成したJSON(単体か複数)
 */
function writeSimple(res, defResultCode, param){
    let json = makeSimple(defResultCode, param);
    write(res, defResultCode, json);
}

/**
 * バリデーションエラーを生成
 * @param {string} paramName パラメタ名 
 * @param {string} msg メッセージ 
 * @param {string} realValue 入力値 
 */
function makeValidateError(paramName, msg, realValue){
    return ({
        message: msg,
        param: paramName,
        value: realValue
    });
}

/** errorDetailsの形式でなければ調整 */
const exErrorDetails = function(e){
    return ({
        message: e.message ? e.message : e,
        param: e.param ? e.param : '',
        value: e.value ? e.value : ''
    });
}

/**
 * シンプルな返却を生成
 * @param {Object} defResultCode definition.RESULT_CODE の列挙の１つ
 * @param {Object|null} finalizedErrorDetails finalizeErrorDetails で生成したJSON
 * @param {Object|string|null} details makeValidateError で生成したJSON(単体か複数) もしくは string
 */
function makeSimple(defResultCode, params){
    let details;
    if(defResultCode.httpResult == def.HTTP_RESULT.OK){
        return ({
            resultCode: defResultCode.code,
            result: params
        });
    }else{
        if(params){
            if(Array.isArray(params)){
                details = params.map(e => exErrorDetails(e));
            }else{
                details = [exErrorDetails(params)];
            }
        }
        return ({
            result: {
                resultCode: defResultCode.code,
                errorMessage: defResultCode.errorMessage,
                errorDetails: details
            }
        });
    }
}

/**
 * 次のリソースへ遷移
 * @param {HttpRequest} req
 * @param {HttpResponse} res
 * @param {string} path ejs or url
 * @param {object} resultCode def.RESULT_CODE 列挙
 * @param {object} params 次のリソースに渡すパラメタ 
 *  path==ejs のとき、ejsにパラメタを渡す
 *  path==url のとき、リクエストボディに記録してリダイレクト
 */
function next(req, res, path, resultCode, params){
    if(path.endsWith('.ejs')){
        if(!checkPath(def.EJS, path)){
            return;
        }
        let p;
        if(resultCode && resultCode.httpResult != def.HTTP_RESULT.OK){
            p = params || {};
            let errors = makeSimple(resultCode, params).result;
            p.resultCode = errors.resultCode;
            p.errorMessage = errors.errorMessage;
            p.errorDetails = errors.errorDetails;
        }else if(params){
            p = params;
            p.resultCode = resultCode || def.RESULT_CODE.OK;
        }else{
            p = {};
            p.resultCode = resultCode || def.RESULT_CODE.OK;
        }
        try{
            res.render(path, {
                request: req.body,
                _: p
            });
        }catch(err){
            logger.error(err);
            res.render(def.EJS.ERROR);
        }
    }else{
        if(!checkPath(def.REQUEST_PATH, path)){
            return;
        }
        req.body = params;
        res.redirect(path);
    }
}

/**
 * issues に含まれる、あるいは前方一致する path であるかチェック
 * チェック不合格のときは、エラーページへ遷移
 * @param {array} issues 
 * @param {string} path 
 */
function checkPath(issues, path){
    let result = Object.values(issues).find(e => {
        return e == path || path.startsWith(e)
    });
    if(!result){
        //想定外の遷移先ならばエラー
        res.render(def.EJS.ERROR, {
            _: makeSimple(def.RESULT_CODE.ERROR, 'unknown request'),
        });
    }
    return result;
}

/**
 * テキスト系データダウンロード用レスポンス
 * @param {HttpResponse} res HttpResponse
 * @param {Object} defResultCode definition.RESULT_CODE の列挙の１つ
 * @param {string} fileName 
 * @param {string} contentType 
 * @param {string} charset 
 * @param {string} data テキスト系データ推奨
 */
function writeForDownload(res, defResultCode, fileName, contentType, charset, data){
    logger.debug(`response:${fileName || 'no fileName'}`);
    res.setHeader('Content-disposition', `attachment; filename=${fileName}`);
    res.setHeader('Content-Type', `${contentType}; charset=${charset}`);
    res.status(defResultCode.httpResult);
    res.send(data);
}

module.exports = {
    write,
    writeSimple,
    makeValidateError,
    makeSimple,
    next,
    writeForDownload,
};