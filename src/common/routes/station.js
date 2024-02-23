const express = require('express');
const { VALIDATOR: V } = require('../validateParams');
const router = express.Router();
const { doAuthRoute } = require('./base/routeBase');
const { getLine, getStation, getStationLinesAll, getStationByStationGCdList } = require('../persistence/station');
const { isNotEmpty } = require('../util/commonUtils');

/** 路線取得 */
router.post('/line',
  [],
  async function(req, res) {
    doAuthRoute(req, res, async (r) => {
      const p = req.body;
      const result = await getLine(null, p.prefCd, p.cityCd);
      return result.map(p => ({
        lineCd: p.lineCd,
        lineName: p.lineName,
      }));
    });
  }
);

/** 駅取得 */
router.post('/station',
  [],
  async function(req, res) {
    doAuthRoute(req, res, async (r) => {
      const p = req.body;
      // 都道府県、市区町村に該当する駅リストを得る
      const result = await getStationLinesAll(null, null, p.prefCd, p.cityCd);

      // 路線コードを distinct
      const lineCdList = result.map(s => s.lineCd).filter((e, index, array) => array.indexOf(e) === index);

      // 路線情報を得る
      const lineList = await getLine(lineCdList, p.prefCd, p.cityCd);

      return lineList.map(line => ({
        lineCd: line.lineCd,
        lineName: line.lineName,
        stationList: result.filter(s => s.lineCd === line.lineCd).map(s => ({
          stationGCd: s.stationGCd,
          stationName: s.stationName,
          prefCd: s.prefCd,
          cityCd: s.cityCd,
        }))
      }));
    });
  }
);

/** stationGCd リストから line + stationName のリストを返す */
router.get('/getStationByStationGCdList',
  [V.numeric('stationGCdList.*', true)],
  async function(req, res) {
    doAuthRoute(req, res, async (r) => {
      const { stationGCdList } = req.query;
      if (!isNotEmpty(stationGCdList)) {
        return {};
      }
      return await getStationByStationGCdList(stationGCdList);
    });
  }
);

module.exports = {
  router,
};
