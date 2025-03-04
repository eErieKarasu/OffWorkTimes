/**
 * 下班时间统计 - 仪表盘页面JavaScript
 */

// DOM元素加载完成后执行
document.addEventListener('DOMContentLoaded', async function() {
    // 初始化数据
    await initializeData();
    
    // 更新当前日期
    const now = new Date();
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${weekdays[now.getDay()]}`;
    document.getElementById('current-date').textContent = dateStr;
    
    // 从服务器获取目标下班时间
    const settings = await apiGetSettings();
    document.getElementById('target-time').textContent = settings.targetTime || '18:00';
    
    // 绘制趋势图
    await drawTrendChart();
    
    // 记录今日下班时间按钮
    document.getElementById('record-today').addEventListener('click', function() {
        window.location.href = 'record.html';
    });
});

/**
 * 初始化数据
 */
async function initializeData() {
    try {
        // 检查是否有设置数据
        const settings = await apiGetSettings();
        
        // 如果没有设置，则初始化默认设置
        if (Object.keys(settings).length === 0) {
            const defaultSettings = {
                targetTime: '18:00',
                workdays: [true, true, true, true, true, false, false], // 周一到周日
                dataRetention: '365',
                theme: 'light'
            };
            
            // 保存默认设置到服务器
            await apiSaveSettings(defaultSettings);
        }
        
        // 计算并更新统计数据
        await updateStats();
    } catch (error) {
        console.error('初始化数据时出错:', error);
        alert('初始化数据失败: ' + error.message);
    }
}

/**
 * 计算并更新统计数据
 */
async function updateStats() {
    try {
        const records = await apiGetRecords();
        const settings = await apiGetSettings();
        const targetTime = settings.targetTime || '18:00';
        
        // 获取当前日期
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const currentWeek = getWeekNumber(now);
        
        // 过滤本周和本月的记录
        const thisWeekRecords = records.filter(record => {
            const recordDate = new Date(record.date);
            return getWeekNumber(recordDate) === currentWeek && recordDate.getFullYear() === currentYear;
        });
        
        const thisMonthRecords = records.filter(record => {
            const recordDate = new Date(record.date);
            return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
        });
        
        // 获取上周和上月的记录
        const lastWeek = currentWeek - 1;
        const lastWeekYear = currentYear;
        const lastWeekRecords = records.filter(record => {
            const recordDate = new Date(record.date);
            const recordYear = recordDate.getFullYear();
            const recordWeek = getWeekNumber(recordDate);
            
            // 处理跨年的情况
            if (lastWeek <= 0) {
                return recordWeek >= 52 && recordYear === currentYear - 1;
            }
            
            return recordWeek === lastWeek && recordYear === lastWeekYear;
        });
        
        const lastMonth = currentMonth - 1;
        const lastMonthYear = lastMonth < 0 ? currentYear - 1 : currentYear;
        const lastMonthValue = lastMonth < 0 ? 11 : lastMonth;
        const lastMonthRecords = records.filter(record => {
            const recordDate = new Date(record.date);
            return recordDate.getMonth() === lastMonthValue && recordDate.getFullYear() === lastMonthYear;
        });
        
        // 计算本周平均下班时间
        const weekAvg = calculateAverageTime(thisWeekRecords.map(r => r.time));
        document.getElementById('week-avg').textContent = thisWeekRecords.length > 0 ? weekAvg : "暂无数据";
        
        // 计算本月平均下班时间
        const monthAvg = calculateAverageTime(thisMonthRecords.map(r => r.time));
        document.getElementById('month-avg').textContent = thisMonthRecords.length > 0 ? monthAvg : "暂无数据";
        
        // 计算上周平均下班时间
        const lastWeekAvg = calculateAverageTime(lastWeekRecords.map(r => r.time));
        
        // 计算上月平均下班时间
        const lastMonthAvg = calculateAverageTime(lastMonthRecords.map(r => r.time));
        
        // 计算本周与目标时间的差异
        const weekDiff = calculateTimeDifference(weekAvg, targetTime);
        const weekDiffElem = document.getElementById('week-diff');
        const weekDiffIconElem = weekDiffElem.previousElementSibling;
        const weekDiffTextElem = weekDiffElem.parentElement;
        
        if (thisWeekRecords.length === 0) {
            weekDiffTextElem.innerHTML = '本周暂无数据';
        } else {
            if (weekDiff > 0) {
                weekDiffElem.textContent = `${Math.floor(weekDiff / 60)}小时${weekDiff % 60}分钟`;
                weekDiffIconElem.className = 'fas fa-arrow-up';
                weekDiffIconElem.style.color = '#e74c3c';
                weekDiffTextElem.innerHTML = `<i class="fas fa-arrow-up" style="color: #e74c3c;"></i> 比目标时间晚了 <span id="week-diff">${Math.floor(weekDiff / 60)}小时${weekDiff % 60}分钟</span>`;
            } else if (weekDiff < 0) {
                const absDiff = Math.abs(weekDiff);
                weekDiffElem.textContent = `${Math.floor(absDiff / 60)}小时${absDiff % 60}分钟`;
                weekDiffIconElem.className = 'fas fa-arrow-down';
                weekDiffIconElem.style.color = '#2ecc71';
                weekDiffTextElem.innerHTML = `<i class="fas fa-arrow-down" style="color: #2ecc71;"></i> 比目标时间早了 <span id="week-diff">${Math.floor(absDiff / 60)}小时${absDiff % 60}分钟</span>`;
            } else {
                weekDiffElem.textContent = '0分钟';
                weekDiffTextElem.innerHTML = '与目标时间一致';
            }
            
            // 与上周比较
            if (lastWeekRecords.length > 0) {
                const weekCompare = calculateTimeDifference(weekAvg, lastWeekAvg);
                if (weekCompare > 0) {
                    weekDiffTextElem.innerHTML += `<br><i class="fas fa-arrow-up" style="color: #e74c3c;"></i> 比上周晚了 <span>${Math.floor(weekCompare / 60)}小时${weekCompare % 60}分钟</span>`;
                } else if (weekCompare < 0) {
                    const absCompare = Math.abs(weekCompare);
                    weekDiffTextElem.innerHTML += `<br><i class="fas fa-arrow-down" style="color: #2ecc71;"></i> 比上周早了 <span>${Math.floor(absCompare / 60)}小时${absCompare % 60}分钟</span>`;
                } else {
                    weekDiffTextElem.innerHTML += '<br>与上周持平';
                }
            }
        }
        
        // 计算本月与目标时间的差异
        const monthDiff = calculateTimeDifference(monthAvg, targetTime);
        const monthDiffElem = document.getElementById('month-diff');
        const monthDiffIconElem = monthDiffElem.previousElementSibling;
        const monthDiffTextElem = monthDiffElem.parentElement;
        
        if (thisMonthRecords.length === 0) {
            monthDiffTextElem.innerHTML = '本月暂无数据';
        } else {
            if (monthDiff > 0) {
                monthDiffElem.textContent = `${Math.floor(monthDiff / 60)}小时${monthDiff % 60}分钟`;
                monthDiffIconElem.className = 'fas fa-arrow-up';
                monthDiffIconElem.style.color = '#e74c3c';
                monthDiffTextElem.innerHTML = `<i class="fas fa-arrow-up" style="color: #e74c3c;"></i> 比目标时间晚了 <span id="month-diff">${Math.floor(monthDiff / 60)}小时${monthDiff % 60}分钟</span>`;
            } else if (monthDiff < 0) {
                const absDiff = Math.abs(monthDiff);
                monthDiffElem.textContent = `${Math.floor(absDiff / 60)}小时${absDiff % 60}分钟`;
                monthDiffIconElem.className = 'fas fa-arrow-down';
                monthDiffIconElem.style.color = '#2ecc71';
                monthDiffTextElem.innerHTML = `<i class="fas fa-arrow-down" style="color: #2ecc71;"></i> 比目标时间早了 <span id="month-diff">${Math.floor(absDiff / 60)}小时${absDiff % 60}分钟</span>`;
            } else {
                monthDiffElem.textContent = '0分钟';
                monthDiffTextElem.innerHTML = '与目标时间一致';
            }
            
            // 与上月比较
            if (lastMonthRecords.length > 0) {
                const monthCompare = calculateTimeDifference(monthAvg, lastMonthAvg);
                if (monthCompare > 0) {
                    monthDiffTextElem.innerHTML += `<br><i class="fas fa-arrow-up" style="color: #e74c3c;"></i> 比上月晚了 <span>${Math.floor(monthCompare / 60)}小时${monthCompare % 60}分钟</span>`;
                } else if (monthCompare < 0) {
                    const absCompare = Math.abs(monthCompare);
                    monthDiffTextElem.innerHTML += `<br><i class="fas fa-arrow-down" style="color: #2ecc71;"></i> 比上月早了 <span>${Math.floor(absCompare / 60)}小时${absCompare % 60}分钟</span>`;
                } else {
                    monthDiffTextElem.innerHTML += '<br>与上月持平';
                }
            }
        }
        
        // 计算准时下班率
        const ontimeCount = thisMonthRecords.filter(record => {
            return isTimeEarlierOrEqual(record.time, targetTime);
        }).length;
        
        const ontimeRate = thisMonthRecords.length > 0 ? Math.round(ontimeCount / thisMonthRecords.length * 100) : 0;
        document.getElementById('ontime-rate').textContent = thisMonthRecords.length > 0 ? `${ontimeRate}%` : "暂无数据";
        document.getElementById('ontime-days').textContent = ontimeCount;
        
        // 更新最近记录
        updateRecentRecords(records);
    } catch (error) {
        console.error('更新统计数据时出错:', error);
    }
}

/**
 * 绘制下班时间趋势图
 */
async function drawTrendChart() {
    try {
        const chartContainer = document.getElementById('trend-chart');
        const records = await apiGetRecords();
        const settings = await apiGetSettings();
        const targetTime = settings.targetTime || '18:00';
        const targetMinutes = parseInt(targetTime.split(':')[0]) * 60 + parseInt(targetTime.split(':')[1]);
        
        // 准备数据
        const dates = [];
        const times = [];
        
        // 获取最近30天的记录
        const now = new Date();
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        console.log('当前日期:', now);
        console.log('30天前日期:', thirtyDaysAgo);
        
        // 过滤并排序记录
        const recentRecords = records
            .filter(record => {
                const recordDate = new Date(record.date);
                console.log('记录日期:', record.date, '转换后:', recordDate);
                return recordDate >= thirtyDaysAgo;
            })
            .sort((a, b) => new Date(a.date) - new Date(b.date));
        
        console.log('过滤后的记录数量:', recentRecords.length);
        
        // 提取日期和时间
        recentRecords.forEach(record => {
            const date = new Date(record.date);
            dates.push(`${date.getMonth() + 1}/${date.getDate()}`);
            
            const [hours, minutes] = record.time.split(':').map(Number);
            times.push(hours * 60 + minutes);
        });
        
        // 如果Chart.js已加载，创建图表
        if (typeof Chart !== 'undefined' && dates.length > 0) {
            // 清空容器内容
            chartContainer.innerHTML = '';
            
            // 创建canvas元素
            const canvas = document.createElement('canvas');
            chartContainer.appendChild(canvas);
            
            new Chart(canvas, {
                type: 'line',
                data: {
                    labels: dates,
                    datasets: [
                        {
                            label: '下班时间',
                            data: times.map(t => t / 60), // 转换为小时
                            borderColor: '#3498db',
                            backgroundColor: 'rgba(52, 152, 219, 0.1)',
                            borderWidth: 2,
                            tension: 0.3,
                            fill: true
                        },
                        {
                            label: '目标时间',
                            data: Array(dates.length).fill(targetMinutes / 60), // 转换为小时
                            borderColor: '#e74c3c',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            fill: false,
                            pointRadius: 0
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            min: 17,
                            max: 22,
                            ticks: {
                                callback: function(value) {
                                    const hours = Math.floor(value);
                                    const minutes = Math.round((value - hours) * 60);
                                    return `${hours}:${minutes < 10 ? '0' + minutes : minutes}`;
                                }
                            },
                            title: {
                                display: true,
                                text: '时间'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: '日期'
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = context.raw;
                                    const hours = Math.floor(value);
                                    const minutes = Math.round((value - hours) * 60);
                                    return `下班时间: ${hours}:${minutes < 10 ? '0' + minutes : minutes}`;
                                }
                            }
                        },
                        title: {
                            display: true,
                            text: dates.length < 30 ? `最近${dates.length}天的下班时间趋势` : '最近30天的下班时间趋势',
                            font: {
                                size: 16
                            }
                        }
                    }
                }
            });
        } else {
            // 如果没有数据或Chart.js未加载，显示提示信息
            chartContainer.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <i class="fas fa-chart-line" style="font-size: 48px; margin-bottom: 10px;"></i>
                    <p>暂无下班时间记录数据</p>
                </div>
            `;
            console.error('Chart.js未加载或没有记录数据');
        }
    } catch (error) {
        console.error('绘制趋势图时出错:', error);
        document.getElementById('trend-chart').innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 10px; color: #e74c3c;"></i>
                <p>加载趋势图时出错: ${error.message}</p>
            </div>
        `;
    }
}

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
 * 更新最近记录列表
 * @param {Array} records - 记录数组
 */
function updateRecentRecords(records) {
    // 检查是否存在最近记录的容器元素
    const recentRecordsContainer = document.getElementById('recent-records');
    if (!recentRecordsContainer) {
        return; // 如果不存在，直接返回
    }
    
    // 获取最近5条记录
    const recentRecords = records.slice(0, 5);
    
    // 清空现有内容
    recentRecordsContainer.innerHTML = '<h3>最近记录</h3>';
    
    if (recentRecords.length === 0) {
        recentRecordsContainer.innerHTML += '<p style="text-align: center; padding: 20px;">暂无记录</p>';
        return;
    }
    
    // 创建表格
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.marginTop = '15px';
    
    // 创建表头
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.style.background = '#f2f2f2';
    
    const headers = ['日期', '下班时间', '备注'];
    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.style.padding = '12px';
        th.style.textAlign = headerText === '日期' ? 'left' : 'center';
        th.style.borderBottom = '1px solid #ddd';
        th.textContent = headerText;
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // 创建表体
    const tbody = document.createElement('tbody');
    
    recentRecords.forEach(record => {
        const row = document.createElement('tr');
        
        // 日期单元格
        const dateCell = document.createElement('td');
        dateCell.style.padding = '12px';
        dateCell.style.borderBottom = '1px solid #eee';
        dateCell.textContent = formatDateForDisplay(record.date);
        
        // 时间单元格
        const timeCell = document.createElement('td');
        timeCell.style.padding = '12px';
        timeCell.style.textAlign = 'center';
        timeCell.style.borderBottom = '1px solid #eee';
        timeCell.textContent = record.time;
        
        // 备注单元格
        const noteCell = document.createElement('td');
        noteCell.style.padding = '12px';
        noteCell.style.textAlign = 'center';
        noteCell.style.borderBottom = '1px solid #eee';
        noteCell.textContent = record.note || '-';
        
        // 添加所有单元格到行
        row.appendChild(dateCell);
        row.appendChild(timeCell);
        row.appendChild(noteCell);
        
        // 添加行到表格
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    recentRecordsContainer.appendChild(table);
} 