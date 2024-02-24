const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const { EXCHANGE_KEY } = require("./common/definition");
const { createRandomNumber } = require("./common/util/commonUtils");
const uuid = require("node-uuid");

//production or development (default: development)
const ENV = process.argv.find((arg) => arg === "production")
  ? "production"
  : "development";
console.log(`ENV = ${ENV}`);

// secret config があればとる
let configSecret;
try {
  configSecret = require("../configSecret");
  if (!configSecret) {
    throw "no file";
  }
} catch (err) {
  console.log("configSecret get from env");
  console.log("-----------------------");
  console.log(process.env.configSecret);
  console.log("-----------------------");
  configSecret = JSON.parse(process.env.configSecret);
}
console.log("for env entry viewing");
console.log("-----------------------");
console.log(`${JSON.stringify(configSecret)}`);
console.log("-----------------------");

const SITE_URL_HEADER_LIST = {
  production: "https://xxxxxx.com/",
  development: "http://localhost:3000/",
};

const LOG_CONFIG_LIST = {
  //本番
  production: {
    appenders: {
      console: {
        type: "console",
      },
      system: {
        type: "dateFile",
        filename: "/var/log/novelBuilder/system.log",
        pattern: "-yyyy-MM-dd",
      },
      error: {
        type: "dateFile",
        filename: "/var/log/novelBuilder/error.log",
        pattern: "-yyyy-MM-dd",
      },
    },
    categories: {
      default: {
        appenders: ["console", "system"],
        level: "debug",
      },
      error: {
        appenders: ["console", "error"],
        level: "warn",
      },
    },
  },
  //ログテスト用
  development: {
    appenders: {
      console: {
        type: "console",
      },
      system: {
        type: "dateFile",
        filename: "/var/log/novelBuilder/system.log",
        pattern: "-yyyy-MM-dd",
      },
      error: {
        type: "dateFile",
        filename: "/var/log/novelBuilder/error.log",
        pattern: "-yyyy-MM-dd",
      },
    },
    categories: {
      default: {
        appenders: ["console", "system"],
        level: "debug",
      },
      error: {
        appenders: ["console", "error"],
        level: "warn",
      },
    },
  },
};

// 以下はACCOUNT_REGISTER_RULE_LISTに設定する設定例の列挙
// ACCOUNT_REGISTER_RULE_LIST　に直接設定しても構わない
const ACCOUNT_MAIL_CHECK = {
  NO_CHECK: {
    //アカウントは登録後即時 activate される
    activateKeyType: false,
    activateKey: () => null,
    afterActivateRedirect: "/",
  },
  MAIL_URL: {
    //アカウント登録後送られるメールにアクティベート用URLが送られる
    activateKeyType: EXCHANGE_KEY.URL,
    activateKey: () => encodeURI(uuid.v4()),
    mail: {
      title: "メールアドレス確認のお願い",
      description: [
        "アカウントの登録ありがとうございます。",
        "以下のURLにアクセスして、アカウント登録を完了させてください。",
        EXCHANGE_KEY.URL,
      ].join("\n"),
      activateValue: (accountNo, key) =>
        `${SITE_URL_HEADER_LIST[ENV]}app/account/activate/${accountNo}/${key}`,
    },
    afterActivateRedirect: "/",
  },
  MAIL_NUMBER: {
    //アカウント登録後送られるメールにアクティベート用番号が送られる
    activateKeyType: EXCHANGE_KEY.NO,
    activateKey: () => createRandomNumber(6),
    mail: {
      title: "アカウント有効化番号のお知らせ",
      description: [
        "アカウントの登録ありがとうございます。",
        "以下の番号を運営に連絡して、アカウント登録を完了させてください。",
        EXCHANGE_KEY.NO,
      ].join("\n"),
      activateValue: (accountNo, key) => `${accountNo}-${key}`,
    },
    afterActivateRedirect: "/",
  },
};

// 上記例から設定しても、直接上記例のフォーマットで設定してもよい
const ACCOUNT_REGISTER_RULE_LIST = {
  //本番
  production: ACCOUNT_MAIL_CHECK.MAIL_NUMBER,
  //開発
  development: ACCOUNT_MAIL_CHECK.MAIL_URL,
};

// パスワードリセット用メール設定
const PASSWORD_RESET = {
  mail: {
    title: "パスワードリセット通知",
    description: [
      "パスワードをリセットしました。",
      "心当たりがない場合は、他者が不正にアカウントを操作した恐れがあります。",
      "運営にご連絡ください。",
      "以下のURLにアクセスして、アカウント登録を完了させてください。",
      EXCHANGE_KEY.URL,
    ].join("\n"),
    url: (key) => `${SITE_URL_HEADER_LIST[ENV]}changePassword.html?key=${key}`,
  },
  afterActivateRedirect: "/",
};

const GOOGLE_OAUTH_SETTING_COMMON = {
  response_type: "code",
  scope: "email profile",
  grant_type: "authorization_code",
  auth_uri: "https://accounts.google.com/o/oauth2/v2/auth",
  token_uri: "https://www.googleapis.com/oauth2/v4/token",
  email_uri: "https://www.googleapis.com/oauth2/v3/userinfo",
  successRedirect: "/index.html",
};

/** ファイルアップロードの設定 */
const FILE_UPLOAD_CONFIG_LIST = {
  //本番
  production: {
    image: {
      bytesMaxSize: 10 * 1024 * 1024, //10MB
      extensions: ["jpg", "jpeg", "png", "gif", "svg"],
      localStorage: false,
      uploadUrl: "https://ccs.miovp.com/create_image",
    },
    movie: {
      bytesMaxSize: 100 * 1024 * 1024, //100MB
      extensions: [
        "mov",
        "mp4",
        "mpg",
        "flv",
        "f4v",
        "ts",
        "3g2",
        "asf",
        "rm",
        "amc",
        "m4v",
        "mts",
        "wmv",
        "mpeg",
        "avi",
        "3gp",
        "mod",
      ],
      localStorage: false,
      uploadUrl: "https://ccs.miovp.com/create_video",
    },
  },
  //開発
  development: {
    image: {
      bytesMaxSize: 10 * 1024 * 1024, //10MB
      extensions: ["jpg", "jpeg", "png", "gif", "svg"],
      localStorage: true,
      uploadUrl: "/upload/image",
    },
    movie: {
      bytesMaxSize: 100 * 1024 * 1024, //100MB
      extensions: [
        "mov",
        "mp4",
        "mpg",
        "flv",
        "f4v",
        "ts",
        "3g2",
        "asf",
        "rm",
        "amc",
        "m4v",
        "mts",
        "wmv",
        "mpeg",
        "avi",
        "3gp",
        "mod",
      ],
      localStorage: true,
      uploadUrl: "/upload/movie",
    },
  },
};

const CORS_ORIGIN_LIST = {
  //本番
  production: "http://localhost",
  //開発
  development: "http://localhost",
};

/** サーバポート */
const SERVER_PORT = 3000;

const DB_INIT_FILES = {
  createTables: "createTables.sql",
  clearTables: "clearTables.sql",
  alterTables: "alterTables.sql",
  insertMasterData: "insertMasterData.sql",
};

/** パスワード忘れ再設定URLの有効期限（分） */
const PASSWORD_RESET_LIMIT_MINUTES = 10;

/** WEBサーバのクラスタリング */
const CLUSTER = {
  useCluster: false, //クラスタリングするなら true
  numClusters: 2, //require('os').cpus().length, //クラスター用にプロセスをforkする数
  isRestartWhenDied: true, //クラスタexitのときにリスタートするなら true
};

const IS_RUN_TABLE_CLEARE = process.argv.find((arg) => arg === "clearTables");
const IS_RUN_TABLE_CREATION = process.argv.find(
  (arg) => arg === "createTables"
);
const IS_RUN_TABLE_ALTER = process.argv.find((arg) => arg === "alterTables");
const IS_RUN_TABLE_INSERT_MASTER = process.argv.find(
  (arg) => arg === "insertMasterData"
);

function isTest() {
  return ENV === "development";
}

const IS_RUN_TABLE_CREATION_LIST = {
  //本番
  production: false,
  //開発
  development: false,
};

const FILE_UPLOAD_PATH = "/src/app/public/upload";

module.exports = {
  SITE_URL_HEADER: process.env.SITE_URL_HEADER || SITE_URL_HEADER_LIST[ENV],
  LOG_CONFIG: process.env.LOG_CONFIG
    ? JSON.parse(process.env.LOG_CONFIG)
    : LOG_CONFIG_LIST[ENV],
  MAIL_CONFIG: process.env.MAIL_CONFIG
    ? JSON.parse(process.env.MAIL_CONFIG)
    : configSecret.MAIL_CONFIG_LIST[ENV],
  ADMIN_MAIL_ADDRESS: process.env.ADMIN_MAIL_ADDRESS
    ? JSON.parse(process.env.ADMIN_MAIL_ADDRESS)
    : configSecret.ADMIN_MAIL_ADDRESS_LIST[ENV],
  PASSWORD_RESET_LIMIT_MINUTES,
  DB_SETTING: process.env.DB_SETTING
    ? JSON.parse(process.env.DB_SETTING)
    : configSecret.DB_SETTING_LIST[ENV],
  DB_INIT_FILES,
  ACCOUNT_REGISTER_RULE: ACCOUNT_REGISTER_RULE_LIST[ENV],
  GOOGLE_OAUTH_SETTING: process.env.GOOGLE_OAUTH_SETTING
    ? JSON.parse(process.env.GOOGLE_OAUTH_SETTING)
    : {
        client_id: configSecret.GOOGLE_OAUTH_SETTING_LIST[ENV].client_id,
        client_secret:
          configSecret.GOOGLE_OAUTH_SETTING_LIST[ENV].client_secret,
        redirect_uri: configSecret.GOOGLE_OAUTH_SETTING_LIST[ENV].redirect_uri,
        response_type: GOOGLE_OAUTH_SETTING_COMMON.response_type,
        scope: GOOGLE_OAUTH_SETTING_COMMON.scope,
        auth_uri: GOOGLE_OAUTH_SETTING_COMMON.auth_uri,
        token_uri: GOOGLE_OAUTH_SETTING_COMMON.token_uri,
        email_uri: GOOGLE_OAUTH_SETTING_COMMON.email_uri,
        grant_type: GOOGLE_OAUTH_SETTING_COMMON.grant_type,
        successRedirect: GOOGLE_OAUTH_SETTING_COMMON.successRedirect,
      },
  LINE_OAUTH_SETTING: process.env.LINE_OAUTH_SETTING_LIST
    ? JSON.parse(process.env.LINE_OAUTH_SETTING_LIST)
    : {
        client_id: configSecret.LINE_OAUTH_SETTING_LIST[ENV].client_id,
        client_secret: configSecret.LINE_OAUTH_SETTING_LIST[ENV].client_secret,
        scope: configSecret.LINE_OAUTH_SETTING_LIST[ENV].scope,
        bot_prompt: configSecret.LINE_OAUTH_SETTING_LIST[ENV].bot_prompt,
        redirect_uri: configSecret.LINE_OAUTH_SETTING_LIST[ENV].redirect_uri,
        redirect_result:
          configSecret.LINE_OAUTH_SETTING_LIST[ENV].redirect_result,
        channelAccessToken:
          configSecret.LINE_OAUTH_SETTING_LIST[ENV].channelAccessToken,
      },
  CRYPTO_KEY: configSecret.CRYPTO_KEY,
  CRYPTO_SALT: configSecret.CRYPTO_SALT,
  HASH_KEY: configSecret.HASH_KEY,
  HASH_SALT: configSecret.HASH_SALT,
  TOKEN_KEY: configSecret.TOKEN_KEY,
  TOKEN_EXPIRE: configSecret.TOKEN_EXPIRE,
  LONG_TOKEN_EXPIRE: configSecret.LONG_TOKEN_EXPIRE,
  TOKEN_ALGO: configSecret.TOKEN_ALGO,
  PASSWORD_ITERATION_COUNT: configSecret.PASSWORD_ITERATION_COUNT,
  PASSWORD_HASH_LENGTH: configSecret.PASSWORD_HASH_LENGTH,
  ALERT_MAIL: configSecret.ALERT_MAIL_LIST[ENV],
  isTest,
  ADMIN_ACCOUNT_LIST: configSecret.ADMIN_ACCOUNT_LIST,
  CLUSTER: process.env.CLUSTER ? JSON.parse(process.env.CLUSTER) : CLUSTER,
  SERVER_PORT,
  FILE_UPLOAD_CONFIG: process.env.FILE_UPLOAD_CONFIG
    ? JSON.parse(process.env.FILE_UPLOAD_CONFIG)
    : FILE_UPLOAD_CONFIG_LIST[ENV],
  IS_RUN_TABLE_CLEARE,
  IS_RUN_TABLE_CREATION,
  IS_RUN_TABLE_ALTER,
  IS_RUN_TABLE_INSERT_MASTER,
  CORS_ORIGIN: process.env.CORS_ORIGIN || CORS_ORIGIN_LIST[ENV],
  FILE_UPLOAD_PATH,
  GOV_HOUJIN_DB_ID: configSecret.GOV_HOUJIN_DB_ID,
  PASSWORD_RESET,
  AWS_S3: configSecret.AWS_S3_LIST[ENV],
  GIT_OAUTH: configSecret.GIT_OAUTH,
};
