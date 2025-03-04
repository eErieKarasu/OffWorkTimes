/**
 * 下班时间统计 - 设置页面JavaScript
 */

// DOM元素加载完成后执行
document.addEventListener('DOMContentLoaded', async function() {
    // 加载设置
    await loadSettings();
    
    // 工作日设置按钮
    document.getElementById('workdays-btn').addEventListener('click', function() {
        const workdaysSettings = document.getElementById('workdays-settings');
        if (workdaysSettings.style.display === 'none') {
            workdaysSettings.style.display = 'block';
            this.textContent = '收起';
        } else {
            workdaysSettings.style.display = 'none';
            this.textContent = '自定义';
        }
    });
    
    // 导出数据按钮
    document.getElementById('export-btn').addEventListener('click', exportData);
    
    // 保存设置表单提交
    document.getElementById('settings-form').addEventListener('submit', function(e) {
        e.preventDefault();
        saveSettings();
    });
    
    // 取消按钮
    document.getElementById('cancel-btn').addEventListener('click', function() {
        window.location.href = 'dashboard.html';
    });
});

/**
 * 加载设置
 */
async function loadSettings() {
    try {
        // 从服务器获取设置
        const settings = await apiGetSettings();
        
        // 设置目标下班时间
        if (settings.targetTime) {
            document.getElementById('target-time').value = settings.targetTime;
        }
        
        // 设置工作日
        if (settings.workdays) {
            const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            weekdays.forEach((day, index) => {
                const checkbox = document.getElementById(day);
                if (checkbox) {
                    checkbox.checked = settings.workdays[index] !== false;
                }
            });
        }
    } catch (error) {
        console.error('加载设置时出错:', error);
        alert('加载设置失败: ' + error.message);
    }
}

/**
 * 保存设置
 */
async function saveSettings() {
    try {
        // 获取目标下班时间
        const targetTime = document.getElementById('target-time').value;
        
        // 获取工作日设置
        const workdays = [];
        const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        weekdays.forEach((day) => {
            const checkbox = document.getElementById(day);
            if (checkbox) {
                workdays.push(checkbox.checked);
            } else {
                workdays.push(false);
            }
        });
        
        // 创建设置对象
        const settings = {
            targetTime,
            workdays
        };
        
        // 保存到服务器
        const success = await apiSaveSettings(settings);
        
        if (success) {
            alert('设置已保存');
            window.location.href = 'dashboard.html';
        } else {
            alert('保存设置失败，请重试');
        }
    } catch (error) {
        console.error('保存设置时出错:', error);
        alert('保存设置失败: ' + error.message);
    }
}

/**
 * 导出数据
 */
async function exportData() {
    try {
        // 从服务器获取记录和设置
        const records = await apiGetRecords();
        const settings = await apiGetSettings();
        
        // 创建导出数据对象
        const exportData = {
            records,
            settings,
            exportDate: new Date().toISOString()
        };
        
        // 转换为JSON字符串
        const jsonStr = JSON.stringify(exportData, null, 2);
        
        // 创建Blob对象
        const blob = new Blob([jsonStr], { type: 'application/json' });
        
        // 创建下载链接
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `下班时间统计数据_${formatDate(new Date())}.json`;
        
        // 触发下载
        document.body.appendChild(a);
        a.click();
        
        // 清理
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);
    } catch (error) {
        console.error('导出数据时出错:', error);
        alert('导出数据失败: ' + error.message);
    }
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
