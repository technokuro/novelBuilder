const { RESULT_CODE } = require("../common/definition");
const { PublishLevel } = require("./model/engineer");

const DB_ERROR = {
  SETTING_IS_NOT_HISTORY_PUBLIC: {
    errno: 2001,
    message: '投票を開催するには、自身の履歴情報を公開に設定する必要があります',
    resultCode: RESULT_CODE.ERROR_VALIDATION,
  },
  SETTING_IS_NOT_CAREER_PUBLIC: {
    errno: 2002,
    message: `投票を開催するには、自身の経歴情報を${
      Object.keys(PublishLevel).filter(
        (k) => PublishLevel[k].value >= PublishLevel.engineerOnly.value
      ).map((k) => `「${PublishLevel[k].label}」`).join('')
    }のいずれかに設定する必要があります`,
    resultCode: RESULT_CODE.ERROR_VALIDATION,
  },
};

module.exports = {
  DB_ERROR,
};
