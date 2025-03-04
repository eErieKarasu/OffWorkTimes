const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

// 中间件
app.use(cors());
app.use(bodyParser.json());

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// 添加调试中间件
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// 根路由 - 重定向到仪表盘
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// API 路由
// 获取记录
app.get('/api/records', (req, res) => {
    try {
        const recordsPath = path.join(DATA_DIR, 'offWorkRecords.json');
        if (!fs.existsSync(recordsPath)) {
            return res.json([]);
        }
        const records = JSON.parse(fs.readFileSync(recordsPath, 'utf8'));
        res.json(records);
    } catch (error) {
        console.error('获取记录失败:', error);
        res.status(500).json({ error: '获取记录失败' });
    }
});

// 保存记录
app.post('/api/records', (req, res) => {
    try {
        const records = req.body;
        const recordsPath = path.join(DATA_DIR, 'offWorkRecords.json');
        fs.writeFileSync(recordsPath, JSON.stringify(records, null, 2));
        res.json({ success: true });
    } catch (error) {
        console.error('保存记录失败:', error);
        res.status(500).json({ error: '保存记录失败' });
    }
});

// 获取设置
app.get('/api/settings', (req, res) => {
    try {
        const settingsPath = path.join(DATA_DIR, 'settings.json');
        if (!fs.existsSync(settingsPath)) {
            return res.json({});
        }
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        res.json(settings);
    } catch (error) {
        console.error('获取设置失败:', error);
        res.status(500).json({ error: '获取设置失败' });
    }
});

// 保存设置
app.post('/api/settings', (req, res) => {
    try {
        const settings = req.body;
        const settingsPath = path.join(DATA_DIR, 'settings.json');
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        res.json({ success: true });
    } catch (error) {
        console.error('保存设置失败:', error);
        res.status(500).json({ error: '保存设置失败' });
    }
});

// 处理HTML页面请求
app.get('/:page.html', (req, res) => {
    const pageName = req.params.page + '.html';
    const filePath = path.join(__dirname, 'public', pageName);
    
    console.log(`请求页面: ${pageName}, 文件路径: ${filePath}`);
    
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        console.log(`文件不存在: ${filePath}`);
        res.status(404).send('页面不存在');
    }
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log(`数据存储在 ${DATA_DIR}`);
});
