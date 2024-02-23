const express = require('express');
const router = express.Router();
const { doAuthRoute } = require('./base/routeBase');
const { createCsrfToken } = require('../util/csrf');

/** csrfトークンの要求 */
router.get('/request',
  async function(req, res) {
    doAuthRoute(req, res, async (r, auth) => {
      return await createCsrfToken(auth?.account?.accountNo);
    });
  }
);

module.exports = {
  router,
};
