import { AppSettings, ProcurementRequest, RepairRequest, RequestStatus } from '../types';

export interface SyncResult {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * Submit repair request to Google Sheets via Express proxy or direct
 */
export async function syncRepairToGoogleSheets(
  request: RepairRequest,
  settings: AppSettings
): Promise<SyncResult> {
  if (!settings.webAppUrl) {
    return {
      success: false,
      message: 'Chưa cấu hình Google Apps Script Web App URL. Dữ liệu đã được lưu tạm ở trình duyệt.',
    };
  }

  try {
    const res = await fetch('/api/sheets/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webAppUrl: settings.webAppUrl,
        payload: {
          action: 'createRepair',
          data: request,
        },
      }),
    });

    const result = await res.json();
    if (result.status === 'success') {
      return { success: true, message: 'Đã lưu thành công vào Google Sheets!' };
    } else {
      return { success: false, message: result.message || 'Không thể ghi vào Google Sheets.' };
    }
  } catch (err: any) {
    return {
      success: false,
      message: 'Lỗi kết nối API: ' + (err.message || 'Không thể gửi dữ liệu.'),
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
  if (!settings.webAppUrl) {
    return {
      success: false,
      message: 'Chưa cấu hình Google Apps Script Web App URL. Dữ liệu đã được lưu tạm ở trình duyệt.',
    };
  }

  try {
    const res = await fetch('/api/sheets/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webAppUrl: settings.webAppUrl,
        payload: {
          action: 'createProcurement',
          data: request,
        },
      }),
    });

    const result = await res.json();
    if (result.status === 'success') {
      return { success: true, message: 'Đã lưu thành công vào Google Sheets!' };
    } else {
      return { success: false, message: result.message || 'Không thể ghi vào Google Sheets.' };
    }
  } catch (err: any) {
    return {
      success: false,
      message: 'Lỗi kết nối API: ' + (err.message || 'Không thể gửi dữ liệu.'),
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
  if (!settings?.webAppUrl) {
    return { success: false, message: 'Chưa cấu hình Web App URL.' };
  }

  try {
    const res = await fetch('/api/sheets/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webAppUrl: settings.webAppUrl,
        payload: {
          action: 'updateStatus',
          type,
          data: { id, status, handler, completionDate, note },
        },
      }),
    });

    const result = await res.json();
    if (result.status === 'success') {
      return { success: true, message: 'Đã cập nhật trạng thái trên Google Sheets!' };
    } else {
      return { success: false, message: result.message || 'Cập nhật thất bại.' };
    }
  } catch (err: any) {
    return { success: false, message: 'Lỗi cập nhật API: ' + err.message };
  }
}

/**
 * Fetch all sheets data
 */
export async function fetchAllFromGoogleSheets(settings: AppSettings): Promise<SyncResult> {
  if (!settings.webAppUrl) {
    return { success: false, message: 'Chưa cấu hình Web App URL.' };
  }

  try {
    const url = `/api/sheets/proxy?webAppUrl=${encodeURIComponent(settings.webAppUrl)}`;
    const res = await fetch(url);
    const result = await res.json();

    if (result.status === 'success') {
      return {
        success: true,
        message: 'Tải dữ liệu từ Google Sheets thành công!',
        data: result,
      };
    } else {
      return { success: false, message: result.message || 'Không tải được dữ liệu.' };
    }
  } catch (err: any) {
    return { success: false, message: 'Lỗi tải dữ liệu: ' + err.message };
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
    const url = `/api/sheets/proxy?webAppUrl=${encodeURIComponent(urlTrimmed)}`;
    const res = await fetch(url);
    const result = await res.json();
    if (result.status === 'success' || result.status === 'ok') {
      return { success: true, message: 'Kết nối thành công tới Google Apps Script Web App!' };
    } else {
      return { success: false, message: result.message || 'Kết nối thất bại. Vui lòng kiểm tra lại quyền truy cập (Anyone).' };
    }
  } catch (err: any) {
    return { success: false, message: 'Không thể kết nối URL: ' + err.message };
  }
}
