import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const SETTINGS_FILE_PATH = path.join(process.cwd(), 'shared_settings.json');

// Memory cache + File storage for shared server settings
function loadSharedSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE_PATH)) {
      const content = fs.readFileSync(SETTINGS_FILE_PATH, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Failed to read shared_settings.json:', err);
  }
  return {
    webAppUrl: '',
    bankBranchName: 'NGÂN HÀNG TMCP VIETINBANK-CN NINH BÌNH',
    managerEmail: '',
    adminPassword: 'admin123',
    autoSync: true,
  };
}

function saveSharedSettings(newSettings: any) {
  try {
    const current = loadSharedSettings();
    const updated = { ...current, ...newSettings };
    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(updated, null, 2), 'utf-8');
    return updated;
  } catch (err) {
    console.error('Failed to write shared_settings.json:', err);
    return newSettings;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Get Shared Settings
  app.get('/api/settings', (req, res) => {
    const settings = loadSharedSettings();
    res.json({ status: 'success', settings });
  });

  // API Route: Update Shared Settings
  app.post('/api/settings', (req, res) => {
    const { settings } = req.body;
    if (!settings) {
      return res.status(400).json({ status: 'error', message: 'Thiếu thông tin cài đặt' });
    }
    const updated = saveSharedSettings(settings);
    res.json({ status: 'success', settings: updated });
  });

  // API Route: Forward request to Google Apps Script Web App
  app.post('/api/sheets/proxy', async (req, res) => {
    try {
      let { webAppUrl, payload } = req.body;
      
      // Auto-fallback to server shared settings if client webAppUrl is empty
      if (!webAppUrl || !webAppUrl.trim()) {
        const shared = loadSharedSettings();
        webAppUrl = shared.webAppUrl;
      }

      if (!webAppUrl || !webAppUrl.trim()) {
        return res.status(400).json({ 
          status: 'error', 
          message: 'Chưa cấu hình Google Apps Script Web App URL trên máy tính hoặc máy chủ.' 
        });
      }

      const targetUrl = webAppUrl.trim();

      if (targetUrl.includes('/macros/library/') || targetUrl.includes('/edit')) {
        return res.status(400).json({
          status: 'error',
          message: 'URL không đúng định dạng Web App! Bạn đang dùng link Library hoặc link Chỉnh sửa. Vui lòng bấm "Triển khai (Deploy)" -> "Ứng dụng Web" trong Apps Script và copy link dạng https://script.google.com/macros/s/.../exec'
        });
      }

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      if (text.trim().toLowerCase().startsWith('<!doctype') || text.trim().startsWith('<')) {
        return res.status(400).json({
          status: 'error',
          message: 'Google Apps Script trả về trang HTML thay vì JSON. Vui lòng kiểm tra lại URL Web App (phải đuôi /exec) và cài đặt "Người có quyền truy cập: Bất kỳ ai (Anyone)".'
        });
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { status: 'success', raw: text };
      }

      return res.json(data);
    } catch (err: any) {
      console.error('Error proxying to Google Apps Script:', err);
      return res.status(500).json({
        status: 'error',
        message: 'Lỗi kết nối tới Google Apps Script: ' + (err.message || 'Unknown error'),
      });
    }
  });

  // API Route: Fetch data from Google Apps Script Web App
  app.get('/api/sheets/proxy', async (req, res) => {
    try {
      let webAppUrl = req.query.webAppUrl as string;

      // Auto-fallback to server shared settings if client webAppUrl is empty
      if (!webAppUrl || !webAppUrl.trim()) {
        const shared = loadSharedSettings();
        webAppUrl = shared.webAppUrl;
      }

      if (!webAppUrl || !webAppUrl.trim()) {
        return res.status(400).json({ 
          status: 'error', 
          message: 'Chưa cung cấp Google Apps Script Web App URL.' 
        });
      }

      const urlTrimmed = webAppUrl.trim();

      if (urlTrimmed.includes('/macros/library/') || urlTrimmed.includes('/edit')) {
        return res.status(400).json({
          status: 'error',
          message: 'URL không đúng định dạng Web App! Bạn đang dùng link Library hoặc link Chỉnh sửa. Vui lòng bấm "Triển khai (Deploy)" -> "Ứng dụng Web" trong Apps Script và copy link dạng https://script.google.com/macros/s/.../exec'
        });
      }

      let targetUrl;
      try {
        targetUrl = new URL(urlTrimmed);
      } catch (e) {
        return res.status(400).json({
          status: 'error',
          message: 'Đường link Google Apps Script URL không hợp lệ.'
        });
      }

      targetUrl.searchParams.append('action', 'getAll');

      const response = await fetch(targetUrl.toString());
      const text = await response.text();

      if (text.trim().toLowerCase().startsWith('<!doctype') || text.trim().startsWith('<')) {
        return res.status(400).json({
          status: 'error',
          message: 'Google Apps Script trả về trang HTML (Unexpected token <). Vui lòng kiểm tra: 1) Đã ấn "Triển khai (Deploy)" -> "Ứng dụng Web" chưa; 2) Đã chọn "Người có quyền truy cập: Bất kỳ ai (Anyone)" chưa.'
        });
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        return res.status(500).json({
          status: 'error',
          message: 'Dữ liệu trả về từ Google Apps Script không đúng định dạng JSON.'
        });
      }

      return res.json(data);
    } catch (err: any) {
      console.error('Error fetching from Google Apps Script:', err);
      return res.status(500).json({
        status: 'error',
        message: 'Không thể tải dữ liệu từ Google Sheets: ' + (err.message || 'Unknown error'),
      });
    }
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Vite development middleware or static production serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
