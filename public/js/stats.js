/**
 * 下班时间统计 - 统计分析页面JavaScript
 */

// 全局变量，用于存储图表实例
let weekdayChart = null;
let monthlyChart = null;
let trendChart = null;

// DOM元素加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM 已加载，准备初始化图表...');
    
    // 使用 setTimeout 确保 DOM 完全渲染
    setTimeout(async function() {
        try {
            // 初始化图表
            await initCharts();
            
            // 时间范围选择器事件
            document.getElementById('time-range').addEventListener('change', async function() {
                await updateCharts();
            });
            
            // 导出CSV按钮事件
            document.getElementById('export-csv').addEventListener('click', exportCSV);
        } catch (error) {
            console.error('初始化图表时出错:', error);
        }
    }, 100);
});

/**
 * 初始化图表
 */
async function initCharts() {
    try {
        console.log('开始初始化图表...');
        
        // 从服务器获取记录
        const records = await apiGetRecords();
        console.log(`获取到 ${records.length} 条记录`);
        
        if (records.length === 0) {
            document.getElementById('charts-container').innerHTML = '<div class="no-data">暂无数据</div>';
            return;
        }
        
        // 检查 canvas 元素
        const weekdayCanvas = document.getElementById('weekday-chart');
        const monthlyCanvas = document.getElementById('monthly-chart');
        const trendCanvas = document.getElementById('trend-chart');
        
        console.log('Canvas 元素检查:');
        console.log('weekday-chart:', weekdayCanvas ? '存在' : '不存在');
        console.log('monthly-chart:', monthlyCanvas ? '存在' : '不存在');
        console.log('trend-chart:', trendCanvas ? '存在' : '不存在');
        
        // 创建图表
        console.log('开始创建工作日图表...');
        await createWeekdayChart(records);
        
        console.log('开始创建月度图表...');
        await createMonthlyChart(records);
        
        console.log('开始创建趋势图表...');
        await createTrendChart(records);
        
        // 更新统计数据
        console.log('开始更新统计数据...');
        await updateStats(records);
        
        console.log('图表初始化完成');
    } catch (error) {
        console.error('初始化图表时出错:', error);
        alert('初始化图表失败: ' + error.message);
    }
}

/**
 * 更新图表
 */
async function updateCharts() {
    try {
        // 从服务器获取记录
        const records = await apiGetRecords();
        
        if (records.length === 0) {
            document.getElementById('charts-container').innerHTML = '<div class="no-data">暂无数据</div>';
            return;
        }
        
        // 获取选择的时间范围
        const timeRange = document.getElementById('time-range').value;
        
        // 根据时间范围过滤记录
        const filteredRecords = filterRecordsByTimeRange(records, timeRange);
        
        // 更新图表
        await updateWeekdayChart(filteredRecords);
        updateMonthlyChart(filteredRecords);
        updateTrendChart(filteredRecords);
        
        // 更新统计数据
        updateStats(filteredRecords);
    } catch (error) {
        console.error('更新图表时出错:', error);
        alert('更新图表失败: ' + error.message);
    }
}

/**
 * 创建工作日平均下班时间图表
 * @param {Array} records - 记录数组
 */
async function createWeekdayChart(records) {
    try {
        // 检查 canvas 元素是否存在
        const canvas = document.getElementById('weekday-chart');
        if (!canvas) {
            console.error('找不到 weekday-chart canvas 元素');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('无法获取 weekday-chart 的 2D 上下文');
            return;
        }
        
        // 获取设置
        const settings = await apiGetSettings();
        
        // 按工作日分组
        const weekdayData = [0, 0, 0, 0, 0, 0, 0]; // 周日到周六
        const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];
        
        records.forEach(record => {
            const date = new Date(record.date);
            const weekday = date.getDay(); // 0-6，0表示周日
            
            const [hours, minutes] = record.time.split(':').map(Number);
            const totalMinutes = hours * 60 + minutes;
            
            weekdayData[weekday] += totalMinutes;
            weekdayCounts[weekday]++;
        });
        
        // 计算平均值
        const weekdayAvg = weekdayData.map((total, index) => {
            if (weekdayCounts[index] === 0) return 0;
            return Math.round(total / weekdayCounts[index]);
        });
        
        // 转换为小时:分钟格式
        const weekdayLabels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const weekdayTimes = weekdayAvg.map(minutes => {
            if (minutes === 0) return '无数据';
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return `${hours}:${mins.toString().padStart(2, '0')}`;
        });
        
        // 获取目标下班时间
        const targetTime = settings.targetTime || '18:00';
        const [targetHours, targetMinutes] = targetTime.split(':').map(Number);
        const targetTimeMinutes = targetHours * 60 + targetMinutes;
        
        // 如果图表已存在，销毁它
        if (weekdayChart) {
            weekdayChart.destroy();
        }
        
        weekdayChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: weekdayLabels,
                datasets: [{
                    label: '平均下班时间（分钟）',
                    data: weekdayAvg,
                    backgroundColor: weekdayAvg.map(minutes => {
                        if (minutes === 0) return '#e0e0e0';
                        return minutes > targetTimeMinutes ? '#ff7675' : '#55efc4';
                    }),
                    borderColor: weekdayAvg.map(minutes => {
                        if (minutes === 0) return '#c0c0c0';
                        return minutes > targetTimeMinutes ? '#d63031' : '#00b894';
                    }),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: false,
                        min: Math.max(0, targetTimeMinutes - 120), // 目标时间前2小时
                        max: targetTimeMinutes + 180, // 目标时间后3小时
                        ticks: {
                            callback: function(value) {
                                const hours = Math.floor(value / 60);
                                const mins = value % 60;
                                return `${hours}:${mins.toString().padStart(2, '0')}`;
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                if (value === 0) return '无数据';
                                const hours = Math.floor(value / 60);
                                const mins = value % 60;
                                return `平均下班时间: ${hours}:${mins.toString().padStart(2, '0')}`;
                            }
                        }
                    }
                }
            }
        });
        
        // 更新图表下方的数据标签
        const weekdayDataElem = document.getElementById('weekday-data');
        if (weekdayDataElem) {
            weekdayDataElem.innerHTML = weekdayLabels.map((label, index) => {
                return `<div class="data-item">
                    <div class="data-label">${label}</div>
                    <div class="data-value ${weekdayAvg[index] > targetTimeMinutes ? 'negative' : 'positive'}">${weekdayTimes[index]}</div>
                </div>`;
            }).join('');
        }
    } catch (error) {
        console.error('创建工作日图表时出错:', error);
    }
}

/**
 * 更新工作日平均下班时间图表
 * @param {Array} records - 记录数组
 */
async function updateWeekdayChart(records) {
    await createWeekdayChart(records);
}

/**
 * 创建月度平均下班时间图表
 * @param {Array} records - 记录数组
 */
function createMonthlyChart(records) {
    // 按月份分组
    const monthlyData = Array(12).fill(0); // 1-12月
    const monthlyCounts = Array(12).fill(0);
    
    records.forEach(record => {
        const date = new Date(record.date);
        const month = date.getMonth(); // 0-11
        
        const [hours, minutes] = record.time.split(':').map(Number);
        const totalMinutes = hours * 60 + minutes;
        
        monthlyData[month] += totalMinutes;
        monthlyCounts[month]++;
    });
    
    // 计算平均值
    const monthlyAvg = monthlyData.map((total, index) => {
        if (monthlyCounts[index] === 0) return 0;
        return Math.round(total / monthlyCounts[index]);
    });
    
    // 转换为小时:分钟格式
    const monthLabels = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    const monthTimes = monthlyAvg.map(minutes => {
        if (minutes === 0) return '无数据';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}:${mins.toString().padStart(2, '0')}`;
    });
    
    // 获取目标下班时间
    const settings = JSON.parse(localStorage.getItem('settings') || '{"targetTime": "18:00"}');
    const [targetHours, targetMinutes] = settings.targetTime.split(':').map(Number);
    const targetTime = targetHours * 60 + targetMinutes;
    
    // 创建图表
    const ctx = document.getElementById('monthly-chart').getContext('2d');
    
    // 如果图表已存在，销毁它
    if (monthlyChart) {
        monthlyChart.destroy();
    }
    
    monthlyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: monthLabels,
            datasets: [{
                label: '平均下班时间（分钟）',
                data: monthlyAvg,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 2,
                tension: 0.1,
                fill: false,
                pointBackgroundColor: monthlyAvg.map(minutes => {
                    if (minutes === 0) return '#e0e0e0';
                    return minutes > targetTime ? '#ff7675' : '#55efc4';
                }),
                pointBorderColor: monthlyAvg.map(minutes => {
                    if (minutes === 0) return '#c0c0c0';
                    return minutes > targetTime ? '#d63031' : '#00b894';
                }),
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false,
                    min: Math.max(0, targetTime - 120), // 目标时间前2小时
                    max: targetTime + 180, // 目标时间后3小时
                    ticks: {
                        callback: function(value) {
                            const hours = Math.floor(value / 60);
                            const mins = value % 60;
                            return `${hours}:${mins.toString().padStart(2, '0')}`;
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            if (value === 0) return '无数据';
                            const hours = Math.floor(value / 60);
                            const mins = value % 60;
                            return `平均下班时间: ${hours}:${mins.toString().padStart(2, '0')}`;
                        }
                    }
                }
            }
        }
    });
    
    // 更新图表下方的数据标签
    const monthlyDataElem = document.getElementById('monthly-data');
    if (monthlyDataElem) {
        monthlyDataElem.innerHTML = monthLabels.map((label, index) => {
            return `<div class="data-item">
                <div class="data-label">${label}</div>
                <div class="data-value ${monthlyAvg[index] > targetTime ? 'negative' : 'positive'}">${monthTimes[index]}</div>
            </div>`;
        }).join('');
    }
}

/**
 * 更新月度平均下班时间图表
 * @param {Array} records - 记录数组
 */
function updateMonthlyChart(records) {
    createMonthlyChart(records);
}

/**
 * 创建下班时间趋势图表
 * @param {Array} records - 记录数组
 */
function createTrendChart(records) {
    // 按日期排序
    const sortedRecords = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // 最多显示最近30条记录
    const recentRecords = sortedRecords.slice(-30);
    
    // 准备数据
    const dates = recentRecords.map(record => record.date);
    const times = recentRecords.map(record => {
        const [hours, minutes] = record.time.split(':').map(Number);
        return hours * 60 + minutes;
    });
    
    // 获取目标下班时间
    const settings = JSON.parse(localStorage.getItem('settings') || '{"targetTime": "18:00"}');
    const [targetHours, targetMinutes] = settings.targetTime.split(':').map(Number);
    const targetTime = targetHours * 60 + targetMinutes;
    
    // 创建图表
    const ctx = document.getElementById('trend-chart').getContext('2d');
    
    // 如果图表已存在，销毁它
    if (trendChart) {
        trendChart.destroy();
    }
    
    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates.map(date => {
                const d = new Date(date);
                return `${d.getMonth() + 1}/${d.getDate()}`;
            }),
            datasets: [{
                label: '下班时间（分钟）',
                data: times,
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 2,
                tension: 0.1,
                fill: false,
                pointBackgroundColor: times.map(time => time > targetTime ? '#ff7675' : '#55efc4'),
                pointBorderColor: times.map(time => time > targetTime ? '#d63031' : '#00b894'),
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false,
                    min: Math.max(0, targetTime - 120), // 目标时间前2小时
                    max: targetTime + 180, // 目标时间后3小时
                    ticks: {
                        callback: function(value) {
                            const hours = Math.floor(value / 60);
                            const mins = value % 60;
                            return `${hours}:${mins.toString().padStart(2, '0')}`;
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            const index = context[0].dataIndex;
                            return dates[index];
                        },
                        label: function(context) {
                            const value = context.raw;
                            const hours = Math.floor(value / 60);
                            const mins = value % 60;
                            return `下班时间: ${hours}:${mins.toString().padStart(2, '0')}`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * 更新下班时间趋势图表
 * @param {Array} records - 记录数组
 */
function updateTrendChart(records) {
    createTrendChart(records);
}

/**
 * 更新统计数据
 * @param {Array} records - 记录数组
 */
async function updateStats(records) {
    try {
        // 从服务器获取设置
        const settings = await apiGetSettings();
        const targetTime = settings.targetTime || '18:00';
        
        // 计算平均下班时间
        const avgTime = calculateAverageTime(records.map(r => r.time));
        document.getElementById('avg-time').textContent = avgTime;
        
        // 获取选择的时间范围
        const timeRange = document.getElementById('time-range').value;
        
        // 计算上一时间段的记录
        let prevPeriodRecords = [];
        
        if (timeRange === '7') {
            // 上一个7天
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const fourteenDaysAgo = new Date();
            fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
            
            prevPeriodRecords = records.filter(record => {
                const recordDate = new Date(record.date);
                return recordDate >= fourteenDaysAgo && recordDate < sevenDaysAgo;
            });
        } else if (timeRange === '30') {
            // 上一个30天
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const sixtyDaysAgo = new Date();
            sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
            
            prevPeriodRecords = records.filter(record => {
                const recordDate = new Date(record.date);
                return recordDate >= sixtyDaysAgo && recordDate < thirtyDaysAgo;
            });
        } else if (timeRange === '90') {
            // 上一个90天
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            const oneEightyDaysAgo = new Date();
            oneEightyDaysAgo.setDate(oneEightyDaysAgo.getDate() - 180);
            
            prevPeriodRecords = records.filter(record => {
                const recordDate = new Date(record.date);
                return recordDate >= oneEightyDaysAgo && recordDate < ninetyDaysAgo;
            });
        }
        
        // 计算上一时间段的平均下班时间
        const prevAvgTime = calculateAverageTime(prevPeriodRecords.map(r => r.time));
        
        // 计算平均下班时间的变化
        if (prevPeriodRecords.length > 0) {
            const timeDiff = calculateTimeDifference(avgTime, prevAvgTime);
            const avgTimeDiffElem = document.getElementById('avg-time-diff');
            
            if (timeDiff > 0) {
                avgTimeDiffElem.innerHTML = `<span style="color: #e74c3c;"><i class="fas fa-arrow-up"></i> 晚了${Math.floor(timeDiff / 60)}小时${timeDiff % 60}分钟</span>`;
            } else if (timeDiff < 0) {
                const absDiff = Math.abs(timeDiff);
                avgTimeDiffElem.innerHTML = `<span style="color: #2ecc71;"><i class="fas fa-arrow-down"></i> 提前了${Math.floor(absDiff / 60)}小时${absDiff % 60}分钟</span>`;
            } else {
                avgTimeDiffElem.innerHTML = `<span>与上期持平</span>`;
            }
        } else {
            document.getElementById('avg-time-diff').innerHTML = '-';
        }
        
        // 计算最早和最晚下班时间
        let earliestTime = '23:59';
        let latestTime = '00:00';
        let earliestDate = '';
        let latestDate = '';
        
        records.forEach(record => {
            if (isTimeEarlierOrEqual(record.time, earliestTime)) {
                earliestTime = record.time;
                earliestDate = record.date;
            }
            
            if (!isTimeEarlierOrEqual(record.time, latestTime)) {
                latestTime = record.time;
                latestDate = record.date;
            }
        });
        
        // 格式化日期显示
        const formatEarliestDate = earliestDate ? ` (${new Date(earliestDate).getMonth() + 1}月${new Date(earliestDate).getDate()}日)` : '';
        const formatLatestDate = latestDate ? ` (${new Date(latestDate).getMonth() + 1}月${new Date(latestDate).getDate()}日)` : '';
        
        // 更新最早下班时间
        document.getElementById('earliest-time').textContent = earliestTime + formatEarliestDate;
        
        // 更新最晚下班时间
        document.getElementById('latest-time').textContent = latestTime + formatLatestDate;
        
        // 计算准时下班率
        const ontimeCount = records.filter(record => {
            return isTimeEarlierOrEqual(record.time, targetTime);
        }).length;
        
        const ontimeRate = records.length > 0 ? (ontimeCount / records.length * 100).toFixed(1) : 0;
        document.getElementById('ontime-days').textContent = `${ontimeCount}天 (${ontimeRate}%)`;
        
        // 计算上一时间段的准时下班天数
        const prevOntimeCount = prevPeriodRecords.filter(record => {
            return isTimeEarlierOrEqual(record.time, targetTime);
        }).length;
        
        // 计算准时下班天数的变化
        const ontimeDaysDiff = ontimeCount - prevOntimeCount;
        const ontimeDaysDiffElem = document.getElementById('ontime-days-diff');
        
        if (prevPeriodRecords.length > 0) {
            if (ontimeDaysDiff > 0) {
                ontimeDaysDiffElem.innerHTML = `<span style="color: #2ecc71;"><i class="fas fa-arrow-up"></i> 增加了${ontimeDaysDiff}天</span>`;
            } else if (ontimeDaysDiff < 0) {
                ontimeDaysDiffElem.innerHTML = `<span style="color: #e74c3c;"><i class="fas fa-arrow-down"></i> 减少了${Math.abs(ontimeDaysDiff)}天</span>`;
            } else {
                ontimeDaysDiffElem.innerHTML = `<span>与上期持平</span>`;
            }
        } else {
            ontimeDaysDiffElem.innerHTML = '-';
        }
        
        // 计算加班时长总计
        let totalOvertimeMinutes = 0;
        records.forEach(record => {
            if (!isTimeEarlierOrEqual(record.time, targetTime)) {
                const timeDiff = calculateTimeDifference(record.time, targetTime);
                totalOvertimeMinutes += timeDiff;
            }
        });
        
        // 转换为小时和分钟
        const overtimeHours = Math.floor(totalOvertimeMinutes / 60);
        const overtimeMinutes = totalOvertimeMinutes % 60;
        document.getElementById('overtime-total').textContent = `${overtimeHours}小时${overtimeMinutes}分钟`;
        
        // 计算上一时间段的加班时长总计
        let prevTotalOvertimeMinutes = 0;
        prevPeriodRecords.forEach(record => {
            if (!isTimeEarlierOrEqual(record.time, targetTime)) {
                const timeDiff = calculateTimeDifference(record.time, targetTime);
                prevTotalOvertimeMinutes += timeDiff;
            }
        });
        
        // 计算加班时长的变化
        const overtimeDiff = totalOvertimeMinutes - prevTotalOvertimeMinutes;
        const overtimeDiffElem = document.getElementById('overtime-diff');
        
        if (prevPeriodRecords.length > 0) {
            if (overtimeDiff > 0) {
                const diffHours = Math.floor(overtimeDiff / 60);
                const diffMinutes = overtimeDiff % 60;
                overtimeDiffElem.innerHTML = `<span style="color: #e74c3c;"><i class="fas fa-arrow-up"></i> 增加了${diffHours}小时${diffMinutes}分钟</span>`;
            } else if (overtimeDiff < 0) {
                const absDiff = Math.abs(overtimeDiff);
                const diffHours = Math.floor(absDiff / 60);
                const diffMinutes = absDiff % 60;
                overtimeDiffElem.innerHTML = `<span style="color: #2ecc71;"><i class="fas fa-arrow-down"></i> 减少了${diffHours}小时${diffMinutes}分钟</span>`;
            } else {
                overtimeDiffElem.innerHTML = `<span>与上期持平</span>`;
            }
        } else {
            overtimeDiffElem.innerHTML = '-';
        }
    } catch (error) {
        console.error('更新统计数据时出错:', error);
    }
}

/**
 * 导出CSV
 */
async function exportCSV() {
    try {
        // 从服务器获取记录
        const records = await apiGetRecords();
        
        if (records.length === 0) {
            alert('暂无数据可导出');
            return;
        }
        
        // 获取选择的时间范围
        const timeRange = document.getElementById('time-range').value;
        
        // 根据时间范围过滤记录
        const filteredRecords = filterRecordsByTimeRange(records, timeRange);
        
        // 创建CSV内容
        let csvContent = '日期,下班时间,备注\n';
        
        // 按日期排序
        filteredRecords.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // 添加记录
        filteredRecords.forEach(record => {
            const date = record.date;
            const time = record.time;
            const note = record.note ? `"${record.note.replace(/"/g, '""')}"` : '';
            csvContent += `${date},${time},${note}\n`;
        });
        
        // 创建Blob对象
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        
        // 创建下载链接
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `下班时间统计_${timeRange}_${formatDate(new Date())}.csv`;
        
        // 触发下载
        document.body.appendChild(a);
        a.click();
        
        // 清理
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);
    } catch (error) {
        console.error('导出CSV时出错:', error);
        alert('导出CSV失败: ' + error.message);
    }
}

/**
 * 根据时间范围过滤记录
 * @param {Array} records - 记录数组
 * @param {string} timeRange - 时间范围
 * @returns {Array} 过滤后的记录数组
 */
function filterRecordsByTimeRange(records, timeRange) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentWeek = getWeekNumber(now);
    
    switch (timeRange) {
        case 'week':
            // 本周
            return records.filter(record => {
                const recordDate = new Date(record.date);
                return getWeekNumber(recordDate) === currentWeek && recordDate.getFullYear() === currentYear;
            });
        case 'month':
            // 本月
            return records.filter(record => {
                const recordDate = new Date(record.date);
                return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
            });
        case 'quarter':
            // 本季度
            const currentQuarter = Math.floor(currentMonth / 3);
            return records.filter(record => {
                const recordDate = new Date(record.date);
                return Math.floor(recordDate.getMonth() / 3) === currentQuarter && recordDate.getFullYear() === currentYear;
            });
        case 'year':
            // 本年
            return records.filter(record => {
                const recordDate = new Date(record.date);
                return recordDate.getFullYear() === currentYear;
            });
        case 'all':
        default:
            // 全部
            return records;
    }
}
