/**
 * 下班时间统计 - 记录页面JavaScript
 */

// DOM元素加载完成后执行
document.addEventListener('DOMContentLoaded', async function() {
    // 初始化日期为今天
    const today = new Date();
    document.getElementById('date').value = formatDate(today);
    
    // 加载记录列表
    await loadRecords();
    
    // 表单提交事件
    document.getElementById('record-form').addEventListener('submit', function(e) {
        e.preventDefault();
        saveRecord();
    });
    
    // 取消按钮事件
    document.getElementById('cancel-btn').addEventListener('click', function() {
        window.location.href = 'dashboard.html';
    });
});

/**
 * 保存下班时间记录
 */
async function saveRecord() {
    // 获取表单数据
    const date = document.getElementById('date').value;
    const time = document.getElementById('time-input').value; // 直接获取时间
    const note = document.getElementById('note').value;
    
    // 验证数据
    if (!date) {
        alert('请选择日期');
        return;
    }
    
    if (!time) {
        alert('请输入下班时间');
        return;
    }
    
    try {
        // 从服务器获取现有记录
        const records = await apiGetRecords();
        
        // 检查是否已存在该日期的记录
        const existingIndex = records.findIndex(record => record.date === date);
        
        if (existingIndex !== -1) {
            // 更新现有记录
            records[existingIndex] = {
                date,
                time,
                note
            };
        } else {
            // 添加新记录
            records.push({
                date,
                time,
                note
            });
        }
        
        // 按日期排序
        records.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // 保存到服务器
        const success = await apiSaveRecords(records);
        
        if (success) {
            // 显示成功消息
            alert('下班时间记录已保存');
            
            // 重新加载记录列表
            await loadRecords();
            
            // 重置表单
            document.getElementById('note').value = '';
        } else {
            alert('保存记录失败，请重试');
        }
    } catch (error) {
        console.error('保存记录时出错:', error);
        alert('保存记录失败: ' + error.message);
    }
}

/**
 * 加载下班时间记录列表
 */
async function loadRecords() {
    try {
        const records = await apiGetRecords();
        const recordsList = document.getElementById('records-list');
        
        // 清空列表
        recordsList.innerHTML = '';
        
        // 只显示最近10条记录
        const recentRecords = records.slice(0, 10);
        
        if (recentRecords.length === 0) {
            recordsList.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">暂无记录</td></tr>';
            return;
        }
        
        // 添加记录到列表
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
            
            // 操作单元格
            const actionCell = document.createElement('td');
            actionCell.style.padding = '12px';
            actionCell.style.textAlign = 'center';
            actionCell.style.borderBottom = '1px solid #eee';
            
            // 编辑按钮
            const editBtn = document.createElement('button');
            editBtn.className = 'btn-icon';
            editBtn.innerHTML = '<i class="fas fa-edit"></i>';
            editBtn.title = '编辑';
            
            // 使用闭包保存当前记录的引用
            const recordCopy = {...record};
            editBtn.onclick = function() {
                console.log('编辑按钮被点击', recordCopy);
                editRecord(recordCopy);
            };
            
            // 删除按钮
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-icon';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.title = '删除';
            deleteBtn.style.marginLeft = '10px';
            deleteBtn.addEventListener('click', () => deleteRecord(record.date));
            
            actionCell.appendChild(editBtn);
            actionCell.appendChild(deleteBtn);
            
            // 添加所有单元格到行
            row.appendChild(dateCell);
            row.appendChild(timeCell);
            row.appendChild(noteCell);
            row.appendChild(actionCell);
            
            // 添加行到表格
            recordsList.appendChild(row);
        });
    } catch (error) {
        console.error('加载记录时出错:', error);
        alert('加载记录失败: ' + error.message);
    }
}

/**
 * 编辑下班时间记录
 * @param {Object} record - 记录对象
 */
function editRecord(record) {
    console.log('编辑记录:', record); // 添加日志以便调试
    
    // 填充表单
    document.getElementById('date').value = record.date;
    document.getElementById('time-input').value = record.time;
    document.getElementById('note').value = record.note || '';
    
    // 滚动到表单顶部
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
    
    // 聚焦到时间输入框
    setTimeout(() => {
        document.getElementById('time-input').focus();
    }, 500);
}

/**
 * 删除下班时间记录
 * @param {string} date - 记录日期
 */
async function deleteRecord(date) {
    if (!confirm('确定要删除这条记录吗？')) {
        return;
    }
    
    try {
        // 从服务器获取现有记录
        const records = await apiGetRecords();
        
        // 过滤掉要删除的记录
        const updatedRecords = records.filter(record => record.date !== date);
        
        // 保存到服务器
        const success = await apiSaveRecords(updatedRecords);
        
        if (success) {
            // 重新加载记录列表
            await loadRecords();
        } else {
            alert('删除记录失败，请重试');
        }
    } catch (error) {
        console.error('删除记录时出错:', error);
        alert('删除记录失败: ' + error.message);
    }
}
