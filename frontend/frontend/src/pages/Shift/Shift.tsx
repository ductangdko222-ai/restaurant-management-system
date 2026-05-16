// src/pages/Payment/ShiftManager.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputNumber } from 'primereact/inputnumber';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import api from '../../services/api';
import { ICaLamViec, IDoanhThu } from '../../types';

const ShiftManager = () => {
  const [caDangMo, setCaDangMo]       = useState<ICaLamViec | null>(null);
  const [danhSachCa, setDanhSachCa]   = useState<ICaLamViec[]>([]);
  const [doanhThu, setDoanhThu]       = useState<IDoanhThu | null>(null);
  const [loading, setLoading]         = useState(true);

  // Dialog mở ca
  const [moDialog, setMoDialog]       = useState(false);
  const [tiendauca, setTiendauca]     = useState<number>(0);
  const [savingMo, setSavingMo]       = useState(false);

  // Dialog đóng ca
  const [dongDialog, setDongDialog]   = useState(false);
  const [tiencuoica, setTiencuoica]   = useState<number>(0);
  const [savingDong, setSavingDong]   = useState(false);
  const [ketQuaDong, setKetQuaDong]   = useState<any>(null);

  // Dialog chi tiết ca cũ
  const [chiTietDialog, setChiTietDialog] = useState(false);
  const [chiTietCa, setChiTietCa]         = useState<any>(null);
  const [doanhThuChiTiet, setDoanhThuChiTiet] = useState<IDoanhThu | null>(null);

  const toast = useRef<Toast>(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [activeRes, allRes] = await Promise.all([
        api.getActiveShift(),
        api.getShifts ? api.getShifts() : Promise.resolve({ data: { data: [] } }),
      ]);
      setCaDangMo(activeRes.data.data);
      setDanhSachCa(allRes.data.data || []);

      // Nếu có ca đang mở thì lấy doanh thu của ca đó
      if (activeRes.data.data) {
        fetchDoanhThu(activeRes.data.data.id);
      }
    } catch {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải dữ liệu' });
    } finally { setLoading(false); }
  };

  // SỬ DỤNG api.getDoanhThuTheoCA thay vì getRevenueStats
  const fetchDoanhThu = async (calamviecid: number) => {
    try {
      const res = await api.getDoanhThuTheoCA(calamviecid);
      // Đảm bảo lấy đúng field chứa data trả về từ backend (có thể là res.data.data hoặc res.data tùy setup Axios)
      setDoanhThu(res.data.data || res.data); 
    } catch { setDoanhThu(null); }
  };

  // Mở ca
  const handleMoCa = async () => {
    setSavingMo(true);
    try {
      await api.openShift(tiendauca);
      toast.current?.show({ severity: 'success', summary: 'Đã mở ca làm việc' });
      setMoDialog(false);
      setTiendauca(0);
      fetchAll();
    } catch (e: any) {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: e.response?.data?.message });
    } finally { setSavingMo(false); }
  };

  // Đóng ca
  const handleDongCa = async () => {
    if (!caDangMo) return;
    setSavingDong(true);
    try {
      const res = await api.closeShift(caDangMo.id, tiencuoica);
      setKetQuaDong(res.data.data);
      setDongDialog(false);
      toast.current?.show({ severity: 'success', summary: 'Đã đóng ca làm việc' });
      fetchAll();
    } catch (e: any) {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: e.response?.data?.message });
    } finally { setSavingDong(false); }
  };

  // Xem chi tiết ca đã đóng
  const openChiTiet = async (ca: ICaLamViec) => {
    setChiTietCa(ca);
    setChiTietDialog(true);
    try {
      // SỬ DỤNG api.getDoanhThuTheoCA thay vì getRevenueStats
      const res = await api.getDoanhThuTheoCA(ca.id);
      setDoanhThuChiTiet(res.data.data || res.data);
    } catch { setDoanhThuChiTiet(null); }
  };

  const formatTime = (str?: string) => str ? new Date(str).toLocaleString('vi-VN') : '—';
  const formatMoney = (n: number) => Number(n || 0).toLocaleString('vi-VN') + 'đ';

  const tinhChenLech = () => {
    if (!doanhThu) return 0;
    return tiencuoica - (caDangMo?.tiendauca || 0) - Number(doanhThu.tienmat || 0);
  };

  const actionBody = (row: ICaLamViec) => (
    <Button icon="pi pi-eye" size="small" severity="secondary" tooltip="Chi tiết"
      onClick={() => openChiTiet(row)} />
  );

  const trangThaiBody = (row: ICaLamViec) => (
    <Tag value={row.trangthai === 'dangmo' ? 'Đang mở' : 'Đã đóng'}
      severity={row.trangthai === 'dangmo' ? 'success' : 'secondary'} />
  );

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <Toast ref={toast} />
      <ConfirmDialog />

      {/*  CA ĐANG MỞ  */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-dark-gray)' }}>Đang tải...</div>
      ) : caDangMo ? (
        <div style={{ marginBottom: 24 }}>
          <div style={{ background: 'var(--color-deep-espresso)', border: '1px solid var(--color-success)', padding: 20, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-success)', letterSpacing: 2, marginBottom: 8 }}>CA ĐANG MỞ</div>
                <div style={{ fontSize: 15, color: 'var(--color-off-white)', fontWeight: 600, marginBottom: 4 }}>{caDangMo.hoten}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Bắt đầu: {formatTime(caDangMo.thoigianbatdau)}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  Tiền đầu ca: <span style={{ color: 'var(--color-caramel)' }}>{formatMoney(caDangMo.tiendauca)}</span>
                </div>
              </div>
              <Button label="Đóng ca" icon="pi pi-power-off" severity="danger" size="small"
                onClick={() => { setTiencuoica(0); setDongDialog(true); }} />
            </div>
          </div>

          {/* Doanh thu realtime */}
          {doanhThu && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'TỔNG DOANH THU', value: formatMoney(doanhThu.tongthu), color: 'var(--color-caramel)' },
                { label: 'TIỀN MẶT',        value: formatMoney(doanhThu.tienmat),      color: 'var(--color-success)' },
                { label: 'CHUYỂN KHOẢN',    value: formatMoney(doanhThu.chuyenkhoan),  color: 'var(--color-info)' },
                { label: 'VÍ ĐIỆN TỬ',      value: formatMoney(doanhThu.vidientu),     color: '#a855f7' },
              ].map(item => (
                <div key={item.label} style={{ background: 'var(--color-deep-espresso)', border: '1px solid var(--color-dark-gray)', padding: '14px 16px' }}>
                  <div style={{ fontSize: 10, color: 'var(--color-dark-gray)', letterSpacing: 1, marginBottom: 6 }}>{item.label}</div>
                  <div style={{ fontSize: 16, color: item.color, fontWeight: 700 }}>{item.value}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-deep-espresso)', border: '1px solid var(--color-dark-gray)', padding: '10px 16px' }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
              Số đơn đã thanh toán: <span style={{ color: 'var(--color-off-white)' }}>{doanhThu?.sohoadon || 0}</span>
            </span>
            <Button icon="pi pi-refresh" size="small" severity="secondary" label="Cập nhật"
              onClick={() => fetchDoanhThu(caDangMo.id)} />
          </div>
        </div>
      ) : (
        <div style={{ background: 'var(--color-deep-espresso)', border: '1px solid var(--color-dark-gray)', padding: 32, textAlign: 'center', marginBottom: 24 }}>
          <i className="pi pi-power-off" style={{ fontSize: 32, color: 'var(--color-dark-gray)', display: 'block', marginBottom: 12 }} />
          <div style={{ fontSize: 14, color: 'var(--color-dark-gray)', marginBottom: 16 }}>Chưa có ca làm việc nào đang mở</div>
          <Button label="Mở ca làm việc" icon="pi pi-plus" size="small"
            style={{ background: 'var(--color-burnt-orange)', border: 'none', color: '#f5f5f5' }}
            onClick={() => { setTiendauca(0); setMoDialog(true); }} />
        </div>
      )}

      {/*  LỊCH SỬ CA  */}
      <div style={{ background: 'var(--color-deep-espresso)', border: '1px solid var(--color-dark-gray)', padding: 16 }}>
        <div style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 2, marginBottom: 12 }}>LỊCH SỬ CA LÀM VIỆC</div>
        <DataTable value={danhSachCa} size="small" stripedRows emptyMessage="Chưa có ca nào">
          <Column field="hoten" header="Nhân viên" />
          <Column header="Bắt đầu"  body={r => formatTime(r.thoigianbatdau)} style={{ width: 160 }} />
          <Column header="Kết thúc" body={r => formatTime(r.thoigianketthuc)} style={{ width: 160 }} />
          <Column header="Tiền đầu ca" body={r => <span style={{ color: 'var(--color-caramel)' }}>{formatMoney(r.tiendauca)}</span>} style={{ width: 130 }} />
          <Column header="Tiền cuối ca" body={r => <span style={{ color: 'var(--color-caramel)' }}>{formatMoney(r.tiencuoica)}</span>} style={{ width: 130 }} />
          <Column header="Trạng thái" body={trangThaiBody} style={{ width: 110 }} />
          <Column header="Chi tiết" body={actionBody} style={{ width: 90 }} />
        </DataTable>
      </div>

      {/*  DIALOG MỞ CA  */}
      <Dialog header="Mở ca làm việc" visible={moDialog} style={{ width: 360 }} onHide={() => setMoDialog(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1, display: 'block', marginBottom: 6 }}>
              TIỀN ĐẦU CA (đ)
            </label>
            <InputNumber className="w-full" value={tiendauca}
              onValueChange={e => setTiendauca(e.value || 0)}
              locale="vi-VN" min={0} />
            <div style={{ fontSize: 11, color: 'var(--color-dark-gray)', marginTop: 6 }}>
              Số tiền mặt hiện có trong két khi bắt đầu ca
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button label="Hủy" severity="secondary" size="small" onClick={() => setMoDialog(false)} />
            <Button label="Mở ca" icon="pi pi-check" size="small" loading={savingMo}
              style={{ background: 'var(--color-success)', border: 'none', color: '#000' }}
              onClick={handleMoCa} />
          </div>
        </div>
      </Dialog>

      {/*  DIALOG ĐÓNG CA  */}
      <Dialog header="Đóng ca làm việc" visible={dongDialog} style={{ width: 420 }} onHide={() => setDongDialog(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
          {/* Tổng kết doanh thu */}
          {doanhThu && (
            <div style={{ background: 'var(--color-deep-espresso)', border: '1px solid var(--color-dark-gray)', padding: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1, marginBottom: 10 }}>TỔNG KẾT CA</div>
              {[
                { label: 'Tổng doanh thu',  value: formatMoney(doanhThu.tongthu),     color: 'var(--color-caramel)' },
                { label: 'Tiền mặt',         value: formatMoney(doanhThu.tienmat),     color: 'var(--color-off-white)' },
                { label: 'Chuyển khoản',     value: formatMoney(doanhThu.chuyenkhoan), color: 'var(--color-off-white)' },
                { label: 'Ví điện tử',       value: formatMoney(doanhThu.vidientu),    color: 'var(--color-off-white)' },
                { label: 'Số hóa đơn',       value: `${doanhThu.sohoadon} đơn`,        color: 'var(--color-off-white)' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{item.label}:</span>
                  <span style={{ fontSize: 12, color: item.color, fontWeight: item.color === 'var(--color-caramel)' ? 700 : 400 }}>{item.value}</span>
                </div>
              ))}
            </div>
          )}

          <div>
            <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1, display: 'block', marginBottom: 6 }}>
              TIỀN CUỐI CA (đ)
            </label>
            <InputNumber className="w-full" value={tiencuoica}
              onValueChange={e => setTiencuoica(e.value || 0)}
              locale="vi-VN" min={0} />
            <div style={{ fontSize: 11, color: 'var(--color-dark-gray)', marginTop: 6 }}>
              Số tiền mặt thực tế đếm được khi kết thúc ca
            </div>
          </div>

          {/* Chênh lệch preview */}
          {tiencuoica > 0 && doanhThu && (
            <div style={{ padding: '10px 14px', background: 'var(--color-deep-espresso)', border: '1px solid var(--color-dark-gray)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Chênh lệch tiền mặt:</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: tinhChenLech() >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
                  {tinhChenLech() >= 0 ? '+' : ''}{formatMoney(tinhChenLech())}
                </span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--color-dark-gray)', marginTop: 4 }}>
                = Tiền cuối ca - Tiền đầu ca - Doanh thu tiền mặt
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button label="Hủy" severity="secondary" size="small" onClick={() => setDongDialog(false)} />
            <Button label="Xác nhận đóng ca" icon="pi pi-power-off" size="small" loading={savingDong}
              severity="danger" onClick={handleDongCa} />
          </div>
        </div>
      </Dialog>

      {/*  DIALOG CHI TIẾT CA  */}
      <Dialog header={`Chi tiết ca — ${chiTietCa?.hoten}`} visible={chiTietDialog}
        style={{ width: 420 }} onHide={() => setChiTietDialog(false)}>
        {chiTietCa && (
          <div style={{ paddingTop: 8 }}>
            <div style={{ background: 'var(--color-deep-espresso)', border: '1px solid var(--color-dark-gray)', padding: 14, marginBottom: 14 }}>
              {[
                { label: 'Bắt đầu',    value: formatTime(chiTietCa.thoigianbatdau) },
                { label: 'Kết thúc',   value: formatTime(chiTietCa.thoigianketthuc) },
                { label: 'Tiền đầu ca', value: formatMoney(chiTietCa.tiendauca) },
                { label: 'Tiền cuối ca', value: formatMoney(chiTietCa.tiencuoica) },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{item.label}:</span>
                  <span style={{ fontSize: 12, color: 'var(--color-off-white)' }}>{item.value}</span>
                </div>
              ))}
            </div>

            {doanhThuChiTiet && (
              <div style={{ background: 'var(--color-deep-espresso)', border: '1px solid var(--color-dark-gray)', padding: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1, marginBottom: 10 }}>DOANH THU</div>
                {[
                  { label: 'Tổng doanh thu',  value: formatMoney(doanhThuChiTiet.tongthu),     color: 'var(--color-caramel)' },
                  { label: 'Tiền mặt',         value: formatMoney(doanhThuChiTiet.tienmat),     color: 'var(--color-off-white)' },
                  { label: 'Chuyển khoản',     value: formatMoney(doanhThuChiTiet.chuyenkhoan), color: 'var(--color-off-white)' },
                  { label: 'Ví điện tử',       value: formatMoney(doanhThuChiTiet.vidientu),    color: 'var(--color-off-white)' },
                  { label: 'Số hóa đơn',       value: `${doanhThuChiTiet.sohoadon} đơn`,        color: 'var(--color-off-white)' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{item.label}:</span>
                    <span style={{ fontSize: 12, color: item.color, fontWeight: item.color === 'var(--color-caramel)' ? 700 : 400 }}>{item.value}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid var(--color-dark-gray)', paddingTop: 10, marginTop: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Chênh lệch tiền mặt:</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: (chiTietCa.tiencuoica - chiTietCa.tiendauca - doanhThuChiTiet.tienmat) >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
                      {(() => {
                        const cl = chiTietCa.tiencuoica - chiTietCa.tiendauca - doanhThuChiTiet.tienmat;
                        return `${cl >= 0 ? '+' : ''}${formatMoney(cl)}`;
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
};

export default ShiftManager;

