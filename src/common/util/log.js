const log4js = require('log4js');
const config = require('../../config');
const mail = require('./mail');

log4js.configure(config.LOG_CONFIG);

const logger = log4js.getLogger();
const errorLogger = log4js.getLogger('error');
const loggerForExpress = log4js.connectLogger(logger);

function info(...logArray){
    const log = toCharForArrayParam(logArray);
    logger.info(log);
}

function debug(...logArray){
    const log = toCharForArrayParam(logArray);
    logger.debug(log);
}

function warn(...logArray){
    const log = toCharForArrayParam(logArray);
    errorLogger.warn(log);
    console.warn(log);
    if(config.ALERT_MAIL.is && 'warn' === config.ALERT_MAIL.logLevel){
        mail.sendTo(
            config.MAIL_CONFIG,
            config.ALERT_MAIL.mailTo,
            config.ALERT_MAIL.mailFrom,
            config.ALERT_MAIL.mailCC,
            '',
            log,
            config.ALERT_MAIL.subject + '[warn]'
        );
    }
}

function error(...logArray){
    const log = toCharForArrayParam(logArray);
    errorLogger.error(JSON.stringify(logArray, null, "\t"));
    if(config.ALERT_MAIL.is && ['warn', 'error'].includes(config.ALERT_MAIL.logLevel)){
        mail.sendTo(
            config.MAIL_CONFIG,
            config.ALERT_MAIL.mailTo,
            config.ALERT_MAIL.mailFrom,
            config.ALERT_MAIL.mailCC,
            '',
            log,
            config.ALERT_MAIL.subject + '[error]',
            [],
            function(err, info){
                if(err){
                    //送信失敗
                    errorLogger.error(`ErrorLogMail Sent Failure [${info}]\n${err}`);
                }else{
                    //送信成功
                    logger.info(`ErrorLogMail Sent [${info}]`);
                }
            }
        );
    }
}

// 不定引数を文字列化
function toCharForArrayParam(...src) {
    if (!src || src?.length < 1) {
        return '';
    } else if (src.length === 1) {
        return src[0];
    }
    return src.join("\n");
}

module.exports = {
    logger,
    errorLogger,
    loggerForExpress,
    info,
    debug,
    warn,
    error,
};
