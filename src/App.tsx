import React, { useState, useEffect } from 'react';
import { ActiveTab, AppSettings, ProcurementRequest, RepairRequest } from './types';
import {
  checkAndApplyUrlConfig,
  fetchServerSettings,
  getAppSettings,
  getProcurementRequests,
  getRepairRequests,
  saveAppSettings,
} from './services/storage';
import { Header } from './components/Header';
import { HomeScreen } from './components/HomeScreen';
import { RepairForm } from './components/RepairForm';
import { ProcurementForm } from './components/ProcurementForm';
import { AdminDashboard } from './components/AdminDashboard';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { SettingsModal } from './components/SettingsModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { Toast } from './components/Toast';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [settings, setSettings] = useState<AppSettings>(getAppSettings);

  const [repairRequests, setRepairRequests] = useState<RepairRequest[]>([]);
  const [procurementRequests, setProcurementRequests] = useState<ProcurementRequest[]>([]);

  // Authentication & Admin State
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);
  const [showAdminLoginModal, setShowAdminLoginModal] = useState<boolean>(false);

  // Modals
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);

  // Toast
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  useEffect(() => {
    setRepairRequests(getRepairRequests());
    setProcurementRequests(getProcurementRequests());

    // 1. Check if URL contains query parameters (e.g., ?webAppUrl=...)
    const urlConfig = checkAndApplyUrlConfig();
    if (urlConfig.webAppUrl) {
      setSettings(urlConfig);
    }

    // 2. Automatically fetch shared server configuration (allows mobile phones to auto-connect)
    fetchServerSettings().then((serverSettings) => {
      if (serverSettings) {
        setSettings(serverSettings);
      }
    });
  }, []);

  const showToastHandler = (
    message: string,
    type: 'success' | 'error' | 'info' = 'success'
  ) => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const handleUpdateSettings = async (newSettings: AppSettings) => {
    const saved = await saveAppSettings(newSettings);
    setSettings(saved);
  };

  const handleResetData = () => {
    setRepairRequests(getRepairRequests());
    setProcurementRequests(getProcurementRequests());
  };

  const handleOpenSettings = () => {
    if (isAdminLoggedIn) {
      setShowSettingsModal(true);
    } else {
      setShowAdminLoginModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col antialiased selection:bg-blue-900 selection:text-white">
      {/* Top Banking Navbar */}
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'guide') {
            setShowGuideModal(true);
          } else {
            setActiveTab(tab);
          }
        }}
        settings={settings}
        onOpenSettings={handleOpenSettings}
        repairCount={repairRequests.filter((r) => r.status === 'Đề xuất').length}
        procurementCount={procurementRequests.filter((p) => p.status === 'Đề xuất').length}
        isAdminLoggedIn={isAdminLoggedIn}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'home' && (
          <HomeScreen
            setActiveTab={setActiveTab}
            repairRequests={repairRequests}
            procurementRequests={procurementRequests}
            onOpenGuide={() => setShowGuideModal(true)}
          />
        )}

        {activeTab === 'repair' && (
          <RepairForm
            repairRequests={repairRequests}
            setRepairRequests={setRepairRequests}
            settings={settings}
            onBack={() => setActiveTab('home')}
            showToast={showToastHandler}
          />
        )}

        {activeTab === 'procurement' && (
          <ProcurementForm
            procurementRequests={procurementRequests}
            setProcurementRequests={setProcurementRequests}
            settings={settings}
            onBack={() => setActiveTab('home')}
            showToast={showToastHandler}
          />
        )}

        {activeTab === 'admin' && (
          <AdminDashboard
            repairRequests={repairRequests}
            setRepairRequests={setRepairRequests}
            procurementRequests={procurementRequests}
            setProcurementRequests={setProcurementRequests}
            settings={settings}
            showToast={showToastHandler}
            onOpenGuide={() => setShowGuideModal(true)}
          />
        )}
      </main>

      {/* System Footer */}
      <footer className="bg-[#001845] text-blue-200 text-xs border-t border-blue-900 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <div className="font-bold text-white text-sm uppercase tracking-wide">
              Ứng dụng đăng ký sửa chữa và mua sắm tại CN Vietinbank Ninh Bình
            </div>
            <div className="text-blue-300 text-[11px] mt-0.5">
              Tự động hóa đăng ký, phân công xử lý & lưu trữ dữ liệu trung tâm Google Sheets
            </div>
          </div>

          <div className="flex items-center space-x-4 text-[11px] text-blue-300">
            <button
              onClick={() => setShowGuideModal(true)}
              className="hover:text-amber-300 transition-colors underline"
            >
              Mã Code.gs Apps Script
            </button>
            <span>•</span>
            <button
              onClick={handleOpenSettings}
              className="hover:text-white transition-colors underline flex items-center space-x-1"
            >
              <span>Cài đặt hệ thống</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Modals & Toast */}
      {showAdminLoginModal && (
        <AdminLoginModal
          currentPassword={settings.adminPassword}
          onSuccess={() => {
            setIsAdminLoggedIn(true);
            setShowAdminLoginModal(false);
            setShowSettingsModal(true);
          }}
          onClose={() => setShowAdminLoginModal(false)}
          showToast={showToastHandler}
        />
      )}

      {showSettingsModal && (
        <SettingsModal
          settings={settings}
          onSaveSettings={handleUpdateSettings}
          onResetData={handleResetData}
          onClose={() => setShowSettingsModal(false)}
          onLogoutAdmin={() => setIsAdminLoggedIn(false)}
          showToast={showToastHandler}
        />
      )}

      {showGuideModal && (
        <GoogleSheetsModal
          settings={settings}
          onSaveSettings={handleUpdateSettings}
          onClose={() => setShowGuideModal(false)}
          showToast={showToastHandler}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
