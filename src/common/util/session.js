const logger = require('./log');
const response = require('./response');
const { RESULT_CODE } = require('../definition');
const config = require('../../config');
const crypto = require('./crypto');
const uuid = require('node-uuid');

const sess = {};

function createNewToken() {
    const src = uuid.v4();
    const token = crypto.getSha256(src, config.SESSION_CONFIG.secret);
    return token;
}

function createNewExpire() {
    const expire = new Date();
    expire.setSeconds(expire.getSeconds() + config.SESSION_CONFIG.expireSeconds);
    return expire;
}

/**
 * セッション情報の取得、更新、新規作成
 * @param {*} token トークン
 * @param {string} ip address
 * @param {*} params 更新用パラメタ　isUpdate==trueのときにのみ、この値でデータを上書きする
 * @param {*} isUpdate 値を更新する場合、これがtrueのとき、isTokenUpdateもtrueと判断される
 * @param {*} isTokenUpdate トークンを更新する場合true isUpdateがtrueのとき、isTokenUpdateがfalseでも更新される
 * @returns
 */
function createOrRefreshSess(token, ip, params, isUpdate, isTokenUpdate) {
    const now = new Date();
    let currentSess;
    // NGチェック
    if (token) {
        if (!Object.keys(sess).includes(token)) {
            throw RESULT_CODE.INVALID_TOKEN;
        }
        if (sess[token].auth.expire < now) {
            throw RESULT_CODE.TOKEN_EXPIRED;
        }
        if (sess[token].auth.ip !== ip) {
            throw RESULT_CODE.INVALID_IP;
        }
        currentSess = sess[token];
    } else {
        // token null で isUpdate false はシステム例外
        if (!isUpdate) {
            throw RESULT_CODE.ERROR;
        }
        currentSess = {};
    }

    const newExpire = createNewExpire();
    if (isTokenUpdate || isUpdate) {
        const newToken = createNewToken();
        if (isUpdate) {
            currentSess = params;
        }
        currentSess.auth = {
            token: newToken,
            ip,
            expire: newExpire,
        };
        sess[newToken] = currentSess;
        delete sess[token];
    } else {
        currentSess.auth.expire = newExpire;
    }
    return currentSess;
}

/**
 * セッションを開始する
 * 既存セッションは削除
 * param 第一キーをセットする
 * @param {string} ip address
 * @param {Object} params
 * @param {function} callback セッション生成後処理
 */
exports.start = (ip, params) => {
    return createOrRefreshSess(null, ip, params, true, true);
};

/** セッションが有効ならtrue 無効ならfalseを返却 */
exports.get = (token, ip, isTokenUpdate) => {
    return createOrRefreshSess(token, ip, null, isTokenUpdate);
};

exports.set = (token, ip, params) => {
    if (!token) {
        throw RESULT_CODE.INVALID_TOKEN;
    }
    return createOrRefreshSess(token, ip, params, isUpdate, true);
};

/**
 * メールアドレスが、運営アカウントであるとき true
 * @param {string}} mail
 */
exports.isAdminMail = (mail) => {
    return config.ADMIN_ACCOUNT_LIST.includes(mail);
};
