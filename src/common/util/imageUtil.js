const fetch = require('node-fetch');
const { isNotEmptyArray } = require('./commonUtils');

/**
 * URLで取得できる画像をBASE64 に変換
 * @param {string} url
 */
const toBase64Url = async (url) => {
    try {
        const res = await fetch(url);
        const contentType = res.headers.get('content-type');
        const arrayBuffer = await res.arrayBuffer();
        let base64Str = btoa(
            String.fromCharCode.apply(null, new Uint8Array(arrayBuffer))
        );
        return `data:${contentType};base64,${base64Str}`;
    } catch (err) {
        return null;
    }
};

/**
 * BASE64 から バイナリに変換
 * @param {String} base64 エンコード済み文字列
 * @returns {
 *      fileType: content-type の imageなど
 *      ext: content-type の pngなど拡張子
 *      contentType: content-type そのもの
 *      binary: Buffer
 * }
 */
const toBinaryFromBase64 = (base64) => {
    // fileType と ext を求める
    const base64Array = base64.match(/^data:(\w+)\/(\w+);base64,(.+)$/);
    if (!isNotEmptyArray(base64Array)) {
        return null;
    }
    const [all, fileType, ext, fileData] = base64Array;
    return {
        fileType,
        ext,
        contentType: `${fileType}/${ext}`,
        fileData: !!fileData ? new Buffer(fileData, 'base64') : null,
    };
};


module.exports = {
    toBase64Url,
    toBinaryFromBase64,
};
