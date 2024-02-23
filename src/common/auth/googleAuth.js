const fetch = require('node-fetch');
const { makeQuery } = require('../util/queryStringUtil');
const config = require('../../config');
const { error } = require('../util/log');
const { RESULT_CODE } = require('../definition');

/** Google 認証を開始する、Googleの認証画面にリダイレクト
 * これを使わずに、同じパラメタで直接URLで遷移しても問題ない
 */
function start(res){
    const params = makeQuery({
        client_id: config.GOOGLE_OAUTH_SETTING.client_id,
        redirect_uri: config.GOOGLE_OAUTH_SETTING.redirect_uri,
        response_type: config.GOOGLE_OAUTH_SETTING.response_type,
        scope: config.GOOGLE_OAUTH_SETTING.scope,
    });
    res.redirect(302, `${config.GOOGLE_OAUTH_SETTING.auth_uri}?${params}`);
}

/**
 * GCP に設定済みならば、start で認証成功したのち、これが呼ばれる
 *  もらったアカウント情報を onSuccess に渡す
 * @param {*} req
 * @param {*} res
 * @param {*} onSuccess Google認証成功、Googleアカウント情報取得成功したら呼ぶ
 * @param {*} onFail Google処理失敗したら呼ぶ
 */
async function callback(req, res, onSuccess, onFail){
    try {
        const googleRes = await fetch(config.GOOGLE_OAUTH_SETTING.token_uri, {
            method: 'POST',
            headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: makeQuery({
            client_id: config.GOOGLE_OAUTH_SETTING.client_id,
            client_secret: config.GOOGLE_OAUTH_SETTING.client_secret,
            code: req.query.code,
            grant_type: config.GOOGLE_OAUTH_SETTING.grant_type,
            redirect_uri: config.GOOGLE_OAUTH_SETTING.redirect_uri,
            }),
        });
        const json = await googleRes.json();
        if (json?.error || !json) {
            throw json;
        }
        const userInfo = await getUserInfo(json.access_token);
        onSuccess(req, res, userInfo);
    } catch(err) {
        onFail(err);
    }
}

/**
 * ユーザ情報を取得
 * @param {String} token
 * @returns
 */
async function getUserInfo(token) {
    // このトークンでGoogleからユーザ情報を取得できることで、正しさを検証する
    const url = config.GOOGLE_OAUTH_SETTING.email_uri;
    const result = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
        }
    });
    const resultJson = await result.json();
    if (!resultJson.email) {
        error(`error ${url} [${JSON.stringify(resultJson)}]`);
        throw RESULT_CODE.INVALID_TOKEN;
    }
    return resultJson;
}

module.exports = {
    start,
    callback,
    getUserInfo,
};
