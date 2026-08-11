import React, { useState, useEffect } from 'react';
import { ActiveTab, AppSettings, ProcurementRequest, RepairRequest } from './types';
import {
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
import { Toast } from './components/Toast';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [settings, setSettings] = useState<AppSettings>(getAppSettings);

  const [repairRequests, setRepairRequests] = useState<RepairRequest[]>([]);
  const [procurementRequests, setProcurementRequests] = useState<ProcurementRequest[]>([]);

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

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveAppSettings(newSettings);
  };

  const handleResetData = () => {
    setRepairRequests(getRepairRequests());
    setProcurementRequests(getProcurementRequests());
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
        onOpenSettings={() => setShowSettingsModal(true)}
        repairCount={repairRequests.filter((r) => r.status === 'Đề xuất').length}
        procurementCount={procurementRequests.filter((p) => p.status === 'Đề xuất').length}
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
            <div className="font-bold text-white text-sm">
              HỆ THỐNG ĐĂNG KÝ SỬA CHỮA & MUA SẮM TÀI SẢN NGÂN HÀNG
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
              onClick={() => setShowSettingsModal(true)}
              className="hover:text-white transition-colors underline"
            >
              Cài đặt URL
            </button>
          </div>
        </div>
      </footer>

      {/* Modals & Toast */}
      {showSettingsModal && (
        <SettingsModal
          settings={settings}
          onSaveSettings={handleUpdateSettings}
          onResetData={handleResetData}
          onClose={() => setShowSettingsModal(false)}
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
