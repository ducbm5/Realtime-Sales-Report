import { useEffect, useState, useMemo } from 'react';
import { parseTSV } from './utils/dataParser';
import { RaceRecord } from './types';
import { PivotTable } from './components/PivotTable';
import { 
  RefreshCcw, 
  AlertCircle, 
  Filter
} from 'lucide-react';

const SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ6_8K5YGZcqol-uX6B1JpnrAhoAArEPij340y-1mqpuimhx9Rn9_2NVaZgtVqP_P45SKECu0jiYAHn/pub?output=tsv";

// Fully matching 10-column mock seeds for local CORS or off-line testing
const FALLBACK_SEEDS: RaceRecord[] = [
  { id: "seed_1", matchId: "M_01", stt: "1", userId: "USR_1001", distance: "42km", gender: "Nam", amount: 1200000, promoCode: "EARLYBIRD_30", partner: "VinFast Vietnam", createdAt: "2026-06-01 08:30", ageGroup: "30-39 tuổi" },
  { id: "seed_2", matchId: "M_01", stt: "2", userId: "USR_1002", distance: "21km", gender: "Nữ", amount: 850000, promoCode: "(Trống)", partner: "Nike Run Club", createdAt: "2026-06-01 09:12", ageGroup: "18-29 tuổi" },
  { id: "seed_3", matchId: "M_01", stt: "3", userId: "USR_1003", distance: "10km", gender: "Nam", amount: 500000, promoCode: "PROMO_RUNNER", partner: "Adidas Running", createdAt: "2026-06-01 10:15", ageGroup: "40-49 tuổi" },
  { id: "seed_4", matchId: "M_01", stt: "4", userId: "USR_1004", distance: "5km", gender: "Nữ", amount: 350000, promoCode: "RUNFREE_100", partner: "Techcombank Sport", createdAt: "2026-06-02 07:11", ageGroup: "18-29 tuổi" },
  { id: "seed_5", matchId: "M_02", stt: "5", userId: "USR_1005", distance: "42km", gender: "Nam", amount: 1500000, promoCode: "(Trống)", partner: "VPBank Runners", createdAt: "2026-06-02 11:22", ageGroup: "30-39 tuổi" },
  { id: "seed_6", matchId: "M_02", stt: "6", userId: "USR_1006", distance: "21km", gender: "Nữ", amount: 950000, promoCode: "EARLYBIRD_30", partner: "VinFast Vietnam", createdAt: "2026-06-02 14:04", ageGroup: "30-39 tuổi" },
  { id: "seed_7", matchId: "M_02", stt: "7", userId: "USR_1007", distance: "10km", gender: "Nam", amount: 600000, promoCode: "PROMO_RUNNER", partner: "Adidas Running", createdAt: "2026-06-03 08:00", ageGroup: "40-49 tuổi" },
  { id: "seed_8", matchId: "M_02", stt: "8", userId: "USR_1008", distance: "5km", gender: "Nữ", amount: 400000, promoCode: "RUNFREE_100", partner: "(Trống)", createdAt: "2026-06-03 10:45", ageGroup: "Trên 50 tuổi" },
];

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('race_analytics_auth') === '898989';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [records, setRecords] = useState<RaceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  // Global Partner filter state
  const [selectedPartnerFilter, setSelectedPartnerFilter] = useState<string>('');

  // Get all unique partners for the global filter option list
  const partnerOptions = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => {
      const p = r.partner?.trim();
      if (p) {
        set.add(p);
      }
    });
    return Array.from(set).sort();
  }, [records]);

  // Apply global partner filter
  const filteredRecords = useMemo(() => {
    if (!selectedPartnerFilter) return records;
    return records.filter(r => r.partner?.trim() === selectedPartnerFilter);
  }, [records, selectedPartnerFilter]);

  // Loader function from URL
  const loadTsvData = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const finalUrl = `${SPREADSHEET_URL}&_t=${Date.now()}`;
      const response = await fetch(finalUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const text = await response.text();
      if (!text || text.trim().length === 0) {
        throw new Error("Tệp TSV tải về rỗng.");
      }

      const parsed = parseTSV(text);
      if (parsed.length === 0) {
        throw new Error("Không có bản ghi hợp lệ nào được giải nén.");
      }

      setRecords(parsed);
      setIsUsingFallback(false);
      setLastRefreshed(new Date().toLocaleTimeString('vi-VN'));
    } catch (err: any) {
      console.warn("TSV Loading failed, fallback to offline seed data:", err);
      setFetchError(err.message || 'Lỗi mạng hoặc CORS không thể tải TSV trực tiếp.');
      setRecords(FALLBACK_SEEDS);
      setIsUsingFallback(true);
      setLastRefreshed(new Date().toLocaleTimeString('vi-VN') + " (Dữ liệu Dự phòng)");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTsvData();
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle decorative glow */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="flex flex-col items-center text-center space-y-6 relative">
            {/* Logo / Badge */}
            <div className="w-16 h-16 bg-linear-to-tr from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center font-black text-slate-950 text-2xl shadow-xl shadow-amber-500/15">
              R
            </div>

            <div className="space-y-1.5">
              <h1 className="text-xl font-black text-white uppercase tracking-tight">
                RACE<span className="text-amber-500">ANALYTICS</span>
              </h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                Hệ thống Báo cáo & Phân tích Pivot Trực quan dữ liệu Giải chạy
              </p>
            </div>

            <div className="w-full h-px bg-slate-800 my-2"></div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (passwordInput.trim() === '898989') {
                  localStorage.setItem('race_analytics_auth', '898989');
                  setIsAuthenticated(true);
                  setPasswordError(null);
                } else {
                  setPasswordError('Mật khẩu nhập chưa chính xác. Vui lòng thử lại!');
                }
              }}
              className="w-full space-y-4"
            >
              <div className="space-y-2 text-left">
                <label htmlFor="password-field" className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Nhập Mật khẩu Truy cập
                </label>
                <input
                  id="password-field"
                  type="password"
                  placeholder="••••••"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (passwordError) setPasswordError(null);
                  }}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-center text-white tracking-widest text-lg font-bold focus:outline-hidden focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 transition-all placeholder:text-slate-700"
                  autoFocus
                />
              </div>

              {passwordError && (
                <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs text-left font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-400 active:scale-98 transition-all font-extrabold text-slate-950 text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2"
              >
                <span>Xác nhận Truy cập</span>
              </button>
            </form>

            <p className="text-[10px] text-slate-500 pt-2 font-mono">
              Hệ thống Bảo mật Cổng thông tin Admin BTC
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans flex flex-col justify-between">
      
      {/* Upper Navigation Bar */}
      <nav className="h-16 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between px-6 shrink-0 shadow-lg relative z-20">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center font-black text-slate-950 shadow-md">R</div>
          <span className="text-sm sm:text-base font-black tracking-tight uppercase">
            RACE<span className="text-amber-500">ANALYTICS</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-400 font-mono hidden sm:inline-block">
            {lastRefreshed ? `Đồng bộ: ${lastRefreshed}` : 'Đang xử lý...'}
          </span>
          <button
            type="button"
            onClick={() => loadTsvData()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-lg border border-slate-700 transition-colors cursor-pointer shadow-xs active:scale-95"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Cập Nhật Google Sheets</span>
            <span className="sm:hidden">Reset</span>
          </button>
        </div>
      </nav>

      {/* Warning banner of using local fallback seeds */}
      {isUsingFallback && (
        <div className="bg-amber-600 text-white text-[11px] sm:text-xs px-4 py-2.5 flex items-center justify-between font-medium shadow-md">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              <strong>Lưu ý kết nối:</strong> Do chặn CORS trình duyệt, hệ thống đã kích hoạt <strong>Dữ liệu Dự phòng (Chuẩn hóa)</strong>. Bạn có thể sử dụng đầy đủ các tính năng.
            </span>
          </div>
        </div>
      )}

      {/* Master Main Container */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col gap-8">

        {/* LOADING STATE ANIMATION WITH GORGEOUS SKILL-CHECK PROGRESS */}
        {loading ? (
          <div className="space-y-6 py-16">
            <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center gap-5 shadow-xs py-24">
              <div className="relative">
                <div className="w-14 h-14 border-4 border-amber-100 border-t-amber-500 rounded-full animate-spin"></div>
              </div>
              <div className="text-center space-y-1">
                <h3 className="font-extrabold text-slate-800 text-sm">Đang nạp dữ liệu giải chạy...</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Đang phân phối cơ chế nạp TSV tự động từ kho dữ liệu Google Drive và phân bổ các trường thông tin.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* REWRITTEN DASHBOARD CONTAINING EXACTLY TWO SECTIONS */
          <div className="flex flex-col gap-8">
            
            {/* Global Filter Bar */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-3xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Filter className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black text-slate-800 uppercase tracking-tight block">Bộ lọc toàn trang</span>
                  <span className="text-[10px] text-slate-400">Điều chỉnh dữ liệu của toàn bộ các phần thống kê bên dưới</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                <span className="text-xs font-bold text-slate-600 shrink-0">Chọn Đối Tác / Partner:</span>
                <select
                  value={selectedPartnerFilter}
                  onChange={(e) => setSelectedPartnerFilter(e.target.value)}
                  className="px-3 py-2 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                >
                  <option value="">-- Tất cả Đối Tác --</option>
                  {partnerOptions.map(p => (
                    <option key={p} value={p}>
                      {p === '(Trống)' ? 'Đăng ký tự do / Không đối tác' : p}
                    </option>
                  ))}
                </select>
                
                {selectedPartnerFilter && (
                  <button
                    onClick={() => setSelectedPartnerFilter('')}
                    className="px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-100 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>Xoá lọc</span>
                  </button>
                )}
              </div>
            </div>

            {/* BOX 2: Excel-style Pivot Table analysis requested by user */}
            <PivotTable records={filteredRecords} selectedPartner={selectedPartnerFilter || '(All)'} />

          </div>
        )}

      </div>

      {/* High-density Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-white/50 text-xs py-10 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-semibold text-center sm:text-left">
          <div className="space-y-1">
            <p className="text-slate-350">Báo Cáo Giải Chạy Marathon v2.5 (Thế hệ mới)</p>
            <p className="text-slate-500 text-[11px] font-normal leading-relaxed">
              Trang thông tin tổng hợp được thiết kế theo các tiêu chuẩn mới của Ban Tổ Chức, tuân thủ chặt chẽ việc ẩn tệp dữ liệu gốc.
            </p>
          </div>
          <div className="text-slate-500 text-[11px] font-medium font-mono">
            <span>© 2026 Admin Portal • Bản quyền thuộc BTC Giải Chạy</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
