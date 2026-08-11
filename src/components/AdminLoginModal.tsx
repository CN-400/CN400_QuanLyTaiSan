import React, { useState } from 'react';
import { Lock, KeyRound, ShieldAlert, X, Eye, EyeOff, ShieldCheck } from 'lucide-react';

interface AdminLoginModalProps {
  currentPassword?: string;
  onSuccess: () => void;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  currentPassword = 'admin123',
  onSuccess,
  onClose,
  showToast,
}) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const effectivePassword = currentPassword || 'admin123';

    if (passwordInput.trim() === effectivePassword) {
      showToast('Đăng nhập Quản trị viên thành công!', 'success');
      onSuccess();
    } else {
      setErrorMsg('Mật khẩu Quản trị viên không chính xác. Vui lòng kiểm tra lại!');
      showToast('Mật khẩu không đúng!', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="bg-[#002060] text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/20 rounded-lg border border-amber-400/30">
              <KeyRound className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold uppercase tracking-wide">Xác Thực Cán Bộ Quản Lý</h3>
              <p className="text-xs text-blue-200">Nhập mật khẩu Admin để truy cập Cài đặt hệ thống</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-blue-200 hover:text-white hover:bg-blue-900 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-start space-x-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Tính năng dành cho Cán bộ Quản trị hệ thống</p>
              <p className="mt-0.5 text-[11px] text-amber-800">
                Để đảm bảo an toàn dữ liệu, chỉ Cán bộ Quản lý mới có quyền điều chỉnh cấu hình kết nối Google Sheets, Email thông báo và Tên chi nhánh.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
              <Lock className="w-3.5 h-3.5 text-blue-600" />
              <span>Mật khẩu Quản trị (Admin Password)</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Nhập mật khẩu admin..."
                autoFocus
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none text-sm font-semibold"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {errorMsg && (
              <p className="mt-1.5 text-xs text-red-600 font-semibold animate-pulse">{errorMsg}</p>
            )}

            <div className="mt-2 text-[11px] text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-200 flex items-center justify-between">
              <span>Mật khẩu mặc định:</span>
              <button
                type="button"
                onClick={() => {
                  setPasswordInput(currentPassword || 'admin123');
                  setErrorMsg('');
                }}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-300 font-bold font-mono transition-colors text-[11px]"
              >
                Tự điền ({currentPassword || 'admin123'})
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-[#002060] hover:bg-blue-900 text-white font-bold rounded-xl text-xs shadow transition-all flex items-center space-x-1.5"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Xác Nhận Đăng Nhập</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
