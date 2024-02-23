const express = require('express');
const router = express.Router();
const { isNotEmpty } = require('../util/commonUtils');
const { doAuthRoute } = require('./base/routeBase');
const {
  getPrefsByPrefList,
  getCitiesByPrefList,
  getPrefByKana,
  getCityByKana
} = require('../persistence/address');
const jaConv = require('../util/jaConv');

/** 都道府県、市区町村リスト取得
 * prefList 都道府県コード（２桁）の配列
 * prefKana ローマ字半角英字の都道府県名
 * cityKana ローマ字半角英字の市区町村
 * prefCd ローマ字市区町村検索のときの、都道府県絞りに使う、任意
 * 無指定なら全都道府県のみ返却
 */
router.post('/',
  [],
  async function(req, res) {
    doAuthRoute(req, res, async (r) => {
      const p = req.body;
      let prefList;
      if (p.prefKana) {
        const kana = jaConv.convertRomanToKana(p.prefKana);
        prefList = await getPrefByKana(kana);
      } else if(isNotEmpty(p.prefList)){
        prefList = await getPrefsByPrefList(p.prefList);
      } else {
        prefList = await getPrefsByPrefList();
      }
      if (!prefList || prefList.length == 0) {
        return null;
      }
      const targetPrefCdList = prefList.map(p => p.prefCd);

      let cityList;
      if (p.cityKana) {
        const kana = jaConv.convertRomanToKana(p.cityKana);
        cityList = await getCityByKana(kana, p.prefCd);
        if (!resultCityList || resultCityList.length == 0) {
          return null;
        }
      } else {
        cityList = await getCitiesByPrefList(targetPrefCdList);
      }

      return prefList.map(e => ({
        prefCd: e.prefCd,
        prefName: e.prefName,
        cityList: cityList.filter(c => c.prefCd == e.prefCd).map(c => ({
          cityCd: c.cityCd,
          cityName: c.cityName
        }))
      }));
    });
  }
);

module.exports = {
  router,
};
