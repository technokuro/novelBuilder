const def = require('../definition');
const response = require('./response');
const { check, validationResult } = require('express-validator');
const session = require('./session');
const { logger } = require('./log');

/** express-validator Array の整形 */
function exValidatorError(validatorArray){
    if(validatorArray){
        return validatorArray.map(e => 
            response.makeValidateError(e.param, e.msg, e.value)
        );
    }
    return null;
}

/** セッションの有効性判定とバリデーション */
async function executeWithSession(req, res, ...functions){
    if(!session.isAlive(req, res)){
        response.writeSimple(
            res, 
            def.RESULT_CODE.IS_NOT_ALIVE_SESSION
        );
        return false;
    }
    return execute(req, res, ...functions);
}

/** 
 * 単純バリデーションの実行 
 * エラーあり返却コードと基本メッセージをresに詰める
 * エラーなしなら null をresに詰める
 * 
 * @param {HttpRequest} req 
 * @param {HttpResponse} res 
 * @param {...Function} functions 
 *        次の形式の async function(@return response.makeValidateError形式:合格時はnull返却)
 * @return true:正常 false:バリデーションエラー
 */
async function execute(req, res, ...functions){
    try{
        let results = await getResult(req, res, ...functions);
        if(results && results.length){
            response.writeSimple(
                res, 
                def.RESULT_CODE.ERROR_VALIDATION, 
                results
            );
            return false;
        }
        return true;
    }catch(e){
        logger.error(`validation execute error${e}`);
        response.writeSimple(
            res,
            def.RESULT_CODE.VALIDATION_EXECUTE_ERROR
        );
        return false;
    }
}


/** 
 * 単純バリデーションの実行 
 * エラーあり エラーJSONを返す
 * エラーなし なら null を返す
 * 
 * @param {HttpRequest} req 
 * @param {HttpResponse} res 
 * @param {...Function} functions 
 *        次の形式の async function(@param req, @return response.makeValidateError形式:合格時はnull返却)
 * @return true:正常 false:バリデーションエラー
 */
async function getResult(req, res, ...functions){
    const result = validationResult(req);
    let results;
    if(!result.isEmpty()){
        results = exValidatorError(result.array());
    }
    if(!results){
        if(functions && functions.length){
            results = [];
            for(let hoge = 0; hoge < functions.length; hoge++){
                let result = await functions[hoge](req);
                
                if(result){
                    results.push(result);
                }
            }
        }
    }
    if(results && results.length){
        return results;
    }
    return null;
}

module.exports = {
    exValidatorError,
    execute,
    executeWithSession,
    getResult,
};
