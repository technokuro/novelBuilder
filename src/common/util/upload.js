const fs = require('fs');
const util = require('./commonUtils');
const multer = require('multer');
const multerS3 = require('multer-s3');
const AWS = require('aws-sdk');
const { AWS_S3 } = require('../../config');
const { error, info } = require('./log');
const { getListAndDelExpired, saveNew } = require('../persistence/s3Manage');

/**
 * ローカルディスクに保存するアップローダーを生成
 * @param {string} savePath 保存先パス
 * @param {function} fileNameFunc (req, file.originalname, extension) から保存するファイル名を決定する関数
 * @param {string} fieldName フィールド名
 * @param {number} sizeLimitMB 上限サイズMB
 * @returns multer uploader
 */
const createLocalStorageUploader = (savePath, fileNameFunc, fieldName, sizeLimitMB) => {
  // 内部ストレージポリシー
  const storage = multer.diskStorage({
    destination: (req, file, callback) => {
      if (!fs.existsSync(savePath)) {
        fs.mkdirSync(savePath);
      }

      callback(null, savePath);
    },
    filename: (req, file, callback) => {
      const extension = util.getExtension(file.originalname);
      // let fileName = req.body.photoBarcode + '.' + extension;
      const fileName = fileNameFunc(req, file.originalname, extension);
      callback(null, fileName);
    },
  });

  const uploader = multer({
    storage: storage,
    limits: {
      fileSize: sizeLimitMB * 1024 * 1024,
    },
  }).single(fieldName);

  return uploader;
};


/**
 * S3に保存するアップローダーを生成
 * ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
 * ■■■■■■■■■■■■■■■■■■■■■■■■■■■■現状正常動作を確認していない■■■■■■■■■■■■■■■■■■■■■■■
 * MiniO をローカルで動作させて確認したけど、うまく動かない
 * ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
 * @param {string} bucketName バケット名
 * @param {string} region リージョン
 * @param {string} accessKeyId アクセスキー
 * @param {string} secretAccessKey シークレットアクセスキー
 * @param {string} fieldName フィールド名
 * @param {number} sizeLimitMB 上限サイズMB
 * @returns multer-s3 uploader
 */
const createS3StorageUploader = (bucket, region, accessKeyId, secretAccessKey, fieldName, sizeLimitMB) => {
  const s3 = createS3Connector(region, accessJson);

  const uploader = multer({
    storage: multerS3({
      s3: s3,
      bucket,
      metadata: (req, file, callback) => {
        callback(null, {
          fileName: file.originalname,
          fieldName,
        });
      },
      key: function (req, file, callback) {
        const extension = util.getExtension(file.originalname);
        callback(null, `${Date.now().toString()}.${extension}`);
      }
    }),
    limits: {
      fileSize: sizeLimitMB * 1024 * 1024,
    },
  }).single(fieldName);

  return uploader;
};

/**
 * S3 にファイルパスのファイルを読み込んでアップロード
 *
 * @param {string} region
 * @param {string} bucket
 * @param {json} accessJson
 * @param {string} fileName
 * @param {string} filePath アップロード対象のファイルパス
 * @param {boolean} whenFinishDel アップロード成功でファイルを削除するならtrue
 * @param {string} key S3のキー 与えなければtime.extを自動作成
 */
const uploadForS3 = (region, bucket, accessJson, fileName, filePath, whenFinishDel, key) => {
  return uploadForS3Binary(
    region,
    bucket,
    accessJson,
    fileName,
    fs.readFileSync(filePath),
    key,
    null,
    whenFinishDel
      ? (err, data) => fs.unlink(filePath, () => console.log(`deleted: ${filePath}`))
      : () => {}
  );
};


/**
 * S3 に binary をアップロード
 *
 * @param {string} region
 * @param {string} bucket
 * @param {json} accessJson
 * @param {string} fileName
 * @param {*} binary
 * @param {string} key
 * @param {string} contentType
 * @param {function} callback
 */
const uploadForS3Binary = (region, bucket, accessJson, fileName, binary, key, contentType, callback) => {
  const s3 = createS3Connector(region, accessJson);

  const json = {
    Bucket: bucket,
    Key: key || `${Date.now().toString()}.${util.getExtension(fileName)}`,
    Metadata: {
      fileName: encodeURI(fileName),
    },
    Body: binary,
  };

  if (!!contentType) {
    json.ContentType = contentType;
  }

  const r = s3.putObject(json,
    (err, data) => {
      if (!!err) {
        error('S3 upload error', key, fileName, encodeURI(fileName), err);
        return;
      }
      if (!!callback) {
        callback(err, data);
      }
    });
  return key;
};

/**
 * S3 のファイルを削除
 *
 * @param {*} region
 * @param {*} bucket
 * @param {*} accessJson
 * @param {*} key
 */
 const deleteForS3 = (region, bucket, accessJson, key) => {
  const s3 = createS3Connector(region, accessJson);

  const r = s3.deleteObject({
    Bucket: bucket,
    Key: key,
  }, (err, data) => {
    if (!!err) {
      error('S3 delete error', err);
      return;
    }
    info('S3 delete success', key);
  });
  return r;
};

/**
 * このアプリで管理する S3_URL_MANAGE（要するにキャッシュ）からURLを取得
 * なければS3に問い合わせて作って、キャッシュして返却
 * 複数対応 keys は　array
 * 返却は keis の数を保証する
 * @param {string} region
 * @param {string} bucket
 * @param {json} accessJson
 * @param {array} keis S3キー配列
 * @param {int} expireSec 現在時からの有効期限秒
 */
const getS3ManagedUrl = async (region, bucket, accessJson, keis, expireSec) => {
  const dbList = await getListAndDelExpired(keis);

  // key, url, expireDate のJSON配列
  // DBになかったものは result には含まれないので、ここで S3 に問い合わせて
  // S3_URL_MANAGE に保存（キャッシュ）する
  // なかったものを探しつつDBキャッシュする
  const result = [];
  // とりあえずコネクタは作っておく
  const s3 = createS3Connector(region, accessJson);
  // 新しい expireDate を確保する
  const newExpireDate = Date.now() + expireSec * 1000;
  for (let k of keis) {
    const db = dbList.find((e) => e.key === k);
    if (!!db) {
      result.push(db);
    } else {
      const newPresignedUrl = s3.getSignedUrl(
        'getObject',
        {
          Bucket: bucket,
          Key: k,
          Expires: expireSec || 3600,
        },
      );

      // resultセット
      result.push({
        key: k,
        url: newPresignedUrl,
        expireDate: newExpireDate,
        isNew: true,
      });

      // 新たにキャッシュ S3_URL_MANAGE にセット
      await saveNew(k, newPresignedUrl, new Date(newExpireDate));
    }
  }
  return result;
};

/**
 * S3 の presigned url を取得
 *
 */
const getS3Url = (region, bucket, accessJson, key, expireSec) => {
  const s3 = createS3Connector(region, accessJson);

  return s3.getSignedUrl(
    'getObject',
    {
      Bucket: bucket,
      Key: key,
      Expires: expireSec || 3600,
    },
  );
};

const getS3UrlLight = (s3Connector, bucket, key, expireSec) => {
  return s3Connector.getSignedUrl(
    'getObject',
    {
      Bucket: bucket,
      Key: key,
      Expires: expireSec || 3600,
    },
  );
};

const createS3Connector = (region, accessJson) => {
  AWS.config.update({
    region,
  });
  return new AWS.S3(accessJson);
};

const createS3ConnecotByConfig = () => {
  return createS3Connector(AWS_S3.region, AWS_S3.accessJson);
};

module.exports = {
  createLocalStorageUploader,
  createS3StorageUploader,
  uploadForS3,
  uploadForS3Binary,
  deleteForS3,
  getS3Url,
  getS3UrlLight,
  getS3ManagedUrl,
  createS3Connector,
  createS3ConnecotByConfig,
};
