const uuid = require('node-uuid');
const { RESULT_CODE } = require('../definition');
const { save, getList, del } = require('../persistence/kv');
const { isNotEmptyArray } = require('./commonUtils');
const { getRandomString } = require('./crypto');

const createCsrfToken = async(key) => {
  const k = `csrf-${key}`;
  const v = getRandomString(32);
  await save(k, v, 120);
  return v;
};

const verifyCsrfToken = async (key, v) => {
  const k = `csrf-${key}`;
  const list = await getList([k]);
  if (!(isNotEmptyArray(list) && list.length === 1 && list[0].V === v)) {
    throw RESULT_CODE.CSRF_VERIFY_ERROR;
  }
  // OKなので、エントリを消す
  del(k);
};

module.exports = {
  createCsrfToken,
  verifyCsrfToken,
};
