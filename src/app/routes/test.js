const express = require('express');
const { VALIDATOR: V } = require('../../common/validateParams');
const router = express.Router();
const { doRoute } = require('../../common/routes/base/routeBase');
const db = require('../../common/persistence/simple');
const { getTest, insertTestTransaction } = require('../persistence/test');

/** get test */
router.get('/get',
  [
    V.numeric('id', true),
  ],
  async function(req, res) {
    doRoute(req, res, async (r, auth) => {
      const { id } = req.query
      const datas = await getTest(id);
      // TEST
      return {
        result: 'hogehogeOK',
        datas,
      };
    });
  }
);

/** post test */
router.post('/post',
  [
    V.anyLengthSanitized('name', 256, true),
  ],
  async function(req, res) {
    doRoute(req, res, async (r, auth) => {
      const { name } = req.body;
      const connection = await db.getConnection();
      try {
        await db.beginTransaction(connection);
        await insertTestTransaction(connection, name, 'USER');
        await db.commitTransaction(connection);
      } catch (err) {
        await db.rollbackTransaction(connection);
        throw err;
      }
    });
  }
);


module.exports = {
  router,
};
