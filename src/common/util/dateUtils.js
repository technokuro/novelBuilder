/**
 * 日付フォーマッタ.
 * @param {Date}} date 日付オブジェクト
 * @param {String} format
 *      フォーマット文字
 *      yyyy, MM, dd, HH, mm, ss, SSS
 */
function formatDate(date, format) {
    if (!date) {
        return null;
    }
    const result = format;
    let target;
    if (typeof date === 'number') {
        target = new Date(date);
    } else if (typeof date === 'string') {
        let year;
        let month;
        let day;
        let hour;
        let min;
        let sec;
        if (date.length >= 8) {
        try {
            year = parseInt(date.substring(0, 4), 10) || undefined;
            month = (parseInt(date.substring(4, 6), 10) - 1) || undefined;
            day = parseInt(date.substring(6, 8), 10) || undefined;
            hour = parseInt(date.substring(8, 10), 10) || undefined;
            min = parseInt(date.substring(10, 12), 10) || undefined;
            sec = parseInt(date.substring(12, 14), 10) || undefined;
        } catch (err) {
            // 無視
        }
        const now = new Date();
        if (year === undefined) {
            year = now.getFullYear();
        }
        if (month === undefined) {
            month = now.getMonth();
        }
        if (day === undefined) {
            day = now.getDate();
        }
        if (hour === undefined) {
            hour = now.getHours();
        }
        if (min === undefined) {
            min = now.getMinutes();
        }
        if (sec === undefined) {
            sec = now.getSeconds();
        }
        }
        target = new Date(year, month, day, hour, min, sec);
    } else {
        try {
        target = new Date(date.getTime());
        } catch (err) {
        return null;
        }
    }
    return result.replace(/yyyy/g, target.getFullYear())
        .replace(/MM/g, (`0${target.getMonth() + 1}`).slice(-2))
        .replace(/M/g, (target.getMonth() + 1))
        .replace(/dd/g, (`0${target.getDate()}`).slice(-2))
        .replace(/d/g, target.getDate())
        .replace(/HH/g, (`0${target.getHours()}`).slice(-2))
        .replace(/H/g, target.getHours())
        .replace(/mm/g, (`0${target.getMinutes()}`).slice(-2))
        .replace(/m/g, target.getMinutes())
        .replace(/ss/g, (`0${target.getSeconds()}`).slice(-2))
        .replace(/s/g, target.getSeconds())
        .replace(/SSS/g, (`00${target.getMilliseconds()}`).slice(-3));
}

/**
 * 日付が正しいか
 * 全空は許容
 * @param {string | number} year
 * @param {string | number} month
 * @param {string | number} day
 * @param {string | number} hour
 * @param {string | number} minute
 */
function checkDate(year, month, day, hour, minute){
    if(!year && !month && !day && !hour && !minute){
        return true;
    }
    try{
        let y = parseInt(year);
        let m = parseInt(month);
        let d = parseInt(day);
        let h = parseInt(hour);
        let min = parseInt(minute);
        let date = new Date(y, m - 1, d, h, min);
        return date.getFullYear() == y &&
                date.getMonth() + 1 == m &&
                date.getDate() == d &&
                date.getHours() == h &&
                date.getMinutes() == min;
    }catch(err){
        return false;
    }
}

/**
 * 日付を生成
 * 全空は許容
 * @param {string | number} year
 * @param {string | number} month
 * @param {string | number} day
 * @param {string | number} hour
 * @param {string | number} minute
 */
function createDate(year, month, day, hour, minute){
    if(!year && !month && !day && !hour && !minute){
        return null;
    }
    let y = parseInt(year);
    let m = parseInt(month);
    let d = parseInt(day);
    let h = parseInt(hour);
    let min = parseInt(minute);
    return new Date(y, m - 1, d, h, min);
}

/**
 * 日付を文字列から生成
 * 全空はnull返却
 * @param {string | number} yyyymmdd
 */
 function createDateFromString(yyyymmdd){
    if (!yyyymmdd || yyyymmdd?.toString().length != 8 || yyyymmdd != parseInt(yyyymmdd.toString(), 10)) {
        return null;
    }
    const y = parseInt(yyyymmdd.slice(0, 4), 10);
    const m = parseInt(yyyymmdd.slice(4, 6), 10);
    const d = parseInt(yyyymmdd.slice(6), 10);
    return new Date(y, m - 1, d, 0, 0);
}

/**
 * 日付文字列をチェック
 * @param {string | number} yyyymmdd
 */
 function checkDateFromString(yyyymmdd){
    try {
        const date = createDateFromString(yyyymmdd);
        if (!date) {
            return false;
        }
        return checkDate(
            date.getFullYear(),
            date.getMonth() + 1,
            date.getDate(),
            date.getHours(),
            date.getMinutes(),
        );
    } catch(err) {
        return false;
    }
}

/**
 * 年齢算出
 * @param {*} birthday
 * @returns
 */
function getAge(birthday){
    if (!birthday) return null;
    //今日
    const today = new Date();
    //今年の誕生日
    const thisYearsBirthday = new Date(today.getFullYear(), birthday.getMonth()-1, birthday.getDate());
    //年齢
    let age = today.getFullYear() - birthday.getFullYear();
    if(today < thisYearsBirthday){
        //今年まだ誕生日が来ていない
        age--;
    }
    return age;
}

module.exports = {
    formatDate,
    checkDate,
    createDate,
    createDateFromString,
    checkDateFromString,
    getAge,
};
