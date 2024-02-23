const express = require('express');
const { PARAMS, VALIDATOR } = require('../validateParams');
const router = express.Router();
const { doRoute, doAuthRoute, createToken, createLongToken, getAccountNoByLongToken, } = require('./base/routeBase');
const config = require('../../config');
const { RESULT_CODE, ACCOUNT_ACTIVATE, EDIT_TOKEN } = require('../definition');
const {
  selectAccountByMailAndHash,
  selectAccountByNo,
  insertNewAccount,
  updateAccountActivate,
  updatePasswordResetable,
  updatePassword,
 } = require('../persistence/account');
const uuid = require('node-uuid');
const { sendTo } = require('../util/mail');
const log = require('../util/log');
const definition = require('../definition');
const crypto = require('../util/crypto');
const { isNotEmpty, isEmpty } = require('../util/commonUtils');

/** ログイン */
router.post('/login',
  [
    PARAMS.ACCOUNT_MAIL,
    PARAMS.PASSWORD_ON_LOGIN,
    PARAMS.GET_LONG_TOKEN,
  ],
  async function(req, res) {
    doRoute(req, res, async (r) => {
      const mail = r.body.mail;
      const password = r.body.password;
      const hash = getPassHash(password);
      const account = await selectAccountByMailAndHash(mail, hash);
      if (!account) {
        throw RESULT_CODE.AUTH_FAILURE;
      }
      if (!account.activate) {
        throw RESULT_CODE.NOT_ACTIVATED;
      }

      const {token, expire} = createToken(req, { account });
      const longToken = r.body.keepLogin ? await createLongToken(account.accountNo) : null;

      return {
        account,
        token,
        expire,
        longToken,
      };
    });
  }
);

/** 長期トークンを受けて、新しいトークンに差し替える、現在のトークンは無効化される */
router.post('/loginByLongToken',
  [
    VALIDATOR.anyRequired('longToken'),
  ],
  async function(req, res) {
    doRoute(req, res, async (r) => {
      const longToken = r.body.longToken;
      const accountNo = await getAccountNoByLongToken(longToken);
      if (isEmpty(accountNo)) {
        throw RESULT_CODE.TOKEN_EXPIRED;
      }
      const account = await selectAccountByNo(accountNo);
      if (account?.activate !== 1) {
        throw RESULT_CODE.NOT_ACTIVATED;
      }
      const {token, expire} = createToken(req, { account });
      const newLongToken = await createLongToken(account.accountNo);
      return {
        account,
        token,
        expire,
        longToken: newLongToken,
      };
    });
  }
);

/** アカウント登録 */
router.post('/register',
  [
    PARAMS.ACCOUNT_MAIL,
    PARAMS.PASSWORD_ON_REGISTER,
  ],
  async function(req, res) {
    doRoute(req, res, async (r) => {
      const mail = r.body.mail;
      const password = r.body.password;
      const hash = getPassHash(password);
      let accountNo;
      if (config.ACCOUNT_REGISTER_RULE.activateKeyType) {
        const activateKey = config.ACCOUNT_REGISTER_RULE.activateKey();
        accountNo = await insertNewAccount(mail, hash, activateKey, ACCOUNT_ACTIVATE.YET);
        sendTo(
          config.MAIL_CONFIG,
          mail,
          config.ADMIN_MAIL_ADDRESS.address,
          '',
          '',
          config.ACCOUNT_REGISTER_RULE.mail.description,
          config.ACCOUNT_REGISTER_RULE.mail.title,
          [
            { // URLでのアクティベート用
              before: config.ACCOUNT_REGISTER_RULE.activateKeyType,
              after: config.ACCOUNT_REGISTER_RULE.mail.activateValue(accountNo, activateKey),
            },
          ],
          (err, message) => {
            log.info(`MailResult:
            err:${err}
            message:${message}`);
          }
        );
      } else {
        // メール設定がなければ即時アクティベート
        accountNo = await insertNewAccount(mail, hash, passwordResetId, ACCOUNT_ACTIVATE.ACTIVE);
      }
      return {
        accountNo,
      };
    });
  }
);

/**
 * アカウント有効化
 * メールURLによる GET アクセスでの有効化
 */
 router.get('/activate/:accountNo/:passwordResetId',
  [
    PARAMS.ACCOUNT_NO,
    PARAMS.PASSWORD_RESET_ID,
  ],
  async function(req, res) {
    const accountNo = req.params.accountNo;
    const passwordResetId = req.params.passwordResetId;
    const updateResult = await updateAccountActivate(accountNo, passwordResetId);
    res.redirect(config.ACCOUNT_REGISTER_RULE.afterActivateRedirect);
  }
);

/**
 * アカウント有効化
 * メールに送られた番号による POST アクセスでの有効化
 */
router.post('/activate',
  [
    PARAMS.ACTIVATE_NUMBER,
  ],
  async function(req, res) {
    doRoute(req, res, async (r) => {
        const key = req.body.activateNumber;

        const [accountNo, passwordResetId] = key.split('-');
        const updateResult = await updateAccountActivate(accountNo, passwordResetId);

        return {
          result: RESULT_CODE.OK,
        };
      }
    );
  }
);

/**
 * アカウントをパスワードリセット可能状態にする
 * ログインできなくなる
 */
router.post('/resetPassword',
  [
    PARAMS.ACCOUNT_MAIL,
  ],
  async function(req, res) {
    doRoute(req, res, async (r) => {
      const p = req.body;
      // ログイン不可になる
      const passwordResetId = makeRandomPassword();
      try {
        await updatePasswordResetable(
          p.mail,
          ACCOUNT_ACTIVATE.YET,
          passwordResetId,
          getPasswordResetLimit());
        sendTo(
          config.MAIL_CONFIG,
          p.mail,
          config.ADMIN_MAIL_ADDRESS.address,
          '',
          '',
          config.PASSWORD_RESET.mail.description,
          config.PASSWORD_RESET.mail.title,
          [
            { // URLでのアクティベート用
              before: definition.EXCHANGE_KEY.URL,
              after: config.PASSWORD_RESET.mail.url(passwordResetId),
            },
          ],
          (err, message) => {
            log.info(`MailResult:
            err:${err}
            message:${message}`);
          }
        );
      } catch (err) {
        // 処理対象がないなどのエラーは、不正防止のため、正常で返却する
        if (err.errno !== definition.DB_ERROR.NOT_FOUND.errno) {
          throw err;
        }
      }
      return {
         result: RESULT_CODE.OK,
      };
    });
  }
);

/**
 * パスワード変更
 * ログインできるようになる
 */
router.post('/changePassword',
  [
    PARAMS.ACCOUNT_MAIL,
    PARAMS.PASSWORD_ON_REGISTER,
    PARAMS.PASSWORD_RESET_ID,
  ],
 async function(req, res) {
   doRoute(req, res, async (r) => {
     const p = req.body;
     // ログインできるようになる
     await updatePassword(
       p.mail,
       p.passwordResetId,
       getPassHash(p.password));
     return {
        result: RESULT_CODE.OK,
     };
   });
 }
);

router.post('/checkToken',
  [],
  async function(req, res) {
    doAuthRoute(req, res, async (r, auth) => {
      return {
        result: 'OK',
      };
    });
  },
);

router.post('/logout',
  [],
  async function(req, res) {
    doAuthRoute(req, res, async () => {
      return {};
    }, EDIT_TOKEN.DESTROY);
  },
);

/** 有効なトークンを受けて、新しいトークンに差し替える、現在のトークンは無効化される */
router.post('/refreshToken',
  [],
  async function(req, res) {
    doAuthRoute(req, res, async (r, auth) => {
      return {
        newToken: {
          token: auth.newToken.token,
          expire: auth.newToken.expire,
        },
      };
    }, EDIT_TOKEN.RENEW);
  },
);

/** パスワードハッシュ */
function getPassHash(password){
  return crypto.getSha512Base64(
    password,
    config.CRYPTO_KEY,
    config.PASSWORD_ITERATION_COUNT,
    config.PASSWORD_HASH_LENGTH);
}

/** 初期登録やリセット時のランダムパスワードを生成 */
function makeRandomPassword(){
  return crypto.getSha256(uuid.v4());
}

/** パスワードリセットリミット */
function getPasswordResetLimit(){
  let dt = new Date();
  dt.setMinutes(dt.getMinutes() + config.PASSWORD_RESET_LIMIT_MINUTES);
  return dt;
}

module.exports = {
  router,
};
