const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
const { makeQuery } = require('../util/queryStringUtil');
const config = require('../../config');
const { error } = require('../util/log');
const { RESULT_CODE } = require('../definition');
const crypto = require('../util/crypto');
const kv = require('../persistence/kv');

// LINE oAuth 用の kv キーを作る
const createKeyForLineState = (state, ipAddress) => {
    return `lineAuth_start_${state}_${ipAddress}`;
};

/** LINE 認証を開始する、LINEの認証画面にリダイレクト
 * これを使わずに、同じパラメタで直接URLで遷移しても問題ない
 */
async function start(state, ipAddress, auth, res){
    // PKCE
    // https://developers.line.biz/ja/docs/line-login/integrate-pkce/
    const codeVerifier = crypto.getRandomString(128);
    const codeChallenge = crypto.createCodeChallengeForLine(codeVerifier);

    // nonce
    const nonce = crypto.getRandomString(12);

    //KV に保存
    const saveValue = {
      codeChallenge,
      codeVerifier,
      accountNo: auth?.account?.accountNo,
      nonce,
    };
    await kv.save(createKeyForLineState(state, ipAddress), JSON.stringify(saveValue), 1);

    res.redirect(302,
        `https://access.line.me/oauth2/v2.1/authorize?` +
        `response_type=code&` +
        `client_id=${config.LINE_OAUTH_SETTING.client_id}&` +
        `redirect_uri=${decodeURIComponent(config.LINE_OAUTH_SETTING.redirect_uri)}&` +
        `state=${state}&` +
        `scope=${config.LINE_OAUTH_SETTING.scope}&` +
        `nonce=${nonce}&` +
        `bot_prompt=${config.LINE_OAUTH_SETTING.bot_prompt}&` +
        `code_challenge=${codeChallenge}&` +
        `code_challenge_method=S256`);
}

/**
 * LINE Developer に設定済みならば、start で認証成功したのち、これが呼ばれる
 */
async function callback(code, state, ipAddress){
    const kvKey = createKeyForLineState(state, ipAddress);
    const _value = await kv.get(kvKey);
    const {codeVerifier} = JSON.parse(_value);

    if (!codeVerifier) throw RESULT_CODE.ERROR;

    // kv 消去 非同期
    kv.del(kvKey);

    const fetchResult = await fetch('https://api.line.me/oauth2/v2.1/token',
    {
        method: 'POST',
        headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: makeQuery({
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': config.LINE_OAUTH_SETTING.redirect_uri,
        'client_id': config.LINE_OAUTH_SETTING.client_id,
        'client_secret': config.LINE_OAUTH_SETTING.client_secret,
        'code_verifier': codeVerifier,
        }),
    });

    const {
        'access_token': accessToken,
        'expires_in': expiresIn,
        'id_token': idToken,
        'refresh_token': refreshToken,
        scope,
        'token_type': tokenType,
    } = await fetchResult.json();

    /**
     * {
     *  exp: 有効期限　秒
     *  iat: 認証日時　秒
     *  name: LINE名前
     *  picture: アイコン
     *  sub: LINE ユーザーID
     * }
     */
    const lineProfile = jwt.decode(idToken);

    return {
        accessToken,
        expiresIn,
        idToken,
        refreshToken,
        scope,
        tokenType,
        lineProfile,
    };
}

/**
 * トークン有効確認
 * @param {*} accessToken
 * @returns
 */
async function verifyToken(accessToken) {
    const fetchResult = await fetch('https://api.line.me/oauth2/v2.1/verify',
        {
            method: 'GET',
            body: makeQuery({
                'access_token': accessToken,
            }),
        });

    const {
        scope,
        'client_id': clientId,
        'expires_in': expiresIn
    } = await fetchResult.json();

    return {
        scope, clientId, expiresIn,
    };
}

/**
 * トークンリフレッシュ
 * @param {*} refreshToken
 * @returns
 */
async function refreshToken(refreshToken) {
    const fetchResult = await fetch('https://api.line.me/oauth2/v2.1/token',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: makeQuery({
                'grant_type': 'refresh_token',
                'refresh_token': refreshToken,
                'client_id': config.LINE_OAUTH_SETTING.client_id,
                'client_secret': config.LINE_OAUTH_SETTING.client_secret,
            }),
        });

    const {
        'access_token': accessToken,
        scope,
        'token_type': tokenType,
        'expires_in': expiresIn,
        'refresh_token': newRefreshToken,
    } = await fetchResult.json();

    return {
        accessToken,
        scope,
        tokenType,
        expiresIn,
        refreshToken: newRefreshToken,
    };
}

/**
 * ユーザ情報を取得
 * @param {String} accessToken
 * @returns
 */
async function getUserInfo(accessToken) {
    const result = await fetch('https://api.line.me/v2/profile', {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        }
    });
    const {
        userId,
        displayName,
        pictureUrl,
        statusMessage,
    } = await result.json();
    if (!resultJson.email) {
        error(`error ${url} [${JSON.stringify(resultJson)}]`);
        throw RESULT_CODE.INVALID_TOKEN;
    }
    return {
        userId,
        displayName,
        pictureUrl,
        statusMessage,
    };
}

module.exports = {
    start,
    callback,
    getUserInfo,
    verifyToken,
    refreshToken,
};
