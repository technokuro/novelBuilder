const ALERT_MAIL_LIST = {
    //本番
    production: {
        is: true,
        logLevel: 'error',
        mailFrom: 'test1@******.com',
        mailTo: 'test1@****.com',
        mailCC: [

        ],
        subject: 'エラーが発生しました'
    },
    //開発
    development: {
        is: false,
        logLevel: 'error',
        mailFrom: 'test1@***************.info',
        mailTo: '***************@***************.com',
        mailCC: [

        ],
        subject: 'エラーが発生しました'
    },
};

const MAIL_CONFIG_LIST = {
    //本番
    production: {
        host: 'smtp.***************.jp',
        port: 465,
        secure: true,
        requireTLS: true,
        tls: {
            rejectUnauthorized: false,
        },
        auth: {
            user: 'test1@****.com',
            pass: 'password'
        }
    },
    //開発
    development: {
        host: 'smtp.***************.jp',
        port: 465,
        secure: true,
        requireTLS: true,
        tls: {
            rejectUnauthorized: false,
        },
        auth: {
            user: 'test1@***************.info',
            pass: '***************'
        }
    }
};

const ADMIN_MAIL_ADDRESS_LIST = {
    //本番
    production: {
        address: 'test1@****.com'
    },
    //開発
    development: {
        address: 'test1@***************.info'
    },
}

const DB_SETTING_LIST = {
    //本番
    production: {
        host: 'localhost',
        user: 'hansha',
        password: 'hansha',
        database: 'hansha',
        port: 3306,
        timeout: 15000,
    },
    //開発
    development: {
        host: 'localhost',
        user: '***************',
        password: '***************',
        database: '***************',
        port: 3306,
        timeout: 15000,
    }
};

/**  暗号化キー パスワード生成に利用するので、運用後変更はできない
 運用後変更する場合は、前後措置が必要 **/
const CRYPTO_KEY = '***************';

/** 暗号化ソルト */
const CRYPTO_SALT = '***************';

/** ハッシュキーとソルト */
const HASH_KEY = '***************';
const HASH_SALT = '***************';

/** パスワードハッシュのイテレーション回数 */
const PASSWORD_ITERATION_COUNT = 1000;

/** パスワードハッシュの長 */
const PASSWORD_HASH_LENGTH = 64;

/** トークンキー */
const TOKEN_KEY = '***************';

/** トークン有効期限 */
const TOKEN_EXPIRE = '60m';
const LONG_TOKEN_EXPIRE = '30d';

const TOKEN_ALGO = 'HS512';

/** 管理者メール */
const ADMIN_ACCOUNT_LIST = [
    '***************@***************.com',
];

/** Google OAuth */
const GOOGLE_OAUTH_SETTING_LIST = {
    //本番
    production: {
        client_id: 'google_oauth_client_id',
        client_secret: 'client_secret',
        redirect_uri: 'http://localhost:3000/app/oauth/googleCallback',
    },
    //開発
    development: {
        client_id: '',
        client_secret: '',
        redirect_uri: '',
    },
}

module.exports = {
    ALERT_MAIL_LIST,
    MAIL_CONFIG_LIST,
    ADMIN_MAIL_ADDRESS_LIST,
    DB_SETTING_LIST,
    CRYPTO_KEY,
    CRYPTO_SALT,
    HASH_KEY,
    HASH_SALT,
    TOKEN_KEY,
    TOKEN_EXPIRE,
    LONG_TOKEN_EXPIRE,
    TOKEN_ALGO,
    PASSWORD_ITERATION_COUNT,
    PASSWORD_HASH_LENGTH,
    ADMIN_ACCOUNT_LIST,
    GOOGLE_OAUTH_SETTING_LIST,
};
