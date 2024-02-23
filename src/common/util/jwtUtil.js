const jwt = require('jsonwebtoken');
const { TOKEN_KEY, TOKEN_EXPIRE, TOKEN_ALGO } = require('../../config');

/** トークン生成 */
const createToken = (json, tokenKey, tokenExpire, tokenAlgo) => {
  const token = jwt.sign(
    json,
    tokenKey || TOKEN_KEY,
    {
      expiresIn: tokenExpire || TOKEN_EXPIRE,
      algorithm: tokenAlgo || TOKEN_ALGO,
    }
  );
  return {
    token,
    expire: jwt.decode(token).exp * 1000,
  };
};

/** トークン確認 */
const verifyToken = (token, onSuccess, onError, tokenKey) => {
  try {
    jwt.verify(
      token,
      tokenKey || TOKEN_KEY,
      async (err, decoded) => {
        if (err) {
          onError(err);
        } else {
          try {
            onSuccess(decoded);
          } catch (successThrown) {
            onError(successThrown);
          }
        }
      }
    );
  } catch(err) {
    onError(err);
  }
};

module.exports = {
  createToken,
  verifyToken,
};
