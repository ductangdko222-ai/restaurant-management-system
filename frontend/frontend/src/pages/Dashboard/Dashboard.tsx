// src/pages/Dashboard/Dashboard.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { Dropdown } from 'primereact/dropdown';
import { TabView, TabPanel } from 'primereact/tabview';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Calendar } from 'primereact/calendar';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ITongQuan, ICanhBao, ITopMon, ISoSanh } from '../../types/dashboard';

// CONSTANTS
const filterOptions = [
  { label: 'Hôm nay', value: 'today' },
  { label: 'Hôm qua', value: 'yesterday' },
  { label: '7 ngày qua', value: 'week7' },
  { label: '30 ngày qua', value: 'day30' },
  { label: 'Tháng này', value: 'month' },
  { label: 'Tháng trước', value: 'lastmonth' },
  { label: 'Tùy chọn', value: 'custom' },
];
const COLORS = ['var(--color-caramel)', 'var(--color-success)', 'var(--color-info)', 'var(--color-error)', '#a855f7', 'var(--color-warning)', 'var(--color-info)'];

const formatDateLocal = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDateRange = (filter: string) => {
  const now = new Date();
  const today = formatDateLocal(now);

  switch (filter) {
    case 'today': return { tungay: today, denngay: today };
    case 'yesterday': { const d = new Date(now); d.setDate(d.getDate() - 1); const s = formatDateLocal(d); return { tungay: s, denngay: s }; }
    case 'week7': { const d = new Date(now); d.setDate(d.getDate() - 6); return { tungay: formatDateLocal(d), denngay: today }; }
    case 'day30': { const d = new Date(now); d.setDate(d.getDate() - 29); return { tungay: formatDateLocal(d), denngay: today }; }
    case 'month': return { tungay: formatDateLocal(new Date(now.getFullYear(), now.getMonth(), 1)), denngay: today };
    case 'lastmonth': {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { tungay: formatDateLocal(first), denngay: formatDateLocal(last) };
    }
    default: return { tungay: today, denngay: today };
  }
};

// SUB COMPONENTS
const fmt = (n: number) => Number(n || 0).toLocaleString('vi-VN');

const StatCard = ({ title, value, sub, color, icon, badge, badgeUp, onClick }: any) => (
  <div onClick={onClick} style={{
    background: 'var(--color-deep-espresso)', border: '1px solid var(--color-dark-gray)', borderTop: `3px solid ${color}`,
    padding: '14px 16px', cursor: onClick ? 'pointer' : 'default', flex: 1, minWidth: 130,
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, color: 'var(--color-dark-gray)', letterSpacing: 2, marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 20, color, fontWeight: 700 }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--color-dark-gray)', marginTop: 4 }}>{sub}</div>}
        {badge !== undefined && (
          <div style={{ fontSize: 11, marginTop: 4, color: badgeUp ? 'var(--color-success)' : 'var(--color-error)' }}>
            <i className={`pi ${badgeUp ? 'pi-arrow-up' : 'pi-arrow-down'}`} style={{ fontSize: 9, marginRight: 3 }} />
            {badge}
          </div>
        )}
      </div>
      <i className={`pi ${icon}`} style={{ fontSize: 18, color, opacity: 0.3 }} />
    </div>
  </div>
);

const SectionTitle = ({ title }: { title: string }) => (
  <div style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 2, marginBottom: 10, marginTop: 20 }}>{title}</div>
);

const tooltipStyle = { background: 'var(--color-deep-espresso)', border: '1px solid var(--color-dark-gray)', color: 'var(--color-off-white)', fontSize: 11 };

// MAIN COMPONENT
const Dashboard = () => {
  const navigate = useNavigate();
  const toast = useRef<Toast>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user && user.vaitro !== 'admin' && user.vaitro !== 'thungan') {
      navigate('/tables');
    }
  }, [user, navigate]);

  // Tổng quan
  const [tongQuan, setTongQuan] = useState<ITongQuan | null>(null);
  const [canhBao, setCanhBao] = useState<ICanhBao | null>(null);
  const [loadingTQ, setLoadingTQ] = useState(true);

  // Báo cáo doanh thu
  const [filterDT, setFilterDT] = useState('month');
  const [customDT, setCustomDT] = useState<[Date | null, Date | null]>([null, null]);
  const [doanhThu, setDoanhThu] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loadingDT, setLoadingDT] = useState(false);

  // Báo cáo top món
  const [filterTopMon, setFilterTopMon] = useState('month');
  const [customTopMon, setCustomTopMon] = useState<[Date | null, Date | null]>([null, null]);
  const [topMon, setTopMon] = useState<ITopMon[]>([]);
  const [sortTopMon, setSortTopMon] = useState<'tongban' | 'doanhthu'>('tongban');
  const [loadingTopMon, setLoadingTopMon] = useState(false);

  // So sánh 2 kỳ
  const [ky1Range, setKy1Range] = useState<[Date | null, Date | null]>([null, null]);
  const [ky2Range, setKy2Range] = useState<[Date | null, Date | null]>([null, null]);
  const [soSanh, setSoSanh] = useState<ISoSanh | null>(null);
  const [loadingSS, setLoadingSS] = useState(false);

  useEffect(() => { fetchTongQuan(); }, []);
  useEffect(() => { if (user?.vaitro === 'admin') fetchDoanhThu(); }, [filterDT, customDT]);
  useEffect(() => { if (user?.vaitro === 'admin') fetchTopMon(); }, [filterTopMon, customTopMon, sortTopMon]);

  const fetchTongQuan = async () => {
    setLoadingTQ(true);
    try {
      const [tqRes, cbRes] = await Promise.all([
        api.getTongQuanHomNay(),
        api.getCanhBao(),
      ]);
      setTongQuan(tqRes.data.data);
      setCanhBao(cbRes.data.data);
    } catch {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải dữ liệu' });
    } finally { setLoadingTQ(false); }
  };

  const getRangeDT = () => {
    if (filterDT === 'custom' && customDT[0] && customDT[1])
      return { tungay: formatDateLocal(customDT[0]), denngay: formatDateLocal(customDT[1]) };
    return getDateRange(filterDT);
  };

  const fetchDoanhThu = async () => {
    if (filterDT === 'custom' && (!customDT[0] || !customDT[1])) return;
    setLoadingDT(true);
    try {
      const range = getRangeDT();
      const [dtRes, chartRes] = await Promise.all([
        api.getDoanhThuTongQuan(range),
        api.getDoanhThuTungNgay(range),
      ]);
      setDoanhThu(dtRes.data.data);
      setChartData(chartRes.data.data.map((r: any) => ({
        ngay: new Date(r.ngay).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
        'Doanh thu': Number(r.tongthu),
        'Số đơn': Number(r.sohoadon),
      })));
    } catch { toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải doanh thu' }); }
    finally { setLoadingDT(false); }
  };

  const getRangeTopMon = () => {
    if (filterTopMon === 'custom' && customTopMon[0] && customTopMon[1])
      return { tungay: formatDateLocal(customTopMon[0]), denngay: formatDateLocal(customTopMon[1]) };
    return getDateRange(filterTopMon);
  };

  const fetchTopMon = async () => {
    if (filterTopMon === 'custom' && (!customTopMon[0] || !customTopMon[1])) return;
    setLoadingTopMon(true);
    try {
      const range = getRangeTopMon();
      const res = await api.getTopMon({ ...range, limit: 20, sortBy: sortTopMon });
      setTopMon(res.data.data);
    } catch { toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải top món' }); }
    finally { setLoadingTopMon(false); }
  };

  const handleSoSanh = async () => {
    if (!ky1Range[0] || !ky1Range[1] || !ky2Range[0] || !ky2Range[1]) {
      toast.current?.show({ severity: 'warn', summary: 'Thiếu thông tin', detail: 'Vui lòng chọn đủ 2 kỳ' });
      return;
    }
    setLoadingSS(true);
    try {
      const res = await api.soSanh2Ky(
        { tungay: formatDateLocal(ky1Range[0]), denngay: formatDateLocal(ky1Range[1]) },
        { tungay: formatDateLocal(ky2Range[0]), denngay: formatDateLocal(ky2Range[1]) }
      );
      setSoSanh(res.data.data);
    } catch { toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: 'Không thể so sánh' }); }
    finally { setLoadingSS(false); }
  };

  // COMPUTED
  const phanBoTT = doanhThu ? [
    { name: 'Tiền mặt', value: Number(doanhThu.tienmat || 0) },
    { name: 'Chuyển khoản', value: Number(doanhThu.chuyenkhoan || 0) },
    { name: 'Ví điện tử', value: Number(doanhThu.vidientu || 0) },
  ].filter(d => d.value > 0) : [];

  const tangTruongDT = tongQuan
    ? tongQuan.homQua.tongthu > 0
      ? ((Number(tongQuan.homNay.tongthu) - Number(tongQuan.homQua.tongthu)) / Number(tongQuan.homQua.tongthu) * 100).toFixed(1)
      : null
    : null;
  const tangTruongDon = tongQuan
    ? tongQuan.homQua.sohoadon > 0
      ? Number(tongQuan.homNay.sohoadon) - Number(tongQuan.homQua.sohoadon)
      : null
    : null;

  const soSanhChartData = soSanh ? (() => {
    const map: Record<string, any> = {};
    soSanh.ky1.byNgay.forEach((r, i) => { map[`Ngày ${i + 1}`] = { name: `Ngày ${i + 1}`, 'Kỳ 1': Number(r.tongthu) }; });
    soSanh.ky2.byNgay.forEach((r, i) => {
      const k = `Ngày ${i + 1}`;
      if (!map[k]) map[k] = { name: k };
      map[k]['Kỳ 2'] = Number(r.tongthu);
    });
    return Object.values(map);
  })() : [];

  const FilterBar = ({ value, onChange, custom, onCustomChange }: any) => (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <Dropdown value={value} options={filterOptions} onChange={e => onChange(e.value)} style={{ minWidth: 140 }} />
      {value === 'custom' && (
        <Calendar
          value={custom[0] || custom[1] ? custom : null} 
          onChange={e => {
            const val = e.value as [Date | null, Date | null] | null;
            onCustomChange(val ?? [null, null]);
          }}
          selectionMode="range"
          readOnlyInput
          placeholder="Từ ngày - Đến ngày"
          style={{ width: 220 }}
        />
      )}
    </div>
  );

  if (loadingTQ) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, color: 'var(--color-caramel)', fontSize: 12, letterSpacing: 2 }}>
      ĐANG TẢI...
    </div>
  );

  return (
    <div style={{ maxWidth: 1100 }}>
      <Toast ref={toast} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, color: 'var(--color-off-white)', marginBottom: 4 }}>
            Xin chào, <span style={{ color: 'var(--color-caramel)' }}>{user?.hoten}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-dark-gray)' }}>
            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
        <Button icon="pi pi-refresh" size="small" severity="secondary" label="Cập nhật" onClick={fetchTongQuan} />
      </div>

      <TabView>
        {/* TAB TỔNG QUAN */}
        <TabPanel header="Tổng quan" leftIcon="pi pi-home mr-2">

          {/* Doanh thu hôm nay */}
          <SectionTitle title="DOANH THU HÔM NAY" />
          <div style={{ display: 'flex', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
            <StatCard title="TỔNG DOANH THU" color="var(--color-caramel)" icon="pi-chart-bar"
              value={`${fmt(tongQuan?.homNay.tongthu || 0)}đ`}
              badge={tangTruongDT !== null ? `${Number(tangTruongDT) > 0 ? '+' : ''}${tangTruongDT}% so với hôm qua` : undefined}
              badgeUp={Number(tangTruongDT) >= 0} />
            <StatCard title="SỐ ĐƠN HOÀN THÀNH" color="var(--color-info)" icon="pi-file"
              value={tongQuan?.homNay.sohoadon || 0}
              badge={tangTruongDon !== null ? `${tangTruongDon >= 0 ? '+' : ''}${tangTruongDon} so với hôm qua` : undefined}
              badgeUp={(tangTruongDon || 0) >= 0} />
            <StatCard title="BÀN ĐANG PHỤC VỤ" color="var(--color-error)" icon="pi-users"
              value={`${tongQuan?.ban.cokhach || 0}/${tongQuan?.ban.tong || 0}`}
              sub="bàn có khách" onClick={() => navigate('/tables')} />
            <StatCard title="ORDER ĐANG XỬ LÝ" color="var(--color-warning)" icon="pi-shopping-cart"
              value={tongQuan?.donHang.dangphucvu || 0}
              sub="đang phục vụ" onClick={() => navigate('/tables')} />
          </div>

          {/* Cảnh báo */}
          {canhBao && (canhBao.nvlSapHet.length > 0 || canhBao.banChoLau.length > 0 || canhBao.orderPending.length > 0) && (
            <>
              <SectionTitle title="CẢNH BÁO" />
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>

                {/* NVL sắp hết */}
                {canhBao.nvlSapHet.length > 0 && (
                  <div style={{ flex: 1, minWidth: 260, background: 'var(--color-deep-espresso)', border: '1px solid var(--color-error)', padding: 14 }}>
                    <div style={{ fontSize: 11, color: 'var(--color-error)', letterSpacing: 1, marginBottom: 10 }}>
                      <i className="pi pi-exclamation-triangle" style={{ marginRight: 6 }} />
                      NGUYÊN VẬT LIỆU SẮP HẾT ({canhBao.nvlSapHet.length})
                    </div>
                    {canhBao.nvlSapHet.map(nvl => (
                      <div key={nvl.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--color-dark-gray)' }}>
                        <span style={{ fontSize: 12, color: 'var(--color-off-white)' }}>{nvl.tennvl}</span>
                        <span style={{ fontSize: 12, color: 'var(--color-error)' }}>
                          {Number(nvl.tonkho).toLocaleString('vi-VN')} {nvl.donvitinh}
                        </span>
                      </div>
                    ))}
                    <Button label="Xem NVL" size="small" severity="secondary" style={{ marginTop: 10, width: '100%' }}
                      onClick={() => navigate('/materials')} />
                  </div>
                )}

                {/* Bàn chờ lâu */}
                {canhBao.banChoLau.length > 0 && (
                  <div style={{ flex: 1, minWidth: 260, background: 'var(--color-deep-espresso)', border: '1px solid var(--color-warning)', padding: 14 }}>
                    <div style={{ fontSize: 11, color: 'var(--color-warning)', letterSpacing: 1, marginBottom: 10 }}>
                      <i className="pi pi-clock" style={{ marginRight: 6 }} />
                      BÀN CHỜ MÓN QUÁ LÂU ({canhBao.banChoLau.length})
                    </div>
                    {canhBao.banChoLau.map((b, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--color-dark-gray)' }}>
                        <span style={{ fontSize: 12, color: 'var(--color-off-white)' }}>{b.tenban} — {b.madon}</span>
                        <span style={{ fontSize: 12, color: 'var(--color-warning)' }}>{b.phutcho} phút</span>
                      </div>
                    ))}
                    <Button label="Xem bếp" size="small" severity="secondary" style={{ marginTop: 10, width: '100%' }}
                      onClick={() => navigate('/kitchen')} />
                  </div>
                )}

                {/* Order pending */}
                {canhBao.orderPending.length > 0 && (
                  <div style={{ flex: 1, minWidth: 260, background: 'var(--color-deep-espresso)', border: '1px solid var(--color-text-secondary)', padding: 14 }}>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', letterSpacing: 1, marginBottom: 10 }}>
                      <i className="pi pi-send" style={{ marginRight: 6 }} />
                      ORDER CHƯA GỬI BẾP ({canhBao.orderPending.length})
                    </div>
                    {canhBao.orderPending.map(o => (
                      <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--color-dark-gray)' }}>
                        <span style={{ fontSize: 12, color: 'var(--color-off-white)' }}>{o.tenban || 'Mang đi'} — {o.madon}</span>
                        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{o.somon} món</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </TabPanel>

        {/* TAB DOANH THU (CHỈ ADMIN) */}
        {user?.vaitro === 'admin' && (
          <TabPanel header="Doanh thu" leftIcon="pi pi-chart-bar mr-2">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <FilterBar value={filterDT} onChange={setFilterDT} custom={customDT} onCustomChange={setCustomDT} />
              <Button icon="pi pi-refresh" size="small" severity="secondary" onClick={fetchDoanhThu} loading={loadingDT} />
            </div>

            {/* Stat cards */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <StatCard title="TỔNG DOANH THU" value={`${fmt(doanhThu?.tongthu || 0)}đ`} color="var(--color-caramel)" icon="pi-chart-bar" />
              <StatCard title="SỐ HÓA ĐƠN" value={doanhThu?.sohoadon || 0} color="var(--color-info)" icon="pi-file" />
              <StatCard title="TRUNG BÌNH/ĐƠN" value={`${fmt(doanhThu?.trungbinh || 0)}đ`} color="#a855f7" icon="pi-chart-line" />
              <StatCard title="TIỀN MẶT" value={`${fmt(doanhThu?.tienmat || 0)}đ`} color="var(--color-success)" icon="pi-wallet" />
              <StatCard title="CHUYỂN KHOẢN" value={`${fmt(doanhThu?.chuyenkhoan || 0)}đ`} color="var(--color-warning)" icon="pi-credit-card" />
              <StatCard title="VÍ ĐIỆN TỬ" value={`${fmt(doanhThu?.vidientu || 0)}đ`} color="var(--color-info)" icon="pi-mobile" />
            </div>

            {/* Biểu đồ đường doanh thu */}
            {chartData.length > 0 && (
              <div style={{ background: 'var(--color-deep-espresso)', border: '1px solid var(--color-dark-gray)', padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', letterSpacing: 2, marginBottom: 12 }}>DOANH THU THEO NGÀY</div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-dark-gray)" />
                    <XAxis dataKey="ngay" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => `${Number(v).toLocaleString('vi-VN')}đ`} />
                    <Legend wrapperStyle={{ color: 'var(--color-text-secondary)', fontSize: 11 }} />
                    <Line type="monotone" dataKey="Doanh thu" stroke="var(--color-caramel)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Biểu đồ phân bổ */}
            {phanBoTT.length > 0 && (
              <div style={{ background: 'var(--color-deep-espresso)', border: '1px solid var(--color-dark-gray)', padding: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', letterSpacing: 2, marginBottom: 12 }}>PHÂN BỔ PHƯƠNG THỨC THANH TOÁN</div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={phanBoTT} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                      {phanBoTT.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => `${Number(v).toLocaleString('vi-VN')}đ`} />
                    <Legend wrapperStyle={{ color: 'var(--color-text-secondary)', fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </TabPanel>
        )}

        {/* TAB TOP MÓN (CHỈ ADMIN) */}
        {user?.vaitro === 'admin' && (
          <TabPanel header="Top món" leftIcon="pi pi-star mr-2">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <FilterBar value={filterTopMon} onChange={setFilterTopMon} custom={customTopMon} onCustomChange={setCustomTopMon} />
              <div style={{ display: 'flex', gap: 8 }}>
                <Button label="Theo số lượng" size="small" severity={sortTopMon === 'tongban' ? undefined : 'secondary'}
                  style={sortTopMon === 'tongban' ? { background: 'var(--color-burnt-orange)', border: 'none', color: '#f5f5f5' } : {}}
                  onClick={() => setSortTopMon('tongban')} />
                <Button label="Theo doanh thu" size="small" severity={sortTopMon === 'doanhthu' ? undefined : 'secondary'}
                  style={sortTopMon === 'doanhthu' ? { background: 'var(--color-burnt-orange)', border: 'none', color: '#f5f5f5' } : {}}
                  onClick={() => setSortTopMon('doanhthu')} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {/* Biểu đồ cột */}
              <div style={{ flex: 1, minWidth: 300, background: 'var(--color-deep-espresso)', border: '1px solid var(--color-dark-gray)', padding: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', letterSpacing: 2, marginBottom: 12 }}>
                  TOP 10 MÓN BÁN CHẠY
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={topMon.slice(0, 10)} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-dark-gray)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} />
                    <YAxis type="category" dataKey="tenmon" width={100} tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }}
                      tickFormatter={v => v.length > 12 ? v.slice(0, 12) + '...' : v} />
                    <Tooltip contentStyle={tooltipStyle}
                      formatter={(value: any, name?: any) => name === 'Doanh thu' ? `${Number(value).toLocaleString('vi-VN')}đ` : value} />
                    <Bar dataKey={sortTopMon === 'tongban' ? 'tongban' : 'doanhthu'}
                      name={sortTopMon === 'tongban' ? 'Số lượng' : 'Doanh thu'}
                      fill="var(--color-caramel)" radius={[0, 2, 2, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Bảng chi tiết */}
              <div style={{ flex: 1, minWidth: 300 }}>
                <DataTable value={topMon} size="small" stripedRows scrollable scrollHeight="320px" loading={loadingTopMon}>
                  <Column header="#" body={(_, opt) => opt.rowIndex + 1} style={{ width: 40 }} />
                  <Column field="tenmon" header="Món ăn" />
                  <Column field="tennhom" header="Nhóm" style={{ width: 90 }} />
                  <Column field="tongban" header="SL bán" sortable style={{ width: 80 }}
                    body={r => <span style={{ color: 'var(--color-caramel)' }}>{r.tongban}</span>} />
                  <Column field="doanhthu" header="Doanh thu" sortable style={{ width: 110 }}
                    body={r => <span style={{ color: 'var(--color-success)', fontSize: 11 }}>{fmt(r.doanhthu)}đ</span>} />
                </DataTable>
              </div>
            </div>
          </TabPanel>
        )}

        {/* TAB SO SÁNH (CHỈ ADMIN) */}
        {user?.vaitro === 'admin' && (
          <TabPanel header="So sánh kỳ" leftIcon="pi pi-arrows-h mr-2">
            <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 220, background: 'var(--color-deep-espresso)', border: '1px solid var(--color-caramel)', padding: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1, marginBottom: 10 }}>KỲ 1</div>
                <Calendar
                  value={ky1Range[0] || ky1Range[1] ? ky1Range : null}
                  onChange={e => {
                    const val = e.value as [Date | null, Date | null] | null;
                    setKy1Range(val ?? [null, null]);
                  }}
                  selectionMode="range" readOnlyInput placeholder="Chọn khoảng ngày" className="w-full"
                />
              </div>
              <div style={{ flex: 1, minWidth: 220, background: 'var(--color-deep-espresso)', border: '1px solid var(--color-info)', padding: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--color-info)', letterSpacing: 1, marginBottom: 10 }}>KỲ 2</div>
                <Calendar
                  value={ky2Range[0] || ky2Range[1] ? ky2Range : null}
                  onChange={e => {
                    const val = e.value as [Date | null, Date | null] | null;
                    setKy2Range(val ?? [null, null]);
                  }}
                  selectionMode="range" readOnlyInput placeholder="Chọn khoảng ngày" className="w-full"
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <Button label="So sánh" icon="pi pi-chart-bar" loading={loadingSS}
                  style={{ background: 'var(--color-burnt-orange)', border: 'none', color: '#f5f5f5' }}
                  onClick={handleSoSanh} />
              </div>
            </div>

            {soSanh && (
              <>
                {/* Stat cards so sánh */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
                  {[
                    { title: 'DOANH THU', v1: `${fmt(soSanh.ky1.tongthu)}đ`, v2: `${fmt(soSanh.ky2.tongthu)}đ`, tang: soSanh.tangTruong.doanhThu, suffix: '%' },
                    { title: 'SỐ HÓA ĐƠN', v1: soSanh.ky1.sohoadon, v2: soSanh.ky2.sohoadon, tang: soSanh.tangTruong.soHoaDon, suffix: '%' },
                    { title: 'TRUNG BÌNH/ĐƠN', v1: `${fmt(soSanh.ky1.trungbinh)}đ`, v2: `${fmt(soSanh.ky2.trungbinh)}đ`, tang: null, suffix: '' },
                  ].map(item => (
                    <div key={item.title} style={{ background: 'var(--color-deep-espresso)', border: '1px solid var(--color-dark-gray)', padding: 14 }}>
                      <div style={{ fontSize: 10, color: 'var(--color-dark-gray)', letterSpacing: 2, marginBottom: 10 }}>{item.title}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div>
                          <div style={{ fontSize: 10, color: 'var(--color-caramel)', marginBottom: 2 }}>Kỳ 1</div>
                          <div style={{ fontSize: 15, color: 'var(--color-caramel)', fontWeight: 700 }}>{item.v1}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 10, color: 'var(--color-info)', marginBottom: 2 }}>Kỳ 2</div>
                          <div style={{ fontSize: 15, color: 'var(--color-info)', fontWeight: 700 }}>{item.v2}</div>
                        </div>
                      </div>
                      {item.tang !== null && (
                        <div style={{ fontSize: 12, color: Number(item.tang) >= 0 ? 'var(--color-success)' : 'var(--color-error)', fontWeight: 600 }}>
                          <i className={`pi ${Number(item.tang) >= 0 ? 'pi-arrow-up' : 'pi-arrow-down'}`} style={{ marginRight: 4 }} />
                          {Number(item.tang) >= 0 ? '+' : ''}{item.tang}{item.suffix}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Biểu đồ so sánh */}
                {soSanhChartData.length > 0 && (
                  <div style={{ background: 'var(--color-deep-espresso)', border: '1px solid var(--color-dark-gray)', padding: 16 }}>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', letterSpacing: 2, marginBottom: 12 }}>
                      DOANH THU THEO NGÀY - SO SÁNH 2 KỲ
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={soSanhChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-dark-gray)" />
                        <XAxis dataKey="name" tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} />
                        <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => `${Number(v).toLocaleString('vi-VN')}đ`} />
                        <Legend wrapperStyle={{ color: 'var(--color-text-secondary)', fontSize: 11 }} />
                        <Bar dataKey="Kỳ 1" fill="var(--color-caramel)" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="Kỳ 2" fill="var(--color-info)" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}

            {!soSanh && !loadingSS && (
              <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-dark-gray)', fontSize: 13 }}>
                <i className="pi pi-arrows-h" style={{ fontSize: 32, display: 'block', marginBottom: 12 }} />
                Chọn 2 kỳ thời gian và bấm "So sánh"
              </div>
            )}
          </TabPanel>
        )}
      </TabView>
    </div>
  );
};

export default Dashboard;



