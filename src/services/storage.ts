import { AppSettings, ProcurementRequest, RepairRequest } from '../types';
import { SAMPLE_PROCUREMENT_REQUESTS, SAMPLE_REPAIR_REQUESTS } from '../constants/data';

const REPAIR_STORAGE_KEY = 'vtb_asset_repair_requests_v1';
const PROCUREMENT_STORAGE_KEY = 'vtb_asset_procurement_requests_v1';
const SETTINGS_STORAGE_KEY = 'vtb_asset_app_settings_v1';

export const getAppSettings = (): AppSettings => {
  const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return {
        adminPassword: 'admin123',
        ...parsed,
      };
    } catch (e) {
      console.error('Failed to parse app settings', e);
    }
  }
  return {
    webAppUrl: '',
    autoSync: true,
    bankBranchName: 'NGÂN HÀNG TMCP VIETINBANK-CN NINH BÌNH',
    managerEmail: '',
    adminPassword: 'admin123',
  };
};

export const saveAppSettings = (settings: AppSettings): void => {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));

  // Sync to backend server so mobile phones and all devices get connected automatically
  fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings }),
  }).catch((err) => console.warn('Could not sync settings to server', err));
};

/**
 * Fetch global shared settings from server backend (enables mobile phones to get configured automatically)
 */
export const fetchServerSettings = async (): Promise<AppSettings | null> => {
  try {
    const res = await fetch('/api/settings');
    if (res.ok) {
      const data = await res.json();
      if (data && data.settings) {
        const serverSettings = data.settings;
        const currentLocal = getAppSettings();

        // Merge server settings
        const merged: AppSettings = {
          ...currentLocal,
          ...serverSettings,
          webAppUrl: serverSettings.webAppUrl || currentLocal.webAppUrl,
          managerEmail: serverSettings.managerEmail || currentLocal.managerEmail,
        };
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
        return merged;
      }
    }
  } catch (err) {
    console.warn('Could not fetch server settings', err);
  }
  return null;
};

/**
 * Check URL query string for pre-configured Apps Script URL (e.g., ?webAppUrl=... or ?scriptUrl=...)
 */
export const checkAndApplyUrlConfig = (): AppSettings => {
  const current = getAppSettings();
  if (typeof window === 'undefined') return current;

  const urlParams = new URLSearchParams(window.location.search);
  const paramUrl = urlParams.get('webAppUrl') || urlParams.get('scriptUrl') || urlParams.get('url');
  const paramEmail = urlParams.get('managerEmail') || urlParams.get('email');

  if (paramUrl || paramEmail) {
    const updated: AppSettings = {
      ...current,
      webAppUrl: paramUrl ? paramUrl.trim() : current.webAppUrl,
      managerEmail: paramEmail ? paramEmail.trim() : current.managerEmail,
    };
    saveAppSettings(updated);
    return updated;
  }

  return current;
};

export const getRepairRequests = (): RepairRequest[] => {
  const saved = localStorage.getItem(REPAIR_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load repair requests', e);
    }
  }
  // Initialize with sample data if empty
  localStorage.setItem(REPAIR_STORAGE_KEY, JSON.stringify(SAMPLE_REPAIR_REQUESTS));
  return SAMPLE_REPAIR_REQUESTS;
};

export const saveRepairRequests = (requests: RepairRequest[]): void => {
  localStorage.setItem(REPAIR_STORAGE_KEY, JSON.stringify(requests));
};

export const getProcurementRequests = (): ProcurementRequest[] => {
  const saved = localStorage.getItem(PROCUREMENT_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load procurement requests', e);
    }
  }
  // Initialize with sample data if empty
  localStorage.setItem(PROCUREMENT_STORAGE_KEY, JSON.stringify(SAMPLE_PROCUREMENT_REQUESTS));
  return SAMPLE_PROCUREMENT_REQUESTS;
};

export const saveProcurementRequests = (requests: ProcurementRequest[]): void => {
  localStorage.setItem(PROCUREMENT_STORAGE_KEY, JSON.stringify(requests));
};

/**
 * Generate Next Proposal ID for Repair: SC-YYYY-0001
 */
export const generateNextRepairId = (requests: RepairRequest[]): string => {
  const year = new Date().getFullYear();
  const prefix = `SC-${year}-`;
  
  let maxNum = 0;
  requests.forEach(r => {
    if (r.id && r.id.startsWith(prefix)) {
      const numPart = parseInt(r.id.replace(prefix, ''), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  });

  const nextNum = (maxNum + 1).toString().padStart(4, '0');
  return `${prefix}${nextNum}`;
};

/**
 * Generate Next Proposal ID for Procurement: MS-YYYY-0001
 */
export const generateNextProcurementId = (requests: ProcurementRequest[]): string => {
  const year = new Date().getFullYear();
  const prefix = `MS-${year}-`;
  
  let maxNum = 0;
  requests.forEach(r => {
    if (r.id && r.id.startsWith(prefix)) {
      const numPart = parseInt(r.id.replace(prefix, ''), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  });

  const nextNum = (maxNum + 1).toString().padStart(4, '0');
  return `${prefix}${nextNum}`;
};

export const resetDataToSample = (): void => {
  localStorage.setItem(REPAIR_STORAGE_KEY, JSON.stringify(SAMPLE_REPAIR_REQUESTS));
  localStorage.setItem(PROCUREMENT_STORAGE_KEY, JSON.stringify(SAMPLE_PROCUREMENT_REQUESTS));
};
