const createError = require('http-errors');
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const helmet = require('helmet');
const logger = require('./common/util/log');
const config = require('./config');
const flash = require('connect-flash');

const app = express();

// view engine setup
// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'ejs');

// log setting
app.use(logger.loggerForExpress);

app.use(bodyParser.json({
  type: 'application/json',
  limit: '10mb',
}));
app.use(express.json({ extended: true, limit: '10mb'}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(cookieParser());
app.use(cors({credentials: true, origin: true}));

// if(config.SESSION_CONFIG.cookie.secure){
//   app.set('trust Proxy', 1);
// }
// app.use(session(config.SESSION_CONFIG));

app.use(flash());

// app.use(express.static(path.join(__dirname, 'public')));

// helmet security
app.use(helmet());
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set('X-XSS-Protection', '1; mode=block');
  res.set('Content-Security-Policy',
    [ "object-src 'self';",
      "script-src 'self'",
      'reflected-xss block',
      'https://ajax.googleapis.com',
      'https://www.googletagmanager.com',
      'https://www.google-analytics.com/analytics.js',
      'https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js',
      'https://code.jquery.com/',
      'https://cdn.muicss.com/mui-0.10.3/js/mui.min.js;'
    ].join(' '));

  res.header('Access-Control-Allow-Origin', config.CORS_ORIGIN);
  res.header('Access-Control-Allow-Methods', 'GET,POST');
  res.header(
    'Access-Control-Allow-Headers',
    'Content-Type, authorization'
  );

  if (config.isTest()) {
    logger.debug(`
method:${req.method}
url:${req.url}
authorization:${req.headers.authorization}
body:${JSON.stringify(req.body)}
header:${JSON.stringify(req.headers)}
`);
  }

  if ('OPTIONS' === req.method) {
    res.status(200).send();
    return;
  }
  next();
});

// no 304
//app.disable('etag');

// app common initialize
app.use('/app/account', require('./common/routes/account').router);
app.use('/app/oauth', require('./common/routes/accountOauth').router);
app.use('/app/address', require('./common/routes/address').router);
app.use('/app/station', require('./common/routes/station').router);
app.use('/app/definitions', require('./common/routes/definitions').router);
app.use('/app/checkCsrf', require('./common/routes/checkCsrf').router);
app.use('/app/govHoujin', require('./common/routes/govHoujin').router);

// app child initialize
const childApp = require('./app/appInit');
childApp.appRouter(app);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = config.isTest() ? err : {};

  logger.error(`errorRequestUrl:${req.url}\nerrorStacks:${err.stack}\n`);
  // render the error page
  res.status(err.status || 500).json();
  // response.next(req, res, def.EJS.ERROR, def.RESULT_CODE.ERROR, err);
});

module.exports = app;
