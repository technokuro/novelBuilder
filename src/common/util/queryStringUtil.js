const { URLSearchParams } = require('url');
const { PARAMS } = require('../validateParams');

function makeQuery(json) {
    const result = new URLSearchParams();
    Object.keys(json).map((key) => result.append(key, json[key]));
    return result;
}

function getIp(req) {
    //プロキシ経由のときのIPも考慮
    const ret = req?.headers['x-forwarded-for'] || req?.ip;
    if (!ret) {
      throw new Error(`IPアドレスが解決できない ${JSON.stringify(req || {})}`);
    }
    return ret;
  }

module.exports = {
    makeQuery,
    getIp,
};
