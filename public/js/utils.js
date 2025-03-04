/**
 * 下班时间统计 - 通用工具函数
 */

/**
 * 获取日期所在的周数
 * @param {Date} date - 日期对象
 * @returns {number} 周数
 */
function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

/**
 * 计算时间列表的平均值
 * @param {string[]} times - 时间字符串数组，格式为 "HH:MM"
 * @returns {string} 平均时间，格式为 "HH:MM"
 */
function calculateAverageTime(times) {
    if (!times || times.length === 0) {
        return "00:00";
    }
    
    // 将所有时间转换为分钟
    const minutes = times.map(time => {
        const [hours, mins] = time.split(':').map(Number);
        return hours * 60 + mins;
    });
    
    // 计算平均分钟数
    const totalMinutes = minutes.reduce((sum, min) => sum + min, 0);
    const avgMinutes = Math.round(totalMinutes / times.length);
    
    // 转换回 HH:MM 格式
    const hours = Math.floor(avgMinutes / 60);
    const mins = avgMinutes % 60;
    
    return `${hours}:${mins.toString().padStart(2, '0')}`;
}

/**
 * 计算两个时间的差值（分钟）
 * @param {string} time1 - 第一个时间，格式为 "HH:MM"
 * @param {string} time2 - 第二个时间，格式为 "HH:MM"
 * @returns {number} 时间差（分钟），正值表示time1晚于time2，负值表示time1早于time2
 */
function calculateTimeDifference(time1, time2) {
    if (!time1 || !time2) {
        return 0;
    }
    
    const [hours1, mins1] = time1.split(':').map(Number);
    const [hours2, mins2] = time2.split(':').map(Number);
    
    const totalMins1 = hours1 * 60 + mins1;
    const totalMins2 = hours2 * 60 + mins2;
    
    return totalMins1 - totalMins2;
}

/**
 * 判断时间1是否早于或等于时间2
 * @param {string} time1 - 第一个时间，格式为 "HH:MM"
 * @param {string} time2 - 第二个时间，格式为 "HH:MM"
 * @returns {boolean} 如果time1早于或等于time2，则返回true
 */
function isTimeEarlierOrEqual(time1, time2) {
    return calculateTimeDifference(time1, time2) <= 0;
}

/**
 * 格式化日期为 YYYY-MM-DD 格式
 * @param {Date} date - 日期对象
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * 格式化日期为友好显示格式
 * @param {string} dateStr - 日期字符串，格式为 YYYY-MM-DD
 * @returns {string} 格式化后的日期字符串，例如 "2023年6月15日 星期四"
 */
function formatDateForDisplay(dateStr) {
    const date = new Date(dateStr);
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 星期${weekdays[date.getDay()]}`;
}
