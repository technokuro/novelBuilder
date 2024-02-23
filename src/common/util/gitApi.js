const fetch = require("node-fetch");
const FormData = require("form-data");
const config = require('../../config');

/** post 通信用 */
async function post(post, token, param) {
  const headers = {
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28"
  };
  if (!!token) {
    headers.authorization = `Bearer ${token}`;
  }
  try {
    const result = await fetch(
      url,
      {
        headers,
        method: "POST",
        body: param,
      },
    );
    const resJson = await result.json();
    return resJson;
  }catch(err){
    throw err;
  }
}

/** get 通信用 */
async function get(url, token) {
  try {
    const result = await fetch(
      url,
      {
        headers: {
          accept: "application/vnd.github+json",
          authorization: `Bearer ${token}`,
          "x-github-api-version": "2022-11-28"
        },
        method: "GET",
      },
    );
    const resJson = await result.json();
    return resJson;
  }catch(err){
    throw err;
  }
}

async function getOauthAccessToken(code) {
  const formData = new FormData();
  formData.append('client_id', config.GIT_OAUTH.client_id);
  formData.append('client_secret', config.GIT_OAUTH.client_secret);
  formData.append('code', code);
  const res = await fetch(
    'https://github.com/login/oauth/access_token',
    {
      method: 'POST',
      body: formData,
    }
  );
  const result = await res.text();
  const json = {};
  result?.split('&').forEach((kv) => {
    const [k, v] = kv?.split('=');
    json[k] = v;
  });
  return json;
}

/** git token から自身の userName を得る */
async function getGitUserNameSelf(token) {
  try {
    const res = await get('https://api.github.com/user', token);
    return res?.login;
  } catch (err) {
    throw err;
  }
}

/** git token から自身の userName を得る */
async function getGitOwnRepoNames(token, userName) {
  try {
    const res = await get(`https://api.github.com/users/${userName}/repos`, token);
    // fork false は自分で作ったことになる　と思っている
	  const ownRepoNames = res?.filter((r) => r.fork === false).map((r) => r.name);
    return ownRepoNames;
  } catch (err) {
    throw err;
  }
}

/** git token userName repoName から ownRepos の言語利用情報を得る を得る */
async function getRepoLangs(token, userName, repoName) {
  try {
    const res = await get(`https://api.github.com/repos/${userName}/${repoName}/languages`, token);
    return res;
  } catch (err) {
    throw err;
  }
}

/** git token から自身が作成した自身のリポジトリリストと、言語利用統計を得る */
async function getUserReposSkillSummary(token) {
  const userName = await getGitUserNameSelf(token);
	const ownRepoNames = await getGitOwnRepoNames(token, userName);

  const repoLangList = []; // { repoName, langs[{language,count}] }
  const languagesAll = {}; // key:language value:count
  let totalCounts = 0; // 全言語カウント合計
  for (let repoName of ownRepoNames) {
		const langRes = await getRepoLangs(token, userName, repoName);
    /** { key:count } を [{language:key, count: count}] の配列のカタチにする */
    const languages = [];
		Object.keys(langRes).forEach(lang => {
      const c = langRes[lang];
      /** 配列に成形 */
      const langJson = {
        language: lang,
        count: c,
      };
      languages.push(langJson);

      // 集計処理
			if (!languagesAll[lang]) {
				languagesAll[lang] = {
          count: 0,
        };
			}
			languagesAll[lang]['count'] += langRes[lang];
      totalCounts += langRes[lang];
		});
		repoLangList.push({
			repoName,
			languages,
		});
	}
  // パーセンテージを付加しつつ、配列の形に
  const usedLanguages = [];
  Object.keys(languagesAll).forEach(lang => {
    // 0.xxxx までで四捨五入
    const ratio = Math.round(
      languagesAll[lang]['count'] / totalCounts * 1000
    ) / 1000;
    usedLanguages.push({
      language: lang,
      count: languagesAll[lang]['count'],
      ratio,
    });
  });
  return {
    userName,
    repoLangList,
    usedLanguages,
  };
}

module.exports = {
  getGitUserNameSelf,
  getGitOwnRepoNames,
  getRepoLangs,
  getUserReposSkillSummary,
  getOauthAccessToken,
};
