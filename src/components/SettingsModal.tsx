import React, { useState } from 'react';
import { X, Settings, RotateCcw, Building2, Link2, Check, Shield } from 'lucide-react';
import { AppSettings } from '../types';
import { resetDataToSample } from '../services/storage';

interface SettingsModalProps {
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  onResetData: () => void;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onSaveSettings,
  onResetData,
  onClose,
  showToast,
}) => {
  const [bankBranchName, setBankBranchName] = useState<string>(
    settings.bankBranchName || 'NGÂN HÀNG TMCP VIETINBANK-CN NINH BÌNH'
  );
  const [webAppUrl, setWebAppUrl] = useState<string>(settings.webAppUrl || '');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      ...settings,
      bankBranchName: bankBranchName.trim(),
      webAppUrl: webAppUrl.trim(),
    });
    showToast('Đã lưu cấu hình ứng dụng!', 'success');
    onClose();
  };

  const handleResetSampleData = () => {
    if (window.confirm('Khôi phục dữ liệu mẫu sẽ tạo lại danh sách đề nghị ban đầu. Bạn có đồng ý?')) {
      resetDataToSample();
      onResetData();
      showToast('Đã khôi phục dữ liệu mẫu thành công!', 'info');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200">
        <div className="bg-[#002060] text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Settings className="w-6 h-6 text-amber-300" />
            <h3 className="text-lg font-bold">Cài Đặt Hệ Thống</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-blue-200 hover:text-white hover:bg-blue-900 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5 text-xs sm:text-sm">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center space-x-1">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Tên Ngân hàng / Chi nhánh</span>
            </label>
            <input
              type="text"
              value={bankBranchName}
              onChange={(e) => setBankBranchName(e.target.value)}
              placeholder="Ví dụ: VietinBank - Chi Nhánh Ninh Bình"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none text-sm font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center space-x-1">
              <Link2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Google Apps Script Web App URL</span>
            </label>
            <input
              type="text"
              value={webAppUrl}
              onChange={(e) => setWebAppUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none font-mono text-xs"
            />
            {(webAppUrl.includes('/macros/library/') || webAppUrl.includes('/edit')) && (
              <p className="mt-1.5 text-xs text-amber-700 font-semibold bg-amber-50 p-2 rounded-lg border border-amber-200">
                ⚠️ Bạn đang nhập link Thư viện (Library) hoặc Editor. Vui lòng bấm "Triển khai" &gt; "Ứng dụng Web" trong Apps Script và copy link đuôi <code>/exec</code>!
              </p>
            )}
          </div>

          <div className="pt-2 border-t border-gray-200">
            <button
              type="button"
              onClick={handleResetSampleData}
              className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center space-x-2 border border-red-200"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Khôi phục Dữ liệu Mẫu Ban đầu</span>
            </button>
          </div>

          <div className="pt-3 border-t border-gray-200 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-[#002060] hover:bg-blue-900 text-white font-bold rounded-xl text-xs shadow transition-all"
            >
              Lưu Thay Đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
