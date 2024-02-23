const MESSAGE = {
    isEmpty: 'この項目は必須入力です。',
    isEmptyMapUrl: '地図上にピンが立てられていません。',
    isNotEmpty: 'この項目は入力不可です。',
    isNotEmail: '正しいメールアドレスを入力してください。',
    isNotTel: '電話番号は 10桁 or 11桁の数値として入力してください。',
    isNotLength8Password: 'パスワードは最低８ケタとしてください。',
    isSimplePassword: 'パスワードは、大文字、小文字、数字を含めて下さい。',
    isNotNumeric: '半角数値のみ入力できます。',
    isNotPlusNumeric: '半角のプラス整数入力できます。',
    isNotValid: '不正な入力です。',
    isNotDate: '日付/時間のみ入力できます。',
    isNotBoolean: '真偽値のみ入力できます。',
    isNotLengthTel: '10ケタ、もしくは11ケタの数値で入力してください。',
    hasTwoBytes: '全角文字は含められません。',
    hasOneBytes: '全角文字のみ入力できます。',
    isAlreadyRegisteredMail: 'すでに登録されたメールアドレスです。',
    isSamePassword: '新パスワードが変更前パスワードと一致しています。',
    isNotSameRePassword: '新パスワードと確認用パスワードが不一致です。',
    isNotChangablePasswordRequest: '要求は承認されません。',
    isNotUrl: 'URLを指定してください',
    isNotUUID: '不正な値です',
    isNotJSON: '不正な値です',
    isNotFound: '要求された情報が見つかりませんでした',
    isNotTargetPref: '入力された都道府県は対象外です',
    isNotTargetCity: '入力された市区町村は対象外です',
    isNotTargetLine: '入力された鉄道路線に、対象外路線が含まれています',
    isNotTargetStation: '入力された鉄道駅に、対象外鉄道駅が含まれています',
    isNotEnoughCondition: '条件が少なすぎます。市区町村、路線、駅のいずれかを選択してください。',
    isNotEnoughConditionForSearch: '条件が少なすぎます。',
    overMaxLength: function(max){
        return `${max}文字以下で入力してください。`;
    },
    underMinLength: function(min){
        return `${min}文字以上で入力してください。`;
    },
    isNotContainsEnums: '選択肢から選択してください。',
    isNotPastDate: '現在よりも過去の日付を指定してください。',
    isNotMailOrTel: '電話番号、またはメールアドレスのいずれかを入力してください。',
    isNotAgreement: '同意がない要求は実行されません。',
    isNotSameCustomerMail: 'メールアドレスが一致しません。',
    invalidDate: '日付が正しくありません。',
    isOverLimitResult: function(count){
        return `結果が${count}件を超えました`;
    },
    isEmptyArray: '不正な値です',
    isEmptyConditionIdWhenHistorySearch: '検索履歴を参照時は、検索条件IDが必要です',
    isEmptyHistoryCondition: '検索履歴がありません',
    isErrorFormatHistoryCondition: '検索履歴がただしくありません',
    isNotCheckedAgreement: '同意チェックをお願いします',
    isOverMaxSizeFile: function(bytesMaxSize, isMovie){
        return `${isMovie ? '動画' : '写真'}の最大容量は${Math.floor(bytesMaxSize / 1024 / 1024)}MBまでです。`;
    },
    isNotSupportType: 'この形式は対応していません',
    isInvalidOperation: '不正な画面遷移が行われました。セキュリティを維持するため、情報の修正中は、別画面を表示することはできません。',
    isNotHalfAlphabetAndNumber: '半角英数字以外は入力出来ません',
};

/** DB.UPDATE_USER に記録する運用者の名称 */
const ADMIN_NAME_FOR_DB = 'ADMIN';

const HTTP_RESULT = {
    OK: 200,
    VALIDATE_ERROR: 400,
    UNAUTHORIZED: 401,
    NOT_FOUND: 404,
    ERROR: 500,
};

const RESULT_CODE = {
    OK: {
        code: 'OK',
        errorMessage: '',
        httpResult: HTTP_RESULT.OK
    },
    DB_DUPLICATED: {
        code: 'DB_DUPLICATED',
        errorMessage: 'すでに登録済みの情報があります。',
        httpResult: HTTP_RESULT.VALIDATE_ERROR
    },
    DB_NOT_FOUND: {
        code: 'DB_NOT_FOUND',
        errorMessage: '処理対象情報が見つかりません',
        httpResult: HTTP_RESULT.VALIDATE_ERROR
    },
    DB_ETC: {
        code: 'DB_ETC',
        errorMessage: 'データの登録/参照に失敗しました。',
        httpResult: HTTP_RESULT.ERROR
    },
    WRONG_PASSWORD: {
        code: 'WRONG_PASSWORD',
        errorMessage: 'ログイン情報に誤りがあります。',
        httpResult: HTTP_RESULT.VALIDATE_ERROR
    },
    NOT_FOUND_CLIENT: {
        code: 'NOT_FOUND_CLIENT',
        errorMessage: 'ログイン情報に誤りがあります。',
        httpResult: HTTP_RESULT.VALIDATE_ERROR
    },
    AUTH_FAILURE: {
        code: 'AUTH_FAILURE',
        errorMessage: 'ログイン情報に誤りがあります。',
        httpResult: HTTP_RESULT.VALIDATE_ERROR
    },
    NOT_ACTIVATED: {
        code: 'NOT_ACTIVATED',
        errorMessage: `ログインが未承認です。`,
        // errorMessage: `ログインが未承認です。アカウント登録や、パスワード変更直後の場合、メールを確認ください。心当たりがない場合は他者が不正にアカウントを操作した恐れがありますので、運営にご連絡ください。`,
        httpResult: HTTP_RESULT.UNAUTHORIZED
    },
    NEED_AGREEMENT: {
        code: 'NEED_AGREEMENT',
        errorMessage: '利用規約の承認が必要です。',
        httpResult: HTTP_RESULT.OK
    },
    ERROR_VALIDATION: {
        code: 'ERROR_VALIDATION',
        errorMessage: '入力内容に誤りがあります。',
        httpResult: HTTP_RESULT.VALIDATE_ERROR
    },
    MAIL_TO_CLIENT_SEND_FAILURE: {
        code: 'MAIL_TO_CLIENT_SEND_FAILURE',
        errorMessage: "登録完了メールの送信に失敗しました。\n運営会社にお問い合わせください。",
        httpResult: HTTP_RESULT.OK
    },
    FAILURE_PASSWORD_CHANGE: {
        code: 'FAILURE_PASSWORD_CHANGE',
        errorMessage: "パスワード変更に失敗しました。",
        httpResult: HTTP_RESULT.UNAUTHORIZED
    },
    FAILURE_PASSWORD_RESET: {
        code: 'FAILURE_PASSWORD_RESET',
        errorMessage: "パスワードリセット要求に失敗しました。",
        httpResult: HTTP_RESULT.ERROR
    },
    ALREADY_AGREED: {
        code: 'ALREADY_AGREED',
        errorMessage: "すでに承諾済みです。",
        httpResult: HTTP_RESULT.VALIDATE_ERROR
    },
    IS_NOT_ALIVE_SESSION: {
        code: 'IS_NOT_ALIVE_SESSION',
        errorMessage: "セッションが無効です。",
        httpResult: HTTP_RESULT.VALIDATE_ERROR
    },
    VALIDATION_EXECUTE_ERROR: {
        code: 'VALIDATION_EXECUTE_ERROR',
        errorMessage: "バリデーション処理異常検知",
        httpResult: HTTP_RESULT.ERROR
    },
    CSRF_VERIFY_ERROR: {
        code: 'CSRF_VERIFY_ERROR',
        errorMessage: "セキュリティトークン違い or 有効期限切れ",
        httpResult: HTTP_RESULT.VALIDATE_ERROR
    },
    OVER_SUGGEST: {
        code: 'OVER_SUGGEST',
        errorMessage: "サジェスト結果閾値超え",
        httpResult: HTTP_RESULT.ERROR
    },
    NO_DATA: {
        code: 'NO_DATA',
        errorMessage: "指定期間中のデータはありませんでした",
        httpResult: HTTP_RESULT.NOT_FOUND
    },
    INVALID_TOKEN: {
        code: 'INVALID_TOKEN',
        errorMessage: '指定されたトークンは不正です',
        httpResult: HTTP_RESULT.UNAUTHORIZED,
    },
    INVALID_IP: {
        code: 'INVALID_IP',
        errorMessage: '指定されたトークンは別の接続元で使用中です',
        httpResult: HTTP_RESULT.UNAUTHORIZED,
    },
    TOKEN_EXPIRED: {
        code: 'TOKEN_EXPIRED',
        errorMessage: '指定されたトークンは期限切れです',
        httpResult: HTTP_RESULT.UNAUTHORIZED,
    },
    ERROR: {
        code: 'ERROR',
        errorMessage: 'エラーが発生しました。',
        httpResult: HTTP_RESULT.ERROR
    },
    OVER_FILE_SIZE: {
        code: 'OVER_FILE_SIZE',
        errorMessage: 'ファイルサイズが規定量を超過しています。',
        httpResult: HTTP_RESULT.ERROR
    },
    NOT_SUPPORT_FILE_TYPE: {
        code: 'NOT_SUPPORT_FILE_TYPE',
        errorMessage: 'ファイルの種別が未対応です。',
        httpResult: HTTP_RESULT.ERROR
    },
    THROW_CLOUD_VISION: (err) => ({
        code: 'THROW_CLOUD_VISION',
        errorMessage: `Googleにてエラー: ${JSON.stringify(err)}`,
        httpResult: HTTP_RESULT.ERROR
    }),
    NEED_LOGIN: {
        code: 'ERROR',
        errorMessage: 'ログインが必要です。',
        httpResult: HTTP_RESULT.UNAUTHORIZED
    },
    NO_CHANGED: {
        code: 'NO_CHANGED',
        errorMessage: "変更がありません。",
        httpResult: HTTP_RESULT.VALIDATE_ERROR
    },
    INVALID_CSRF_KEY: {
        code: 'INVALID_CSRF_KEY',
        errorMessage: '不正な操作です。',
        httpResult: HTTP_RESULT.VALIDATE_ERROR,
    },
    DATA_UNAUTH: {
        code: 'DATA_UNAUTH',
        errorMessage: 'データに対する権限がありません。',
        httpResult: HTTP_RESULT.UNAUTHORIZED,
    },
};

const EXCHANGE_KEY = {
    URL: '%url%',
    NAME: '%name%',
    COMPANY_NAME: '%companyName%',
    ADDRESS: '%address%',
    MAIL: '%mail%',
    TEL: '%tel%',
    NO: '%no%',
    LICENSE_NO: '%licenseNo%',
    DATETIME: '%datetime%',
    BODY: '%body%',
    ASK_TYPE: '%askType%',
    DESIRE_DATE1: '%desireDate1%',
    DESIRE_DATE2: '%desireDate2%',
    DESIRE_DATE3: '%desireDate3%',
    BUILD_NAME: '%buildName%',
    RENT: '%rent%',
    MANAGE_FEE: '%manageFee%',
    SECURE_DEPOSIT: '%secureDeposit%',
    KEY_DEPOSIT: '%keyDeposit%',
    SQUARE_METER: '%squareMeter%',
    BEFORE: '%before%',
    AFTER: '%after%',
};

const DB_ERROR = {
    DUPLICATE: {
        errno: 1062,
        message: RESULT_CODE.DB_DUPLICATED.errorMessage,
        resultCode: RESULT_CODE.DB_DUPLICATED,
    },
    DATA_UNAUTH: {
        errno: 99996,
        message: RESULT_CODE.DATA_UNAUTH.errorMessage,
        resultCode: RESULT_CODE.DATA_UNAUTH,
    },
    UNEXPECTED: {
        errno: 99997,
        message: '期待した数の更新がされませんでした',
        resultCode: RESULT_CODE.DB_ETC,
    },
    NOT_FOUND: {
        errno: 99998,
        message: '処理対象情報がみつかりません',
        resultCode: RESULT_CODE.DB_NOT_FOUND,
    },
    UNKNOWN: {
        errno: 99999,
        message: RESULT_CODE.DB_ETC.errorMessage,
        resultCode: RESULT_CODE.DB_ETC,
    },
    is: (err) => {
        const result = [
            DB_ERROR.DUPLICATE,
            DB_ERROR.UNEXPECTED,
            DB_ERROR.NOT_FOUND,
            DB_ERROR.UNKNOWN
        ].find(e => e.errno === err.errno);
        if (result) {
            return result;
        }
        if (err.errno || err.sqlMessage) {
            return {
                errno: err.errno,
                message: err.sqlMessage,
                resultCode: RESULT_CODE.ERROR,
            };
        }
        return DB_ERROR.UNKNOWN;
    },
};

const ACCOUNT_ACTIVATE = {
    ACTIVE: 1,
    YET: 0,
};

const EDIT_TOKEN = {
    DESTROY: 'destroy', // ログアウトを想定 有効期限内のトークンを無効化
    RENEW: 'renew', // リフレッシュを想定 有効期限内のトークンを無効化し、新たなトークンを発行
};

module.exports = {
    MESSAGE,
    ADMIN_NAME_FOR_DB,
    HTTP_RESULT,
    DB_ERROR,
    RESULT_CODE,
    EXCHANGE_KEY,
    ACCOUNT_ACTIVATE,
    EDIT_TOKEN,
};
