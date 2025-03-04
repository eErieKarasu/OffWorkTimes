const API_URL = 'http://localhost:3000/api';

/**
 * 获取所有下班记录
 * @returns {Promise<Array>} 记录数组
 */
async function apiGetRecords() {
    try {
        const response = await fetch(`${API_URL}/records`);
        if (!response.ok) {
            throw new Error('获取记录失败');
        }
        return await response.json();
    } catch (error) {
        console.error('获取记录错误:', error);
        return [];
    }
}

/**
 * 保存所有下班记录
 * @param {Array} records 记录数组
 * @returns {Promise<boolean>} 是否保存成功
 */
async function apiSaveRecords(records) {
    try {
        const response = await fetch(`${API_URL}/records`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(records),
        });
        if (!response.ok) {
            throw new Error('保存记录失败');
        }
        return true;
    } catch (error) {
        console.error('保存记录错误:', error);
        return false;
    }
}

/**
 * 获取设置
 * @returns {Promise<Object>} 设置对象
 */
async function apiGetSettings() {
    try {
        const response = await fetch(`${API_URL}/settings`);
        if (!response.ok) {
            throw new Error('获取设置失败');
        }
        return await response.json();
    } catch (error) {
        console.error('获取设置错误:', error);
        return {};
    }
}

/**
 * 保存设置
 * @param {Object} settings 设置对象
 * @returns {Promise<boolean>} 是否保存成功
 */
async function apiSaveSettings(settings) {
    try {
        const response = await fetch(`${API_URL}/settings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(settings),
        });
        if (!response.ok) {
            throw new Error('保存设置失败');
        }
        return true;
    } catch (error) {
        console.error('保存设置错误:', error);
        return false;
    }
}
