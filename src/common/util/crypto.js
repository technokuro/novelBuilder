const crypto = require('crypto');
const {
    HASH_KEY,
    HASH_SALT,
    CRYPTO_KEY,
    CRYPTO_SALT,
    PASSWORD_ITERATION_COUNT,
    PASSWORD_HASH_LENGTH,
} = require('../../config');

const SHA1 = 'sha1';
const SHA256 = 'sha256';
const SHA512 = 'sha512';
const BASE64 = 'base64';
const AES256 = 'aes-256-cbc';
const HEX = 'hex';

function encodeBase64(str) {
    return Buffer.from(str).toString(BASE64);
}

/**
 * codeChallenge を生成 (LINE Dev 参考)
 * 参考:https://developers.line.biz/ja/docs/line-login/integrate-pkce/#generate-code-challenge
 */
function createCodeChallengeForLine(codeVerifier) {
    const base64 = crypto
        .createHash(SHA256)
        .update(codeVerifier)
        .digest(BASE64);
    return base64
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

function decodeBase64(base64Str) {
    return Buffer.from(base64Str, BASE64).toString();
}

function encodeBase64Bytes(bytes) {
    return bytes.toString(BASE64);
}

function decodeBase64Bytes(base64Str) {
    return Buffer.from(base64Str, BASE64);
}

/** SHA256-HEX を得る */
function getSha256(str, hashKey){
    const sign = crypto.createHash(SHA256, hashKey || HASH_KEY)
        .update(str)
        .digest(HEX);
    return sign;
}

/** SHA1-HEX を得る */
function getSha1(str){
    const sign = crypto.createHash(SHA1)
        .update(str)
        .digest(HEX);
    return sign;
}

/**
 * SHA512-BASE64 を得る
 * @param str 文字列
 * @return BASE64
 */
function getSha512Base64(str, hashSalt, iterationCount, hashLength) {
    const hashKey = crypto.pbkdf2Sync(
        str,
        hashSalt || HASH_SALT,
        iterationCount || PASSWORD_ITERATION_COUNT,
        hashLength || PASSWORD_HASH_LENGTH,
        SHA512);
    return hashKey.toString(BASE64);
}

function encryptAes(str, cryptoKey, cryptoSalt) {
    const key = crypto.scryptSync(
        cryptoKey || CRYPTO_KEY,
        cryptoSalt || CRYPTO_SALT, 32);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(AES256, key, iv);

    const encryptedData = cipher.update(str);
    const result = Buffer.concat([encryptedData, cipher.final()]);

    return {
        iv,
        result
    };
}

function decryptAes(encryptedData, iv, cryptoKey, cryptoSalt) {
    const key = crypto.scryptSync(
        cryptoKey || CRYPTO_KEY,
        cryptoSalt || CRYPTO_SALT, 32);
    const decipher = crypto.createDecipheriv(AES256, key, iv);

    const decryptedData = decipher.update(encryptedData);
    const result = Buffer.concat([decryptedData, decipher.final()]);

    return result;
}

const S = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
function getRandomString(length) {
    return Array.from(
        crypto.randomFillSync(new Uint8Array(length))
    ).map((n)=>S[n%S.length]).join('');
}

module.exports = {
    encodeBase64,
    decodeBase64,
    encodeBase64Bytes,
    decodeBase64Bytes,
    getSha256,
    getSha1,
    getSha512Base64,
    encryptAes,
    decryptAes,
    getRandomString,
    createCodeChallengeForLine,
};
