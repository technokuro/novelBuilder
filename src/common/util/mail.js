const mailer = require('nodemailer');
const usage = ["set by json: {",
                "  host: ,",
                "  port: ,",
                "  secure: ,",
                "  auth: {",
                "    user: process.env.MAIL_USER, ",
                "    pass: process.env.MAIL_PASS",
                "  }",
                "}"].join("\n");

/**
 *  メール送信
 * @param {json} config 
 * @param {array|string} mailTo 
 * @param {array|string} mailFrom 
 * @param {array|string} mailCC 
 * @param {array|string} mailBcc 
 * @param {string} text 
 * @param {string} subject 
 * @param {array} exConf {
 *  before:変換前文字列,
 *  after:変換後文字列
 * },
 * @param {function} func err, res, info(ログ用メール詳細メッセージ) を引数に持つ送信後処理
 */
function sendTo(config, mailTo, mailFrom, mailCC, mailBcc, text, subject, exConf, func){
    let smtp;
    if(config && config.host && config.port > 0 && config.auth.user && config.auth.pass){
        smtp = mailer.createTransport(config);
    }else{
        throw (usage);
    }

    if(exConf){
        if(Array.isArray(exConf)){
            exConf.forEach(e => {
                text = exChangeText(e, text);
                subject = exChangeText(e, subject);
            });
        }else{
            text = exChangeText(e, text);
            subject = exChangeText(e, subject);
        }
    }

    const mailOption = {
        from: mailFrom,
        to: mailTo,
        cc: mailCC,
        bcc: mailBcc,
        text: "" + text,
        subject: subject
    };

    smtp.sendMail(mailOption, function(err){
        if(func){
            let t = "" + text;
            let message = `Mail Send To:${mailTo} From:${mailFrom} CC:${mailCC} BCC:${mailBcc} Subject:${subject.substring(0, 5)} Body:${t.substring(0, 5)}`;
            func(err, message);
        }
    });
}

/** メールの件名と本文をキーで置換 */
function exChangeText(e, str){
    if(str){
        return str.replace(new RegExp(e.before,"g"), e.after);
    }else{
        return '';
    }
}

module.exports = {
    sendTo,
};