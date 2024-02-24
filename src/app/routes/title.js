const express = require("express");
const { VALIDATOR: V } = require("../../common/validateParams");
const router = express.Router();
const { doRoute } = require("../../common/routes/base/routeBase");
const db = require("../../common/persistence/simple");
const { insertTitle, getTitles } = require("../persistence/title");

/** get test */
router.get("/get", async function (req, res) {
  doRoute(req, res, async (r, auth) => {
    const titleList = await getTitles();
    // TEST
    return {
      result: 0,
      titleList,
    };
  });
});

/** post test */
router.post(
  "/post",
  [
    V.anyLengthSanitized("titleName", 256, true),
    V.anyLengthSanitized("overview", 256, true),
    V.anyLengthSanitized("genre", 256, true),
  ],
  async function (req, res) {
    doRoute(req, res, async () => {
      const { titleName, overview, genre } = req.body;
      const connection = await db.getConnection();
      try {
        await db.beginTransaction(connection);
        await insertTitle(connection, titleName, overview, genre);
        await db.commitTransaction(connection);
      } catch (err) {
        await db.rollbackTransaction(connection);
        throw err;
      }
      return {
        result: 0,
      };
    });
  }
);

module.exports = {
  router,
};
