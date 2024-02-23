const constraint = require('../../config');

function isString(v) {
    return typeof v === 'string';
}

function isNumber(v) {
    return typeof v === 'number';
}

/** 数値のみの文字列型 */
function isNumberString(v) {
    if(!isString(v)) {
        return false;
    }
    return /^[0-9]+$/.test(v);
}

function isBoolean(v) {
    return typeof v === 'boolean';
}

function isUndefined(v) {
    return typeof v === 'undefined';
}

function isJson(v) {
    return v?.constructor === Object;
}

function isFunction(v) {
    return typeof v === 'function';
}

function isEmptyJson(v) {
    return !v || (Object.keys(v).length === 0 && isJson(v));
}

function isAsyncFunction(f) {
    return Object.getPrototypeOf(f) === Object.getPrototypeOf(async function () {});
}

/**
 * 実行パス配下のパスとして返す.
 * @param {string} path
 * @returns 相対パス
 */
function getPath(path) {
    return process.cwd() + path;
}


/**
 * ファイル名から拡張子を得る.
 * @param {String} fileName ファイル名
 * @return {String} 拡張子(ドットなし)
 */
function getExtension(fileName) {
    let arr = fileName.split('.');
    return arr[arr.length - 1];
}

/**
 * ２値 が一致しているか
 * Object.keys(src) に対して、Object.keys(dst) を判定する
 */
function isEquals(src, dst) {
    if (src === dst) {
        return true;
    }
    if (!src && !dst) {
        return true;
    }
    if (src && dst) {
        if (Array.isArray(src)) {
            if (Array.isArray(dst)) {
                if (src.length != dst.length) {
                    return false;
                }
                for (let hoge = 0; hoge < src.length; hoge++) {
                    if (!(src[hoge] === dst[hoge])) {
                        if (!isEquals(src[hoge], dst[hoge])) {
                            return false;
                        }
                    }
                }
                return true;
            }
        }
        for (const key of Object.keys(src)) {
            if (!isEquals(src[key], dst[key])) {
                return false;
            }
        }
        return true;
    }
    return false;
}

/** undefined null などでないことを確認 */
function isValue(value) {
    if (value == null || value == undefined || !value) {
        return false;
    }
    return true;
}

/** 主にArray string が有値であることを検証 */
function isNotEmpty(value) {
    if (isNumber(value)) {
        return true;
    }
    if (!isValue(value)) {
        return false;
    }
    if (isEmptyArray(value)) {
        return false;
    }
    if (value === '') {
        return false;
    }
    if (isJson(value) && Object.keys(value).length === 0) {
        return false;
    }
    return true;
}

/** isNotEmpty の逆 */
function isEmpty(value) {
    return !isNotEmpty(value);
}

function isNotEmptyArray(value) {
    return Array.isArray(value) && value?.length > 0 && value.find((e) => isNotEmpty(e));
}

function isEmptyArray(value) {
    return Array.isArray(value) && value?.length === 0;
}

/** length 桁のランダム数値を作成
 *  同じ数値が２回連続しないことを保証する
 */
function createRandomNumber(length) {
    const result = [];
    let beforeNumber = -1;
    for (let time = 0; time < length; time++) {
        let current = beforeNumber;
        while (beforeNumber == current) {
            current = Math.floor(Math.random() * 10);
        }
        result.push(current);
    }
    return result.join('');
}

function optional(value, whenValuedCallback) {
    if (isNotEmpty(value)) {
        if (!whenValuedCallback || !isFunction(whenValuedCallback) ){
            return value;
        }
        return whenValuedCallback(value);
    }
    return null;
}

async function optionalAsync(value, whenValuedAsyncCallback) {
    if (isNotEmpty(value)) {
        if (!whenValuedAsyncCallback || !isFunction(whenValuedAsyncCallback) ){
            return value;
        }
        return await whenValuedAsyncCallback(value);
    }
    return null;
}

// 半角英数を全角に変換
function exStringHalfToFull(half) {
    return half.replace(/[A-Za-z0-9]/g, function (s) {
        return String.fromCharCode(s.charCodeAt(0) + 0xFEE0);
    });
}

function zeroPadding(src, length) {
    return `${Array(length).join('0')}${src}`.slice(length * -1);
}

module.exports = {
    isString,
    isNumber,
    isNumberString,
    isBoolean,
    isUndefined,
    isFunction,
    isAsyncFunction,
    isJson,
    isEmptyJson,
    getPath,
    getExtension,
    isEquals,
    isValue,
    isEmpty,
    isNotEmpty,
    isNotEmptyArray,
    isEmptyArray,
    createRandomNumber,
    optional,
    optionalAsync,
    exStringHalfToFull,
    zeroPadding,
};
