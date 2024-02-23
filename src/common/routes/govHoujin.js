const express = require('express');
const router = express.Router();
const { doAuthRoute } = require('./base/routeBase');
const { VALIDATOR } = require('../validateParams');
const { getGovHoujinByName } = require('../util/getGovHoujin');

/** 国税庁法人DBから、名称で法人情報を検索取得する
 */
router.get('/',
  [
    VALIDATOR.anyRequired('name'),
  ],
  async function(req, res) {
    doAuthRoute(req, res, async (r) => {
      const p = req.query;
      return await getGovHoujinByName(p.name);
    });
  }
);

module.exports = {
  router,
};
