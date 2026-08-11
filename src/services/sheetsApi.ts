import { AppSettings, ProcurementRequest, RepairRequest, RequestStatus } from '../types';

export interface SyncResult {
  success: boolean;
  message: string;
  data?: any;
}

/**
  * Helper to safely parse JSON response or detect HTML/Vercel error pages
 */
function parseJsonResponse(text: string): { isJson: boolean; data?: any; errorMsg?: string } {
  const trimmed = text.trim();
  if (
    trimmed.toLowerCase().startsWith('<!doctype') ||
    trimmed.startsWith('<') ||
    trimmed.toLowerCase().includes('the page cannot') ||
    trimmed.toLowerCase().includes('404: page_not_found')
  ) {
    return {
      isJson: false,
      errorMsg:
        'Trang web trả về giao diện HTML thay vì dữ liệu JSON. Nguyên nhân: Link Google Apps Script bị sai (phải là /exec), hoặc chưa cấp quyền "Bất kỳ ai (Anyone)", hoặc server proxy trên Vercel chưa khả dụng.',
    };
  }

  try {
    const data = JSON.parse(trimmed);
    return { isJson: true, data };
  } catch (err: any) {
    return {
      isJson: false,
      errorMsg: 'Dữ liệu không phải cấu trúc JSON hợp lệ: ' + (err.message || 'Lỗi đọc dữ liệu'),
    };
  }
}

/**
 * Direct client-side fetch to Google Apps Script as fallback
 */
async function fetchDirectFromAppsScript(webAppUrl: string, action: 'GET' | 'POST', payload?: any): Promise<any> {
  let url = webAppUrl.trim();
  if (action === 'GET') {
    const targetUrl = new URL(url);
    targetUrl.searchParams.append('action', 'getAll');
    url = targetUrl.toString();
  }

  const options: RequestInit = {
    method: action,
    redirect: 'follow',
  };

  if (action === 'POST' && payload) {
    options.body = JSON.stringify(payload);
    options.headers = { 'Content-Type': 'text/plain' };
  }

  const response = await fetch(url, options);
  const text = await response.text();
  const parsed = parseJsonResponse(text);

  if (!parsed.isJson) {
    throw new Error(parsed.errorMsg);
  }

  return parsed.data;
}

/**
 * Execute request with server proxy, falling back to direct browser fetch if proxy is unavailable (e.g. static Vercel build)
 */
async function executeSheetsApiCall(webAppUrl: string, isPost: boolean, payload?: any): Promise<any> {
  const urlTrimmed = webAppUrl ? webAppUrl.trim() : '';

  if (urlTrimmed.includes('/macros/library/') || urlTrimmed.includes('/edit')) {
    throw new Error(
      'URL không đúng định dạng Web App! Vui lòng bấm "Triển khai (Deploy)" -> "Ứng dụng Web" trong Apps Script và copy link dạng https://script.google.com/macros/s/.../exec'
    );
  }

  // 1. Try server proxy endpoint first
  try {
    const proxyUrl = isPost
      ? '/api/sheets/proxy'
      : `/api/sheets/proxy?webAppUrl=${encodeURIComponent(urlTrimmed)}`;

    const proxyOptions: RequestInit = isPost
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ webAppUrl: urlTrimmed, payload }),
        }
      : { method: 'GET' };

    const res = await fetch(proxyUrl, proxyOptions);
    const text = await res.text();
    const parsed = parseJsonResponse(text);

    if (parsed.isJson && res.ok) {
      return parsed.data;
    }
  } catch (err) {
    console.warn('Proxy fetch failed, falling back to direct Google Apps Script request:', err);
  }

  // 2. Direct fallback for Vercel static host or direct browser client
  return await fetchDirectFromAppsScript(urlTrimmed, isPost ? 'POST' : 'GET', payload);
}

/**
 * Submit repair request to Google Sheets
 */
export async function syncRepairToGoogleSheets(
  request: RepairRequest,
  settings: AppSettings
): Promise<SyncResult> {
  const url = settings?.webAppUrl || '';
  try {
    const result = await executeSheetsApiCall(url, true, {
      action: 'createRepair',
      managerEmail: settings?.managerEmail || '',
      data: request,
    });

    if (result && (result.status === 'success' || result.status === 'ok')) {
      return { success: true, message: 'Đã lưu thành công vào Google Sheets!' };
    } else {
      return { success: false, message: result?.message || 'Không thể ghi vào Google Sheets.' };
    }
  } catch (err: any) {
    return {
      success: false,
      message: 'Lỗi kết nối: ' + (err.message || 'Không thể kết nối đến Google Sheets.'),
    };
  }
}

/**
 * Submit procurement request to Google Sheets
 */
export async function syncProcurementToGoogleSheets(
  request: ProcurementRequest,
  settings: AppSettings
): Promise<SyncResult> {
  const url = settings?.webAppUrl || '';
  try {
    const result = await executeSheetsApiCall(url, true, {
      action: 'createProcurement',
      managerEmail: settings?.managerEmail || '',
      data: request,
    });

    if (result && (result.status === 'success' || result.status === 'ok')) {
      return { success: true, message: 'Đã lưu thành công vào Google Sheets!' };
    } else {
      return { success: false, message: result?.message || 'Không thể ghi vào Google Sheets.' };
    }
  } catch (err: any) {
    return {
      success: false,
      message: 'Lỗi kết nối: ' + (err.message || 'Không thể kết nối đến Google Sheets.'),
    };
  }
}

/**
 * Update request status in Google Sheets
 */
export async function updateStatusInGoogleSheets(
  type: 'repair' | 'procurement',
  id: string,
  status: RequestStatus,
  handler?: string,
  completionDate?: string,
  note?: string,
  settings?: AppSettings
): Promise<SyncResult> {
  const url = settings?.webAppUrl || '';
  try {
    const result = await executeSheetsApiCall(url, true, {
      action: 'updateStatus',
      type,
      data: { id, status, handler, completionDate, note },
    });

    if (result && (result.status === 'success' || result.status === 'ok')) {
      return { success: true, message: 'Đã cập nhật trạng thái trên Google Sheets!' };
    } else {
      return { success: false, message: result?.message || 'Cập nhật thất bại.' };
    }
  } catch (err: any) {
    return { success: false, message: 'Lỗi cập nhật API: ' + (err.message || 'Lỗi không xác định') };
  }
}

/**
 * Fetch all sheets data
 */
export async function fetchAllFromGoogleSheets(settings: AppSettings): Promise<SyncResult> {
  const url = settings?.webAppUrl || '';
  try {
    const result = await executeSheetsApiCall(url, false);

    if (result && (result.status === 'success' || result.status === 'ok')) {
      return {
        success: true,
        message: 'Tải dữ liệu từ Google Sheets thành công!',
        data: result,
      };
    } else {
      return { success: false, message: result?.message || 'Không tải được dữ liệu.' };
    }
  } catch (err: any) {
    return { success: false, message: 'Lỗi tải dữ liệu: ' + (err.message || 'Lỗi không xác định') };
  }
}

/**
 * Test Web App URL connection
 */
export async function testGoogleAppsScriptConnection(webAppUrl: string): Promise<SyncResult> {
  const urlTrimmed = webAppUrl ? webAppUrl.trim() : '';

  if (!urlTrimmed || !urlTrimmed.startsWith('http')) {
    return {
      success: false,
      message: 'URL không hợp lệ. Vui lòng nhập link Google Apps Script Web App đầy đủ (https://script.google.com/macros/s/.../exec).',
    };
  }

  if (urlTrimmed.includes('/macros/library/') || urlTrimmed.includes('/edit')) {
    return {
      success: false,
      message: 'Lỗi URL: Link bạn vừa nhập là link Thư viện (Library) hoặc Trình biên tập script, không phải Web App! Vui lòng nhấn "Triển khai (Deploy)" -> "Ứng dụng Web (Web App)" và copy link dạng /exec.',
    };
  }

  try {
    const result = await executeSheetsApiCall(urlTrimmed, false);
    if (result && (result.status === 'success' || result.status === 'ok')) {
      return { success: true, message: 'Kết nối thành công tới Google Apps Script Web App!' };
    } else {
      return { success: false, message: result?.message || 'Kết nối thất bại. Vui lòng kiểm tra lại quyền truy cập (Anyone).' };
    }
  } catch (err: any) {
    return { success: false, message: 'Không thể kết nối URL: ' + (err.message || 'Không thể truy cập Google Sheets') };
  }
}

