const { verifyToken, createToken } = require('../util/jwtUtil');
const {
  TOKEN_KEY,
  TOKEN_EXPIRE,
  LONG_TOKEN_EXPIRE,
  CRYPTO_KEY,
  CRYPTO_SALT,
  HASH_SALT,
  PASSWORD_ITERATION_COUNT,
  PASSWORD_HASH_LENGTH,
} = require('../../config');
const {
  isIgnoreToken, setIgnoreToken, getLongToken, setLongToken,
} = require('../persistence/account');
const crypto = require('../util/crypto');
const { RESULT_CODE, EDIT_TOKEN } = require('../definition');
const logger = require('../util/log');
// jsonwebtoken 内包lib で、有効期限を現在日時から文字列で調整する機能
const ms = require('ms');

/**
 * JWTによる認証を行う
 * docode から a b を受ける
 * a b を BASE64 デコードする
 * c を クライアントIP からのハッシュで生成
 * a を b:iv c:salt として復号する
 *  できてること
 *    a 情報がAES暗号化：隠蔽されている
 *      トークン生成時の IP も含まれているので、ここでも同一性チェックをする
 *      CRYPTO_SALT を共通で持つ、ソルトとして使うのではなく、単なる一致確認で使う
 *       要するに、このサイトの機能で作られたトークンであるかをチェックする
 *       CRYPTO_SALT を暗号ソルトに使ってはいけない = 解読された時にソルトに解析用ソルトとして使われてしまうため
 *    b a を復号化するiv
 *    c クライアントIPアドレスが salt になっているので、復号できれば認証時IPと同一
 *      c はトークンには含まれないので、発信元IPが同一でなければ復号できない
 *
 * @param {string} token req.headers.authoriztion から取得できる token
 * @param {string} ipAddress req から取得できる ipAddress
 * @param {*} editToken トークンを破棄、あるいはリフレッシュする要求
 * @param {*} callback 成功時にトークン格納値を渡す
 * @param {*} errorCallback エラー時結果コードを渡す
 * @returns
 */
async function auth(token, ipAddress, editToken, callback, errorCallback) {
  if (!token || token === 'undefined' || token === 'null') {
    console.error('token is undefined');
    errorCallback(RESULT_CODE.INVALID_TOKEN);
    return;
  }
  // 無効トークンチェック
  const isIgnore = await isIgnoreToken(token);
  if (isIgnore) {
    errorCallback(RESULT_CODE.INVALID_TOKEN);
    return;
  }
  // トークンの無効化
  if ([EDIT_TOKEN.DESTROY, EDIT_TOKEN.RENEW].includes(editToken)) {
    // 同期せずにinsert
    destroyToken(token);
  }
  // チェック
  verifyToken(
    token,
    (decoded) => {
      let data;
      try {
        const json = specialVerify(ipAddress, decoded);
        if (!json) {
          throw RESULT_CODE.INVALID_TOKEN;
        }
        // 正常トークンと判明
        // トークンの再作成要求の処理
        if (editToken === EDIT_TOKEN.RENEW) {
          json.newToken = create(ipAddress, json);
        }
        data = json;
      } catch (err) {
        errorCallback(RESULT_CODE.INVALID_TOKEN);
        return;
      }
      try {
        callback(data);
        return;
      } catch (err) {
        errorCallback(RESULT_CODE.ERROR);
        return;
      }
    },
    (err) => {
      if (err.name === 'TokenExpiredError') {
        // 不正トークンと判明 ignoreToken 登録はしない（次来てもエラーだから）
        errorCallback(RESULT_CODE.TOKEN_EXPIRED);
        return;
      }
      if (err.name === 'JsonWebTokenError') {
        // 不正トークンと判明 ignoreToken 登録はしない（次来てもエラーだから）
        errorCallback(RESULT_CODE.INVALID_TOKEN);
        return;
      }
      // 不正トークンと判明 ignoreToken 登録はしない（次来てもエラーだから）
      errorCallback(err);
      return;
    },
    TOKEN_KEY);
}

/*
 ペイロード（JSON）を可逆暗号化して、上でも下でも同じキーを共有
 IPアドレスを付与し、同じところからでなければ通さない
 生成時にリフレッシュトークンを生成して、ユーザーストアに格納しておく
 　JWT自体は 短時間　リフレッシュは長期間にしておく
 　要件毎に変えられるようにする
 認証ごとに毎回同じトークンにならないようにする
 　👆のためには、セッションストアが必要
*/

function specialVerify(ipAddress, decoded) {
  const {a, b} = decoded;
  const cryptedSource = crypto.decodeBase64Bytes(a);
  const iv = crypto.decodeBase64Bytes(b);
  const c = createCryptoSalt(ipAddress); // 復号ソルトとして使う
  const decryptedA = crypto.decryptAes(
    cryptedSource,
    iv,
    CRYPTO_KEY,
    c);
  const {json, ip, createDate, salt} = JSON.parse(decryptedA);
  // 値の検証 IPアドレスは生成時と一致しないと復号不可かつ一致確認、saltは単なる固定文字
  if (!json || !ip || ip != ipAddress || !createDate || salt !== CRYPTO_SALT) {
    logger.error(`invalid decoded jwt data is unknown format
    tokenIp: ${ip} != ipAddress: ${ipAddress}
    salt: ${salt} !== CRYPTO_SALT: ${CRYPTO_SALT}
    ${decryptedA}`);
    // 不正トークンと判明 ignoreToken 登録はしない（次来てもエラーだから）
    // 空返却
    return null;
  }
  return json;
}

/**
 * JWT で行う認証用のトークンを発行する
 * a:データを暗号化したもの:ivとsaltで可逆暗号されBASE64する
 * b:aのiv:ランダム生成しBASE64する
 * c:aのsalt クライアントIPのハッシュ
 * @param {*} ipAddress
 * @param {*} json
 * @returns
 */
function create(ipAddress, json) {
  const createDate = Date.now();
  const saveData = {
    json,
    ip: ipAddress, // 復号できた後に念のため一致確認のために使う、暗号ソルトとしては使われない（けど、データに含まれるので結果ソルトの効果がある）
    createDate,
    salt: CRYPTO_SALT, // 復号できた後に念のため一致確認のために使う、暗号ソルトとしては使われない（けど、データに含まれるので結果ソルトの効果があるが毎回同じ値なので、悪意復号を惑わす効果くらいしかない）
  };
  const c = createCryptoSalt(ipAddress); // 暗号ソルトとして使う　復号のとき、要求元のIPを同く createCryptoSalt して復号ソルトにして、復号できるか確認する
  const {iv, result} = crypto.encryptAes(
    JSON.stringify(saveData),
    CRYPTO_KEY,
    c,
  );
  const a = crypto.encodeBase64Bytes(result);
  const b = crypto.encodeBase64Bytes(iv);
  return createToken(
    {
      a,
      b,
    },
    TOKEN_KEY,
    TOKEN_EXPIRE
  );
}

/**
 * 再取得用の長期トークンを発行する
 * Date.nowをSha512Base64したものをDBに格納するだけ
 *
 * @param {*} accountNo
 * @returns token
 */
async function createLongToken(accountNo) {
  const createDate = Date.now();
  const token = createCryptoSalt(`${createDate}`);
  const expire = timespan(LONG_TOKEN_EXPIRE) * 1000;

  await setLongToken(token, new Date(expire), accountNo);
  return token;
}

/**
 * リフレッシュトークンを確認して、対象アカウントNoを得る
 *
 * @returns アカウントNo
 */
async function authLongTokenAndGetAccountNo(token) {
  const longToken = await getLongToken(token);
  if (longToken) {
    return longToken.accountNo;
  }
}

/** トークンの無効化 */
const destroyToken = async (token) => {
  // 現在日時からTOKEN_EXPIRE の日付をとる
  // すでに作られたトークンである以上、現在日時から TOKEN_EXPIRE 後は確実に expired だから
  const expire = timespan(TOKEN_EXPIRE);
  await setIgnoreToken(token, new Date(expire * 1000));
};

/** data から Sha512のBASE64 を得る  */
function createCryptoSalt(data) {
  return crypto.getSha512Base64(
    data,
    HASH_SALT,
    PASSWORD_ITERATION_COUNT,
    PASSWORD_HASH_LENGTH
  );
}


// jsonowebtoken の lib でやっていることのコピペ
function timespan(time) {
  var timestamp = Math.floor(Date.now() / 1000);

  if (typeof time === 'string') {
    var milliseconds = ms(time);
    if (typeof milliseconds === 'undefined') {
      return;
    }
    return Math.floor(timestamp + milliseconds / 1000);
  } else if (typeof time === 'number') {
    return timestamp + time;
  } else {
    return;
  }

};

module.exports = {
  auth, create, destroyToken, EDIT_TOKEN, createLongToken, authLongTokenAndGetAccountNo, specialVerify,
};
