const validate = require('../../util/validate');
const jwtAuth = require('../../auth/jwtAuth');
const { RESULT_CODE, DB_ERROR } = require('../../definition');

const MODULE_NAME = 'routeBase.js';
const logger = require('../../util/log');
const { getIp } = require('../../util/queryStringUtil');
const SYSTEM_ERROR = new Error('system error');

/** JWTトークン発行 */
const createToken = (req, json) => {
  return jwtAuth.create(getIp(req), json);
};

/** 再取得用長期トークン発行 */
const createLongToken = async (accountNo) => {
  return await jwtAuth.createLongToken(accountNo);
};

/** 再取得用長期トークンから、アカウントNoを得る */
const getAccountNoByLongToken = async (longToken) => {
  return await jwtAuth.authLongTokenAndGetAccountNo(longToken);
}

/** バリデーション */
const check = async (req, res) => {
  try {
    if (!req || !res) {
      throw SYSTEM_ERROR;
    }
    const validResult = await validate.getResult(req, res);
    if(validResult){
      logger.error('validation error', 'req', req?.originalUrl, 'body', req?.body, 'err', validResult);
      res.status(RESULT_CODE.ERROR_VALIDATION.httpResult).json(validResult);
      return false;
    }
    return true;
  } catch (err) {
    logger.error('routeBase.check error', err);
    doError(SYSTEM_ERROR, res);
    return false;
  }
};

/** エラーレスポンス */
const doError = (err, res) => {
  // RESULT_CODE なら model が発した例外 DB_ERROR なら persistent が発した例外
  const resultCode = !err ? null : Object.values(RESULT_CODE).find(e => e === err);
  const dbError = !err?.no ? null : Object.values(DB_ERROR).find(e => e.errno === err.errno);
  let result;
  if (resultCode && resultCode.httpResult) {
    result = resultCode;
  } else {
    if (dbError) {
      result = dbError.resultCode;
    } else {
      result = RESULT_CODE.ERROR;
    }
  }
  if (!!err.customMessage) {
    result.errorMessage = err.customMessage;
  }
  logger.error(`doError status: ${result?.httpResult || 'httpResult none'} ${JSON.stringify(result)}`);
  res.status(result?.httpResult).json(result);
};

/** メイン処理コールバック発火 */
const doMain = async (req, res, callback, auth) => {
  try {
    const result = await callback(req, auth);
    logger.debug(`res: ${JSON.stringify(result)} req: ${req?.originalUrl} body: ${JSON.stringify(req?.body)} `);

    // result に cookie が含まれていたら書き込む
    if (!!result) {
      if (result?.cookie) {
        Object.keys(result.cookie).forEach((k) => {
          res.cookie(k, result.cookie[k]?.value, {
            maxAge: result.cookie[k]?.maxAge || 60000 * 60 * 24,
            sameSite: result.cookie[k]?.sameSite || 'Lax',
            httpOnly: result.cookie[k]?.httpOnly || true,
            secure: result.cookie[k]?.secure || true,
          });
        });
        // キー自体を消す
        delete result.cookie;
      }
      // selfResponse==trueの時、ここで res.status しない
      if (result?.selfResponse) {
        return;
      }
    }
    res.status(RESULT_CODE.OK.httpResult).json(result);
  } catch(err) {
    const log = `error: req: ${req?.originalUrl} body: ${JSON.stringify(req?.body)}`;
    logger.error(`${log}${!!err.stack ? `
${err.stack}` : ''}`);
    logger.error(err);
    doError(err, res);
  }
  return;
};

/**
 * ルート処理　認証なし
 *
 * @param {*} req
 * @param {*} res
 * @param {*} callback req がそのまま渡され、結果値はクライアントに返却されるjsonを期待
 * @returns
 */
async function doRoute(req, res, callback) {
  const checkResult = await check(req, res);
  if (!checkResult) {
    return;
  }
  doMain(req, res, callback);
}

/**
 * ルート処理　JWT認証あり
 *
 * @param {*} req
 * @param {*} res
 * @param {*} callback req と JWT復号情報が渡され、結果値はクライアントに返却されるjsonを期待
 *                  appendTokenInfo=有値 のとき、newToken も渡される
 * @param {*} editToken 今回のトークンを無効化、またはリフレッシュする
 * @returns
 */
async function doAuthRoute(req, res, callback, editToken) {
  const checkResult = await check(req, res);
  if (!checkResult) {
    return;
  }
  try {
    await jwtAuth.auth(
      req?.headers?.authorization,
      getIp(req),
      editToken,
      (auth) => {
        doMain(req, res, callback, auth);
      },
      (err) => doError(err, res),
    );
  }catch (err) {
    doError(err, res);
  }
}

module.exports = {
  doRoute,
  doAuthRoute,
  createToken,
  createLongToken,
  getAccountNoByLongToken,
  doMain,
  doError,
  check,
};
