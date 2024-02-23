const { check } = require('express-validator');
const { MESSAGE } = require('./definition');
const { checkDateFromString } = require('./util/dateUtils');
const { isNumber, isNumberString } = require('./util/commonUtils');


const VALIDATOR = {
    mail: (key) => check(key)
        .isEmail().withMessage(MESSAGE.isNotEmail)
        .not().isEmpty().withMessage(MESSAGE.isEmpty)
        .not().isFullWidth().withMessage(MESSAGE.hasTwoBytes)
        .isLength({max: 256}).withMessage(MESSAGE.overMaxLength(256)),
    passwordForLogin: (key) => check(key)
        .not().isEmpty().withMessage(MESSAGE.isEmpty),
    passwordForRegister: (key) => check(key)
        .not().isEmpty().withMessage(MESSAGE.isEmpty)
        .isLength({min: 8}).withMessage(MESSAGE.isNotLength8Password)
        .matches(/^(?=.*?[a-z])(?=.*?[A-Z])(?=.*?[0-9])[a-zA-Z0-9]*$/).withMessage(MESSAGE.isSimplePassword)
        .not().isFullWidth().withMessage(MESSAGE.hasTwoBytes),
    rePasswordForRegister: (key) => check(key)
        .not().isEmpty().withMessage(MESSAGE.isEmpty)
            .custom((value, {req}) => {
                if(req.body.newRePassword != req.body.newPassword){
                    throw new Error(MESSAGE.isNotSameRePassword);
                }
                return true;
            }),
    anyRequired: (key) => check(key)
        .not().isEmpty().withMessage(MESSAGE.isEmpty),
    anyRequiredSanitized: (key) => check(key)
        .not().isEmpty().withMessage(MESSAGE.isEmpty).trim().escape(),
    anyRequiredWhichOne: (errorMessage, ...key) => check(key[0])
        .optional({checkFalsy: true})
        .custom((value, {req}) => {
            for(let k of key) {
                if (!!req.body[k]) {
                    return true;
                }
            }
            throw new Error(errorMessage);
        }),
    /** 列挙キーすべてが存在するか、すべてが存在していないか */
    anyRequiredBothOrAllNothing: (errorMessage, ...key) => check(key[0])
        .optional({checkFalsy: true})
        .custom((value, {req}) => {
            // 最初の値の状態を保持
            const firstKeyStatus = !!req.body[key[0]];
            for(let k of key) {
                if (!!req.body[k] != firstKeyStatus) {
                    throw new Error(errorMessage);
                }
            }
            return true;
        }),
    anyLength: (key, length, isRequire) => {
        if (isRequire) {
            return check(key).not().isEmpty().withMessage(MESSAGE.isEmpty)
            .isLength({max: length}).withMessage(MESSAGE.overMaxLength(length));
        } else {
            return check(key).optional({checkFalsy: true})
            .isLength({max: length}).withMessage(MESSAGE.overMaxLength(length));
        }
    },
    anyLengthSanitized: (key, length, isRequire) => {
        if (isRequire) {
            return check(key).not().isEmpty().withMessage(MESSAGE.isEmpty)
            .isLength({max: length}).withMessage(MESSAGE.overMaxLength(length)).trim().escape();
        } else {
            return check(key).optional({checkFalsy: true})
            .isLength({max: length}).withMessage(MESSAGE.overMaxLength(length)).trim().escape();
        }
    },
    numeric: (key, isRequire) => {
        if (isRequire) {
            return check(key).not().isEmpty().withMessage(MESSAGE.isEmpty)
            .isNumeric().withMessage(MESSAGE.isNotNumeric);
        } else {
            return check(key).optional({checkFalsy: true})
            .isNumeric().withMessage(MESSAGE.isNotNumeric);
        }
    },
    numericLength: (key, length, isRequire) => {
        if (isRequire) {
            return check(key).not().isEmpty().withMessage(MESSAGE.isEmpty)
            .isNumeric().withMessage(MESSAGE.isNotNumeric)
            .isLength({max: length}).withMessage(MESSAGE.overMaxLength(length));
        } else {
            return check(key).optional({checkFalsy: true})
            .isNumeric().withMessage(MESSAGE.isNotNumeric)
            .isLength({max: length}).withMessage(MESSAGE.overMaxLength(length));
        }
    },
    tel: (key, isRequire) => {
        if (isRequire) {
            return check(key).not().isEmpty().withMessage(MESSAGE.isEmpty)
            .custom((v) => isTel(v, true));
        } else {
            return check(key).custom((v) => isTel(v, false)).optional({checkFalsy: true});
        }
    },
    yyyymmddSlashed: (key, isRequire) => {
        if (isRequire) {
            return check(key).not().isEmpty().withMessage(MESSAGE.isEmpty)
            .custom(isYYYYMMDD);
        } else {
            return check(key).optional({checkFalsy: true})
            .custom(isYYYYMMDD);
        }
    },
    isIn: (key, valuesJson, isRequire) => {
        if (isRequire) {
            return check(key).not().isEmpty().withMessage(MESSAGE.isEmpty)
            .isIn(Object.values(valuesJson)).withMessage(MESSAGE.isNotContainsEnums);
        } else {
            return check(key).optional({checkFalsy: true})
            .isIn(Object.values(valuesJson)).withMessage(MESSAGE.isNotContainsEnums);
        }
    },
    boolean: (key, isRequire) => {
        if (isRequire) {
            return check(key).not().isEmpty().withMessage(MESSAGE.isEmpty)
            .isBoolean().withMessage(MESSAGE.isNotBoolean);
        } else {
            return check(key).optional({checkFalsy: true})
            .isBoolean().withMessage(MESSAGE.isNotBoolean);
        }
    },
    yyyymmddSlashedWildcard: (key, isRequire) => {
        if (isRequire) {
            return check(key).not().isEmpty().withMessage(MESSAGE.isEmpty)
            .custom(isYYYYMMDDWildcard);
        } else {
            return check(key).optional({checkFalsy: true})
            .custom(isYYYYMMDDWildcard);
        }
    },
    yyyymm: (key, isRequire) => {
        if (isRequire) {
            return check(key).not().isEmpty().withMessage(MESSAGE.isEmpty)
            .custom(isYYYYMMnoSlashed);
        } else {
            return check(key).optional({checkFalsy: true})
            .custom(isYYYYMMnoSlashed);
        }
    },
    yyyymmdd: (key, isRequire) => {
        if (isRequire) {
            return check(key).not().isEmpty().withMessage(MESSAGE.isEmpty)
            .custom(isYYYYMMDDnoSlashed);
        } else {
            return check(key).optional({checkFalsy: true})
            .custom(isYYYYMMDDnoSlashed);
        }
    },
    forUrlString: (key, isRequire)  => {
        if (isRequire) {
            return check(key).not().isEmpty().withMessage(MESSAGE.isEmpty)
            .custom((v) => isForUrlString(v, true));
        } else {
            return check(key).optional({checkFalsy: true})
            .custom((v) => isForUrlString(v, false));
        }
    },
    custom: (key, isValidFunc) => check(key)
        .custom((value, {req}) => {
            const ret = isValidFunc(value, req);
            if (!ret) {
                throw new Error(`key:${key} custom validate return false`);
            }
            return ret;
        }),
};

const PARAMS = {
    ACCOUNT_MAIL: VALIDATOR.mail('mail'),

    PASSWORD_ON_LOGIN: VALIDATOR.passwordForLogin('password'),

    PASSWORD_ON_REGISTER: VALIDATOR.passwordForRegister('password'),

    GET_LONG_TOKEN: VALIDATOR.boolean('keepLogin'),

    ACCOUNT_NO: VALIDATOR.numeric('accountNo'),

    PASSWORD_RESET_ID: VALIDATOR.anyRequired('passwordResetId'),

    ACTIVATE_NUMBER: check('activateNumber')
        .not().isEmpty().withMessage(MESSAGE.isEmpty)
        .custom((value, {req}) => {
            const [no1, no2] = value.split('-');
            if(parseInt(no1, 10) == no1 && parseInt(no2, 10) == no2){
                return true;
            }
            throw new Error(MESSAGE.isNotFound);
        }),

    OLD_PASSWORD: VALIDATOR.anyRequired('oldPassword'),

    NEW_PASSWORD: VALIDATOR.passwordForRegister('newPassword'),

    NEW_RE_PASSWORD: VALIDATOR.rePasswordForRegister('newRePassword'),

    CATEGORY_NAME: VALIDATOR.anyLength('category', 256, true),

    IS_CERTED: check('isCerted')
        .not().isEmpty().withMessage(MESSAGE.isEmpty)
        .isBoolean().withMessage(MESSAGE.isNotBoolean),

};

// 日付の文字列か、日付インスタンスで、時間が　0:00:00 であるか
const isYYYYMMDD = (value) => {
    const testDate = new Date(value);
    if (!testDate) {
        throw new Error(MESSAGE.isNotDate);
    }
    return true;
};

const isYYYYMMDDWildcard = (value) => {
    //  * を 1 に置換して日付として成立するかを確認
    const testValue = value.replace(/\*/g, '1');
    if (!isYYYYMMDD(testValue)) {
        throw new Error(MESSAGE.isNotDate);
    }
    return true;
};

const isYYYYMMnoSlashed = (value) => {
    if (!value || value?.length != 6) {
        throw new Error(MESSAGE.isNotDate);
    }
    if (!checkDateFromString(`${value}01`)) {
        throw new Error(MESSAGE.isNotDate);
    }
    return true;
};

const isYYYYMMDDnoSlashed = (value) => {
    if (!value || value?.length != 8) {
        throw new Error(MESSAGE.isNotDate);
    }
    if (!checkDateFromString(value)) {
        throw new Error(MESSAGE.isNotDate);
    }
    return true;
};

const isTel = (value, isRequire) => {
    if (!value || value?.length == 0) {
        if (isRequire) {
            throw new Error(MESSAGE.isEmpty);
        }
    }
    if (!isNumberString(value)) {
        throw new Error(MESSAGE.isNotNumeric);
    }
    if (!(value.length === 10 || value.length === 11)) {
        throw new Error(MESSAGE.isNotTel);
    }
    return true;
}

const isForUrlString = (value, isRequire) => {
    if (!value || value?.length == 0) {
        if (isRequire) {
            throw new Error(MESSAGE.isEmpty);
        }
    }
    if (!/^[0-9a-zA-Z]*$/.test(value)){
        throw new Error(MESSAGE.isNotHalfAlphabetAndNumber);
    }
    return true;
}

module.exports = {
    PARAMS, VALIDATOR,
};
