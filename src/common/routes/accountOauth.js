const express = require('express');
const router = express.Router();
const config = require('../../config');
const { RESULT_CODE } = require('../definition');
const { start, callback, getUserInfo } = require('../auth/googleAuth');
const { doRoute, createToken, createLongToken } = require('./base/routeBase');
const {
  selectAccountByMailForOauthGoogle,
  insertNewAccountForOauthGoogle,
 } = require('../persistence/accountForOauth');
const crypto = require('../util/crypto');
const uuid = require('node-uuid');
const { toBase64Url } = require('../util/imageUtil');

/** Google認証先にリダイレクト */
router.get('/googleStart',
  [],
  async function(req, res) {
    start(res);
  }
);

/**
 * Googleコールバック アカウント登録 or 認証
 * JWT を返却
 */
router.get('/googleCallback',
  [],
  async function(req, res) {
    await callback(req, res,
      async (req, res, userInfo) => {
        doRoute(req, res, async (r) => {
          return await createOrFindGoogleUser(req, userInfo);
        });
      },
      (err) => {
        console.error(err);
      }
    );
  }
);

/**
 * クライアントサイドで行ったGoogleOauthの場合
 * 2023/3 までの古いやつ
 * Googleのトークンをクライアントが受け取っているので、
 * そのトークンをこのサーバで受け取って、このサーバの認証を行う
 * このサーバで、Googleに profile を問い合わせして、対象ユーザを
 * 探す or 登録して jwt を返却
 */
router.post('/googleToken',
  [],
  async function(req, res) {
    doRoute(req, res, async (r) => {
      const userInfo = await getUserInfo(req.body.token);
      return await createOrFindGoogleUser(req, userInfo);
    });
  }
);


/**
 * クライアントサイドで行ったGoogleOauthの場合
 * 2023/3 までの古いやつ
 * Googleのトークンをクライアントが受け取っているので、
 * そのトークンをこのサーバで受け取って、このサーバの認証を行う
 * このサーバで、Googleに profile を問い合わせして、対象ユーザを
 * 探す or 登録して jwt を返却
 */
router.post('/googleCredential',
  [],
  async function(req, res) {
    doRoute(req, res, async (r) => {
      const credential = r?.body?.googleCredentialResponse?.credential;
      if (!credential) {
        throw 'GoogleCredentialResponseがありません';
      }
      const base64Url = credential.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const str1 = atob(base64)
      const str2 = escape(str1)
      const str3 = decodeURIComponent(str2)
      const userInfo = JSON.parse(str3)
      return await createOrFindGoogleUser(req, userInfo);
    });
  }
);

function makeNonce(){
  return crypto.getSha512Base64(
    uuid.v4(),
    config.CRYPTO_KEY,
    config.PASSWORD_ITERATION_COUNT,
    config.PASSWORD_HASH_LENGTH);
}

async function createOrFindGoogleUser(req, userInfo) {
  let account = await selectAccountByMailForOauthGoogle(userInfo.email);
  if (!account) {
    await insertNewAccountForOauthGoogle(userInfo.email);
    account = await selectAccountByMailForOauthGoogle(userInfo.email);
  }
  if (!account.activate) {
    throw RESULT_CODE.NOT_ACTIVATED;
  }

  const {token, expire} = createToken(req, { account });
  const longToken = await createLongToken(account.accountNo);
  console.log(`createLongTokenByGoogle [${account.accountNo}]
${longToken}`);
  const userIcon = !!userInfo?.picture ? await toBase64Url(userInfo?.picture) : null;
  return {
    account,
    token,
    longToken,
    expire,
    userIcon,
    googleUserInfo: userInfo,
  };
}

module.exports = {
  router,
};
