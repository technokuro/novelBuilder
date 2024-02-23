const {
    query,
    update,
    returnOne,
    checkUpdateResult,
} = require('./base/mysql');
const { DB_ERROR, ACCOUNT_ACTIVATE } = require('../definition');
const logger = require('../util/log');
const util = require('../util/commonUtils');
const config = require('../../config');

/**
 * メールとハッシュからアカウントを返却
 * メールログイン用
 */
exports.selectAccountByMailAndHash = async (mail, hash) => {
    const result = await query(
        `SELECT
            accountNo,
            mail,
            accountRole,
            activate,
            regDate,
            updDate
        FROM
            account
        WHERE
            mail = ? AND
            hash = ? AND
            hash IS NOT NULL
            AND isOauthFlg = ?`,
        [mail, hash, '0'], null, `selectAccountByMailAndHash [${mail}]`
    );
    return returnOne(result);
};

/**
 * アカウントNoからアカウントを返却
 */
 exports.selectAccountByNo = async (accountNo) => {
    const result = await query(
        `SELECT
            accountNo,
            mail,
            accountRole,
            activate,
            regDate,
            updDate
        FROM
            account
        WHERE
            accountNo = ?`,
        [accountNo], null, `selectAccountByNo [${accountNo}]`
    );
    return returnOne(result);
};

/**
 * アカウントを登録.
 * メールログイン用
 * もし重複した場合、すでに登録されているメールのアクティベートが 0 ならば、hash を更新
 */
exports.insertNewAccount = async (mail, hash, passwordResetId, activate) => {
    try {
        const insertResult = await update(
            `INSERT INTO account(
                mail, hash, passwordResetId, isOauthFlg, activate
            ) VALUES (?, ?, ?, ?, ?)`,
            [mail, hash, passwordResetId, '0', activate], `insertNewAccount [${mail}]`
        );
        checkUpdateResult(insertResult, 1);
        return insertResult.insertId;
    } catch (err) {
        // 重複かつすでに登録されたメールのアカウントが 未アクティベートなら更新
        if (DB_ERROR.is(err) == DB_ERROR.DUPLICATE) {
            const currentRecord = await query(
                `SELECT
                    accountNo,
                    mail,
                    activate
                FROM
                    account
                WHERE
                    mail = ? AND
                    hash IS NOT NULL
                    AND isOauthFlg = ?`,
                [mail, '0'], null, 'selectAccountByMailForDuplicate'
            );
            if (util.isNotEmptyArray(currentRecord)) {
                const current = currentRecord[0];
                if (current.mail === mail && current.activate === ACCOUNT_ACTIVATE.YET) {
                    const updateResult = await update(
                        `UPDATE account set
                            hash = ?,
                            passwordResetId = ?,
                            activate = ?
                        where accountNo = ? AND mail = ?`,
                        [hash, passwordResetId, activate, current.accountNo, mail], 'update account for duplicate'
                    );
                    checkUpdateResult(updateResult, 1);
                    return current.accountNo;
                }
            }
        }
        logger.error(JSON.stringify(err));
        throw DB_ERROR.is(err);
    }
};

/**
 * アカウントアクティベート.
 * メールログイン用
 */
exports.updateAccountActivate = async (accountNo, passwordResetId) => {
    try {
        const updateResult = await update(
            `UPDATE account set
                activate = ?,
                passwordResetId = null
            WHERE
                accountNo = ?
            AND passwordResetId = ?
            AND activate = ?`,
            [
                ACCOUNT_ACTIVATE.ACTIVE,
                accountNo,
                passwordResetId,
                ACCOUNT_ACTIVATE.YET
            ], 'updateAccountActivate'
        );
        checkUpdateResult(updateResult, 1);
        return updateResult.insertId;
    } catch (err) {
        logger.error(JSON.stringify(err));
        throw DB_ERROR.is(err);
    }
};

/**
 * アカウントにセットされている passwordResetId が正しいかを得る.
 * パスワード変更 or パスワードリセット　兼用
 */
 exports.isPasswordResetable = async (accountNo, passwordResetId) => {
    try {
        const result = await select(
            `SELECT 1 from account
             WHERE
                activate = ? AND
                passwordResetId = ? AND
                activate = ? AND
                passwordResetLimit > NOW()`,
            [
                accountNo,
                passwordResetId,
                ACCOUNT_ACTIVATE.ACTIVE,
            ], 'isPasswordResetable'
        );
        return !!result && Array.isArray(result) && result?.length === 1;
    } catch (err) {
        logger.error(JSON.stringify(err));
        throw DB_ERROR.is(err);
    }
};

/**
 * アカウント passwordResetId を確認して、パスワードを変更する
 * パスワード変更 or パスワードリセット　兼用
 */
 exports.updatePassword = async (mail, passwordResetId, newPasswordHash) => {
    try {
        const updateResult = await update(
            `UPDATE account set
                activate = ?,
                passwordResetId = NULL,
                passwordResetLimit = NULL,
                hash = ?
            WHERE
                mail = ? AND
                passwordResetId = ? AND
                passwordResetLimit > NOW()`,
            [
                ACCOUNT_ACTIVATE.ACTIVE,
                newPasswordHash,
                mail,
                passwordResetId,
            ], 'updatePassword'
        );
        checkUpdateResult(updateResult, 1);
        return updateResult.insertId;
    } catch (err) {
        logger.error(JSON.stringify(err));
        throw DB_ERROR.is(err);
    }
};

/**
 * アカウントのパスワードをリセット可能状態にする
 * パスワード変更 or パスワードリセット　兼用
 * @param activateFlg リセット後もログインができるかどうかを選択
 */
 exports.updatePasswordResetable = async (mail, activateFlg, passwordResetId, passwordResetLimit) => {
    try {
        const updateResult = await update(
            `UPDATE account set
                activate = ?,
                passwordResetId = ?,
                passwordResetLimit = ?
            WHERE
                mail = ?`,
            [
                activateFlg,
                passwordResetId,
                passwordResetLimit,
                mail,
            ], 'updatePasswordResetable'
        );
        checkUpdateResult(updateResult, 1);
        return {
            passwordResetId,
            passwordResetLimit,
        };
    } catch (err) {
        logger.error(JSON.stringify(err));
        throw DB_ERROR.is(err);
    }
};


/** 無効トークンを探す、探す前に expired の情報を削除する 削除処理失敗はログ記録だけして処理続行 */
exports.isIgnoreToken = async (token) => {
    try {
        await update(
            'DELETE FROM ignoreToken WHERE expire < NOW()' ,
            [], 'delete expired ignoreToken'
        );
    } catch (err) {
        logger.error(`ERROR: del expired ignoreToken: ${JSON.stringify(err)}`);
    }
    const result = await query(
        `SELECT
            *
        FROM
            ignoreToken
        WHERE
            token = ? AND expire > NOW()`,
        [token], null, 'select ignoreToken'
    );
    return util.isNotEmptyArray(result);
};

exports.setIgnoreToken = async (token, expire) => {
    try {
        const insertResult = await update(
            `INSERT INTO ignoreToken(
                token, expire
            ) VALUES (?, ?)`,
            [token, expire], 'insert ignore token'
        );
        checkUpdateResult(insertResult, 1);
        return insertResult.insertId;
    } catch (err) {
        logger.error(JSON.stringify(err));
        // throw DB_ERROR.is(err);
        // エラーでも処理は継続する
    }
};

/** 長期トークンを取得 */
exports.getLongToken = async (token) => {
    // 期限切れを削除
    await update(
        'DELETE FROM longToken WHERE expire < NOW()' ,
        [], 'delete expired longToken'
    );
    const result = await query(
        `SELECT
            *
        FROM
        longToken
        WHERE
            token = ?`,
        [token], null, 'select longToken'
    );
    return returnOne(result);
};

/** 長期トークンを記録 同アカウントの長期トークンを削除 */
exports.setLongToken = async (token, expire, accountNo) => {
    try {
        await update(
            `DELETE FROM longToken
             WHERE accountNo = ?`,
            [accountNo], `delete longToken accountNo = ${accountNo}`
        );
        const insertResult = await update(
            `INSERT INTO longToken(
                token, expire, accountNo
            ) VALUES (?, ?, ?)`,
            [token, expire, accountNo], 'insert longToken'
        );
        checkUpdateResult(insertResult, 1);
    } catch (err) {
        logger.error(JSON.stringify(err));
        // throw DB_ERROR.is(err);
        // エラーでも処理は継続する
    }
};
