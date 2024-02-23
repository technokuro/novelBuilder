const express = require('express');
const router = express.Router();
const { isNotEmpty } = require('../util/commonUtils');
const { doAuthRoute } = require('./base/routeBase');
const {
  getList,
  saveNew,
} = require('../persistence/definitions');
const { PARAMS, VALIDATOR } = require('../validateParams');

/**
 * 定義語取得
 */
router.get('/',
  [PARAMS.CATEGORY_NAME],
  async function(req, res) {
    doAuthRoute(req, res, async (r) => {
      const p = req.query;
      const categories = p.category.split(',');
      const resultList = await getList(categories);
      return resultList.map((e) => ({
        category: e.category,
        no: e.no,
        label: e.label,
        cnt: e.cnt || 0
      }));
    });
  }
);

/**
 * 定義語追加
 */
router.post('/',
  [
    PARAMS.CATEGORY_NAME,
    VALIDATOR.anyLength('label', 64, true),
  ],
  async function(req, res) {
    doAuthRoute(req, res, async (r) => {
      const p = req.body;
      const result = await saveNew(p.category, p.label);
      return result;
    });
  }
);

module.exports = {
  router,
};
