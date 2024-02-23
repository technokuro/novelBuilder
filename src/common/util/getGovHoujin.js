const fetch = require('node-fetch');
const xml2js = require('xml2js');
const { isNotEmptyArray, exStringHalfToFull, zeroPadding, isEmptyArray, isNotEmpty } = require('../util/commonUtils');
const jaConv = require('../util/jaConv');

const APP_ID = 'K8G95ah647TvP';

async function getGovHoujinByName(houjinName) {
  if (!isNotEmpty(houjinName)) {
    return null;
  }
  const response = await fetch(
    `https://api.houjin-bangou.nta.go.jp/4/name?id=${APP_ID}&name=${exStringHalfToFull(houjinName)}&type=12&history=0`
  );
  const json = await toJson(response);
  return json;
}

// 最大１０件（https://www.houjin-bangou.nta.go.jp/documents/k-web-api-kinou-gaiyo.pdf）
async function getGovHoujinByNumbers(houjinNums) {
  if (isEmptyArray(houjinNums)) {
    return null;
  }
  const param = houjinNums.map((e) => zeroPadding(e, 13));
  const ret = {
    corporation: [],
  };
  // 10コずつにする
  let _param = [];
  for (let i = 0; i < param.length; i++) {
    _param.push(param[i]);
    // _param が 10個 か 最後の要素なら実行
    if (_param.length > 9 || i + 1 === param.length) {
      const response = await fetch(
        `https://api.houjin-bangou.nta.go.jp/4/num?id=${APP_ID}&number=${_param.join(',')}&type=12&history=0`
      );
      const json = await toJson(response);
      ret.corporation = ret.corporation.concat(json.corporation);
      _param = [];
    }
  }
  return ret;
}

async function toJson(response) {
  const xmlData = await response.text();
  let jsonData;
  xml2js.parseString(xmlData, (err, res) => {
    if (err) {
      console.error(err.message);
    } else {
      // 末端データはすべて１要素配列になっているので直す
      const list = res?.corporations?.corporation;
      if (!isNotEmptyArray(list)) {
        jsonData = null;
        return;
      }
      jsonData = {
        corporation: [],
      };
      list.forEach((e) => {
        jsonData.corporation.push({
          name: govOptional(e?.name),
          kana: govOptional(e?.furigana),
          companyNo: govOptional(e?.corporateNumber),
          prefCd: govOptional(e?.prefectureCode),
          prefName: govOptional(e?.prefectureName),
          cityCd: govOptional(e?.cityCode),
          cityName: govOptional(e?.cityName),
          town: govOptional(e?.streetNumber),
          kind: govOptional(e?.kind),
          hide: govOptional(e?.hihyoji),
          enName: e?.enName,
          enPrefectureName: e?.enPrefectureName,
          enCityName: e?.enCityName,
          enAddressOutside: e?.enAddressOutside,
          postCode: govOptional(e?.postCode),
          updateDate: govOptional(e?.updateDate),
          assignmentDate: govOptional(e?.assignmentDate),
          addressImageId: govOptional(e?.addressImageId),
          addressOutside: govOptional(e?.addressOutside),
          addressOutsideImageId: govOptional(e?.addressOutsideImageId),
          nameImageId: govOptional(e?.nameImageId),
          successorCorporateNumber: govOptional(e?.successorCorporateNumber),
        });
      });
    }
  });
  return jsonData;
}

const govOptional = (v) => {
  return isNotEmptyArray(v) ? v[0] : null;
};

module.exports = {
  getGovHoujinByName,
  getGovHoujinByNumbers,
};
