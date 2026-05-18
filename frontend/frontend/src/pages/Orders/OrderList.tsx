// src/pages/Orders/OrderList.tsx
import React, { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { DonHang, ChiTietMon } from '../../types/orders';

const fmt = (n: number) => Number(n).toLocaleString('vi-VN');

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  choxacnhan:   { color: 'var(--color-off-white)', bg: 'var(--color-info)',    label: 'Chờ xác nhận',        icon: '⌛' },
  dangphucvu:   { color: 'var(--color-off-white)', bg: 'var(--color-caramel)', label: 'Đang phục vụ',         icon: '🍽️' }, // FIX: --olcor-caramel → --color-caramel
  chothanhtoan: { color: '#000',                   bg: 'var(--color-caramel)', label: 'Sẵn sàng thanh toán', icon: '✅' },
  dathanhtoan:  { color: 'var(--color-off-white)', bg: 'var(--color-success)', label: 'Đã thanh toán',        icon: '✓' },
  daphucvu:     { color: 'var(--color-off-white)', bg: 'var(--color-success)', label: 'Đã thanh toán',        icon: '✓' },
};

const ITEM_STATUS: Record<string, { color: string; label: string }> = {
  moi:      { color: 'var(--color-dark-gray)', label: 'Chờ nấu' },
  danglam:  { color: 'var(--color-warning)',   label: 'Đang nấu' },
  sansang:  { color: 'var(--color-info)',      label: 'Sẵn sàng' },
  daphucvu: { color: 'var(--color-success)',   label: 'Đã phục vụ' },
};

const getStatus = (s: string) =>
  STATUS_CONFIG[s] ?? { color: 'var(--color-off-white)', bg: 'var(--color-dark-gray)', label: s, icon: '' };

const ORDERS_PER_PAGE = 10;

const STATUS_TABS = [
  { status: 'choxacnhan',   label: 'Chờ xác nhận',        icon: 'pi pi-hourglass' },
  { status: 'dangphucvu',   label: 'Đang phục vụ',         icon: 'pi pi-concierge-bell' },
  { status: 'chothanhtoan', label: 'Sẵn sàng TT',          icon: 'pi pi-wallet' },
  { status: 'dathanhtoan',  label: 'Đã thanh toán',        icon: 'pi pi-check-circle' },
];

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
};

// hiển thị 1 đơn trên mobile
const OrderCard: React.FC<{
  row: DonHang;
  canConfirmOrder: boolean;
  canPayment: boolean;
  calculateWaitTime: (t?: string) => string;
  onDetail: (o: DonHang) => void;
  onConfirm: (o: DonHang) => void;
  onCancel: (o: DonHang) => void;
  onPay: (id: number) => void;
  isAlreadyPaid: (o: DonHang) => boolean;
}> = ({ row, canConfirmOrder, canPayment, calculateWaitTime, onDetail, onConfirm, onCancel, onPay, isAlreadyPaid }) => {
  const s = getStatus(row.trangthai);
  return (
    <div style={{
      background: 'var(--color-deep-espresso)',
      border: '1px solid var(--color-dark-gray)',
      borderRadius: 8,
      padding: '12px 14px',
      marginBottom: 10,
    }}>
      {/* Bàn + Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ color: 'var(--color-off-white)', fontWeight: 600, fontSize: 15 }}>
          {row.tenban || '📦 Đơn mang đi'}
        </span>
        <span style={{
          display: 'inline-block', padding: '3px 10px', borderRadius: 20,
          fontSize: 11, fontWeight: 700, color: s.color, background: s.bg,
        }}>
          {s.icon} {s.label}
        </span>
      </div>

      {/* Tiền + Thời gian */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ color: 'var(--color-caramel)', fontWeight: 700, fontSize: 16 }}>
          {fmt(row.tongtien)}<span style={{ fontSize: 11, fontWeight: 400, marginLeft: 2 }}>đ</span>
        </span>
        <span style={{ color: 'var(--color-dark-gray)', fontSize: 12 }}>
          ⏱ {calculateWaitTime(row.thoigiantao)}
        </span>
      </div>

      {/* Nút hành động */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button
          label="Chi tiết" icon="pi pi-info-circle" size="small" severity="secondary"
          style={{ flex: 1, minWidth: 90, height: 38 }}
          onClick={() => onDetail(row)}
        />
        {row.trangthai === 'choxacnhan' && canConfirmOrder && (
          <>
            <Button
              label="Xác nhận" icon="pi pi-check" size="small" severity="success"
              style={{ flex: 1, minWidth: 90, height: 38 }}
              onClick={e => { e.stopPropagation(); onConfirm(row); }}
            />
            <Button
              label="Hủy" icon="pi pi-times" size="small" severity="danger"
              style={{ flex: 1, minWidth: 80, height: 38 }}
              onClick={e => { e.stopPropagation(); onCancel(row); }}
            />
          </>
        )}
        {canPayment && row.trangthai !== 'choxacnhan' && (
          <Button
            label="Thanh toán" icon="pi pi-credit-card" size="small"
            disabled={isAlreadyPaid(row)}
            style={{
              flex: 1, minWidth: 110, height: 38,
              background: isAlreadyPaid(row) ? undefined : 'var(--color-caramel)',
              border: 'none', color: '#000',
            }}
            onClick={e => { e.stopPropagation(); onPay(row.id); }}
          />
        )}
      </div>
    </div>
  );
};


const OrderList = () => {
  const [orders, setOrders] = useState<DonHang[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('dangphucvu');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({
    choxacnhan: 0, dangphucvu: 0, chothanhtoan: 0, dathanhtoan: 0,
  });
  const [hoveredStatus, setHoveredStatus] = useState<string | null>(null);
  const [detailDialog, setDetailDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<DonHang | null>(null);
  const [orderDetail, setOrderDetail] = useState<ChiTietMon[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [markingServed, setMarkingServed] = useState<number | null>(null);
  const toast = useRef<Toast>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const isPhucVu      = user?.vaitro === 'phucvu';
  const canPayment    = user?.vaitro === 'admin' || user?.vaitro === 'thungan';
  const canConfirmOrder = user?.vaitro === 'phucvu' || user?.vaitro === 'admin';

  useEffect(() => { setCurrentPage(1); }, [filterStatus]);
  useEffect(() => { fetchOrders(); }, [filterStatus, currentPage]);
  useEffect(() => { fetchStatusCounts(); }, []);

  const fetchStatusCounts = async () => {
    try {
      const statuses = STATUS_TABS.map(t => t.status);
      const results = await Promise.all(statuses.map(s => api.getOrders({ trangthai: s })));
      const counts = statuses.reduce((acc: Record<string, number>, s, i) => {
        const list = results[i].data?.data || [];
        acc[s] = Array.isArray(list) ? list.length : 0;
        return acc;
      }, {} as Record<string, number>);
      setStatusCounts(counts);
    } catch { /* ignore */ }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.getOrders({ page: currentPage, limit: ORDERS_PER_PAGE, trangthai: filterStatus });
      setOrders(res.data?.data || []);
      setTotalPages(res.data?.totalPages || 1);
    } catch {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải danh sách đơn hàng' });
    } finally { setLoading(false); }
  };

  const allItemsServed = (items: ChiTietMon[]) =>
    items.length > 0 && items.every(i => i.trangthai === 'daphucvu');

  const parseDbDateTime = (value?: string) => {
    if (!value) return new Date(NaN);
    let normalized = value;
    if (normalized.includes(' ') && !normalized.includes('T')) {
      normalized = normalized.replace(' ', 'T');
    }
    const parsed = new Date(normalized);
    if (!isNaN(parsed.getTime())) return parsed;
    return new Date(normalized.endsWith('Z') ? normalized : `${normalized}Z`);
  };

  const calculateWaitTime = (createdAt?: string) => {
    if (!createdAt) return '-';
    const min = Math.floor((Date.now() - parseDbDateTime(createdAt).getTime()) / 60000);
    return min > 0 ? `${min} phút` : 'Vừa đặt';
  };

  const openDetail = async (order: DonHang) => {
    setSelectedOrder(order); setDetailDialog(true);
    setOrderDetail([]); setLoadingDetail(true);
    try {
      const res = await api.getOrder(order.id);
      const detail = res.data?.data ?? res.data;
      const chitiet: ChiTietMon[] = detail.chitiet || [];
      setOrderDetail(chitiet);

      if (chitiet.length > 0 && allItemsServed(chitiet) && order.trangthai === 'dangphucvu') {
        await api.updateOrderStatus(order.id, 'chothanhtoan');
        const patch = (o: DonHang) => o.id === order.id ? { ...o, trangthai: 'chothanhtoan' } : o;
        setOrders(prev => prev.map(patch));
        setSelectedOrder(prev => prev ? { ...prev, trangthai: 'chothanhtoan' } : prev);
      }
    } catch {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải chi tiết' });
    } finally { setLoadingDetail(false); }
  };

  const markItemServed = async (item: ChiTietMon) => {
    if (item.trangthai !== 'sansang') return;
    setMarkingServed(item.id);
    try {
      await api.updateOrderItem(item.id, { trangthai: 'daphucvu' });
      const updated = orderDetail.map(i => i.id === item.id ? { ...i, trangthai: 'daphucvu' } : i);
      setOrderDetail(updated);

      if (selectedOrder && updated.every(i => i.trangthai === 'daphucvu')) {
        await api.updateOrderStatus(selectedOrder.id, 'chothanhtoan');
        const patch = (o: DonHang) => o.id === selectedOrder.id ? { ...o, trangthai: 'chothanhtoan' } : o;
        setOrders(prev => prev.map(patch));
        setSelectedOrder(prev => prev ? { ...prev, trangthai: 'chothanhtoan' } : prev);
        toast.current?.show({ severity: 'success', summary: 'Hoàn tất', detail: 'Tất cả món đã phục vụ — sẵn sàng thanh toán' });
      }
    } catch {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: 'Không thể cập nhật trạng thái món' });
    } finally { setMarkingServed(null); }
  };

  const handleSendToKitchen = async (orderId: number) => {
    try {
      const moiIds = orderDetail.filter(i => i.trangthai === 'moi').map(i => i.id);
      if (moiIds.length === 0) {
        toast.current?.show({ severity: 'warn', summary: 'Thông báo', detail: 'Không có món mới để gửi bếp' });
        return;
      }
      await api.sendToKitchen(orderId, moiIds);
      setOrderDetail(prev => prev.map(i => moiIds.includes(i.id) ? { ...i, trangthai: 'danglam' } : i));
      toast.current?.show({ severity: 'success', summary: 'Thành công', detail: `Gửi ${moiIds.length} món tới bếp` });
    } catch {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: 'Không thể gửi bếp' });
    }
  };

  const handleConfirmOrder = async (order: DonHang) => {
    try {
      await api.updateOrderStatus(order.id, 'dangphucvu');
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, trangthai: 'dangphucvu' } : o));
      toast.current?.show({ severity: 'success', summary: 'Xác nhận đơn', detail: `Đơn ${order.madon} đã xác nhận` });
    } catch {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: 'Không thể xác nhận đơn' });
    }
  };

  const handleCancelOrder = async (order: DonHang) => {
    try {
      await api.cancelOrder(order.id);
      setOrders(prev => prev.filter(o => o.id !== order.id));
      toast.current?.show({ severity: 'success', summary: 'Đã hủy', detail: `Đơn ${order.madon} đã hủy` });
    } catch {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: 'Không thể hủy đơn' });
    }
  };

  const goToPayment = (id: number) => { navigate(`/payment?orderId=${id}`); setDetailDialog(false); };
  const orderCanPay  = (o: DonHang) => o.trangthai === 'chothanhtoan' || allItemsServed(orderDetail);
  const isAlreadyPaid = (o: DonHang) => o.trangthai === 'daphucvu' || o.trangthai === 'dathanhtoan';

  //  Pagination ─
  const pageNumbers = (): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [1];
    if (currentPage > 3) pages.push('...');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++)
      pages.push(i);
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  const banBody = (row: DonHang) => (
    <span style={{ color: 'var(--color-off-white)', fontWeight: 600, fontSize: 14 }}>
      {row.tenban || '📦 Đơn mang đi'}
    </span>
  );
  const tongTienBody = (row: DonHang) => (
    <span style={{ color: 'var(--color-caramel)', fontWeight: 700, fontSize: 14 }}>
      {fmt(row.tongtien)}<span style={{ fontSize: 11, fontWeight: 400, marginLeft: 2 }}>đ</span>
    </span>
  );
  const statusBody = (row: DonHang) => {
    const s = getStatus(row.trangthai);
    return (
      <span style={{
        display: 'inline-block', padding: '3px 10px', borderRadius: 20,
        fontSize: 11, fontWeight: 700, color: s.color, background: s.bg,
      }}>
        {s.icon} {s.label}
      </span>
    );
  };
  const waitBody = (row: DonHang) => (
    <span style={{ color: 'var(--color-dark-gray)', fontSize: 12 }}>{calculateWaitTime(row.thoigiantao)}</span>
  );
  const actionBody = (row: DonHang) => (
    <div style={{ display: 'flex', gap: 6 }}>
      <Button icon="pi pi-info-circle" size="small" severity="secondary"
        tooltip="Chi tiết" onClick={() => openDetail(row)} />
      {row.trangthai === 'choxacnhan' && canConfirmOrder && (
        <>
          <Button icon="pi pi-check" size="small" severity="success"
            tooltip="Xác nhận đơn" onClick={e => { e.stopPropagation(); handleConfirmOrder(row); }} />
          <Button icon="pi pi-times" size="small" severity="danger"
            tooltip="Hủy đơn" onClick={e => { e.stopPropagation(); handleCancelOrder(row); }} />
        </>
      )}
      {canPayment && row.trangthai !== 'choxacnhan' && (
        <Button icon="pi pi-credit-card" size="small"
          tooltip="Thanh toán" disabled={isAlreadyPaid(row)}
          style={{
            background: isAlreadyPaid(row) ? undefined : 'var(--color-caramel)',
            border: 'none', color: '#000',
          }}
          onClick={e => { e.stopPropagation(); goToPayment(row.id); }} />
      )}
    </div>
  );

  //  Render 
  return (
    <div>
      <Toast ref={toast} />

      <div style={{ marginBottom: 16 }}>
        <div style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: 4,
          scrollbarWidth: 'none',
        }}>
          {STATUS_TABS.map(tab => {
            const active = tab.status === filterStatus;
            const hover  = tab.status === hoveredStatus;
            return (
              <button
                key={tab.status}
                type="button"
                onClick={() => setFilterStatus(tab.status)}
                onMouseEnter={() => setHoveredStatus(tab.status)}
                onMouseLeave={() => setHoveredStatus(null)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  flexShrink: 0,
                  padding: '10px 14px',
                  borderRadius: 999,
                  border: active ? '1px solid var(--color-caramel)' : '1px solid rgba(255,255,255,0.12)',
                  background: active ? 'var(--color-caramel)' : hover ? 'rgba(255,255,255,0.05)' : 'transparent',
                  color: active ? '#000' : '#fff',
                  cursor: 'pointer',
                  transition: 'background 0.2s, border-color 0.2s',
                  fontWeight: active ? 700 : 500,
                  fontSize: 13,
                  whiteSpace: 'nowrap',
                }}
              >
                <i className={tab.icon} />
                <span>{tab.label}</span>
                {statusCounts[tab.status] > 0 && (
                  <span style={{
                    display: 'inline-flex', justifyContent: 'center', alignItems: 'center',
                    minWidth: 20, height: 20, padding: '0 6px', borderRadius: 999,
                    background: active ? '#fff' : 'var(--color-caramel)',
                    color: '#000', fontWeight: 700, fontSize: 11,
                  }}>
                    {statusCounts[tab.status]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
          <Button icon="pi pi-refresh" size="small" severity="secondary"
            onClick={() => { fetchOrders(); fetchStatusCounts(); }} />
        </div>
      </div>

      {/*  Danh sách đơn  */}
      {isMobile ? (
        /* MOBILE: Card list */
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-dark-gray)' }}>Đang tải...</div>
          ) : orders.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: 40,
              color: 'var(--color-dark-gray)', fontSize: 14,
            }}>
              Không có đơn hàng nào
            </div>
          ) : (
            orders.map(row => (
              <OrderCard
                key={row.id}
                row={row}
                canConfirmOrder={canConfirmOrder}
                canPayment={canPayment}
                calculateWaitTime={calculateWaitTime}
                onDetail={openDetail}
                onConfirm={handleConfirmOrder}
                onCancel={handleCancelOrder}
                onPay={goToPayment}
                isAlreadyPaid={isAlreadyPaid}
              />
            ))
          )}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <DataTable value={orders} loading={loading} stripedRows size="small"
            emptyMessage="Không có đơn hàng nào">
            <Column header="Bàn"          body={banBody}      style={{ width: 100 }} />
            <Column header="Tổng tiền"    body={tongTienBody} style={{ width: 140 }} />
            <Column header="Trạng thái"   body={statusBody}   style={{ width: 200 }} />
            <Column header="Thời gian chờ" body={waitBody}   style={{ width: 130 }} />
            <Column header="Thao tác"     body={actionBody}   style={{ width: 160 }} />
          </DataTable>
        </div>
      )}

      {/*  Phân trang  */}
      {totalPages > 1 && (
        <div style={{
          marginTop: 14, paddingTop: 12,
          borderTop: '1px solid var(--color-dark-gray)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 8,
        }}>
          <span style={{ fontSize: 12, color: 'var(--color-dark-gray)' }}>
            Trang <span style={{ color: 'var(--color-off-white)' }}>{currentPage}</span> / {totalPages}
          </span>
          <div style={{ display: 'flex', gap: isMobile ? 6 : 4, alignItems: 'center', flexWrap: 'wrap' }}>
            {!isMobile && (
              <button onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1 || loading}
                style={pgBtn(false, currentPage === 1 || loading, isMobile)}>«</button>
            )}
            <button onClick={() => setCurrentPage(p => p - 1)}
              disabled={currentPage === 1 || loading}
              style={pgBtn(false, currentPage === 1 || loading, isMobile)}>‹</button>
            {pageNumbers().map((p, i) =>
              p === '...'
                ? <span key={`d${i}`} style={{ padding: '0 4px', color: '#444', fontSize: 13 }}>…</span>
                : <button key={p} onClick={() => setCurrentPage(p as number)}
                    disabled={loading}
                    style={pgBtn(p === currentPage, loading, isMobile)}>{p}</button>
            )}
            <button onClick={() => setCurrentPage(p => p + 1)}
              disabled={currentPage === totalPages || loading}
              style={pgBtn(false, currentPage === totalPages || loading, isMobile)}>›</button>
            {!isMobile && (
              <button onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || loading}
                style={pgBtn(false, currentPage === totalPages || loading, isMobile)}>»</button>
            )}
          </div>
        </div>
      )}

      {/*  Dialog chi tiết  */}
      {selectedOrder && (
        <Dialog
          header={
            <span style={{ color: 'var(--color-off-white)', fontSize: 15 }}>
              Chi tiết —{' '}
              <span style={{ color: 'var(--color-caramel)' }}>
                {selectedOrder.tenban ? `Bàn ${selectedOrder.tenban}` : '📦 Đơn mang đi'}
              </span>
            </span>
          }
          visible={detailDialog}
          // FIX: width responsive — tối đa 540px nhưng không vượt 95vw
          style={{ width: 'min(540px, 95vw)' }}
          onHide={() => setDetailDialog(false)}
          contentStyle={{ background: 'var(--color-deep-espresso)', padding: isMobile ? '12px 14px' : '16px 20px' }}
          headerStyle={{ background: 'var(--color-deep-espresso)', borderBottom: '1px solid var(--color-dark-gray)' }}
        >
          {/* Info strip */}
          {/* FIX: trên mobile đổi sang column để tránh text bị chen chật */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
            gap: isMobile ? 8 : 0,
            padding: '10px 14px',
            background: 'var(--color-deep-espresso)',
            border: '1px solid var(--color-dark-gray)',
            borderRadius: 4,
            marginBottom: 16,
          }}>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--color-dark-gray)' }}>
                Chờ: <span style={{ color: 'var(--color-off-white)' }}>{calculateWaitTime(selectedOrder.thoigiantao)}</span>
              </span>
              <span style={{ fontSize: 12, color: 'var(--color-dark-gray)' }}>
                Tổng: <span style={{ color: 'var(--color-caramel)', fontWeight: 700 }}>{fmt(selectedOrder.tongtien)}đ</span>
              </span>
            </div>
            <span style={{
              padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              color: getStatus(selectedOrder.trangthai).color,
              background: getStatus(selectedOrder.trangthai).bg,
              alignSelf: isMobile ? 'flex-start' : 'center',
            }}>
              {getStatus(selectedOrder.trangthai).icon} {getStatus(selectedOrder.trangthai).label}
            </span>
          </div>

          {/* Header danh sách món */}
          <div style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1, marginBottom: 8 }}>
            DANH SÁCH MÓN
            {!loadingDetail && orderDetail.length > 0 && (
              <span style={{ marginLeft: 8, color: 'var(--color-dark-gray)', fontWeight: 400, letterSpacing: 0, fontSize: 12 }}>
                ({orderDetail.filter(i => i.trangthai === 'daphucvu').length}/{orderDetail.length} đã phục vụ)
              </span>
            )}
            {isPhucVu && !loadingDetail && orderDetail.length > 0 && !allItemsServed(orderDetail) && (
              <span style={{ marginLeft: 12, color: 'var(--color-warning)', fontWeight: 400, letterSpacing: 0, fontSize: 11 }}>
                · Nhấn ✓ để đánh dấu từng món đã phục vụ
              </span>
            )}
          </div>

          {/* Danh sách món */}
          <div style={{ marginBottom: 14 }}>
            {loadingDetail ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--color-dark-gray)' }}>Đang tải...</div>
            ) : orderDetail.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--color-dark-gray)', fontSize: 13 }}>Không có dữ liệu</div>
            ) : (
              <>
                {orderDetail.map(item => {
                  const badge    = ITEM_STATUS[item.trangthai] ?? { color: 'var(--color-dark-gray)', label: item.trangthai };
                  const isServed = item.trangthai === 'daphucvu';
                  const isMarking = markingServed === item.id;
                  return (
                    <div key={item.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: isMobile ? '10px 10px' : '9px 12px',
                      marginBottom: 4, borderRadius: 4,
                      background: isServed ? '#0c1a10' : 'var(--color-deep-espresso)',
                      border: `1px solid ${isServed ? 'var(--color-success)' : 'var(--color-dark-gray)'}`,
                      transition: 'background 0.2s',
                      gap: 8,
                    }}>
                      {/* Tên + số lượng */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                        <span style={{
                          fontSize: 13, color: isServed ? '#86efac' : 'var(--color-off-white)',
                          textDecoration: isServed ? 'line-through' : 'none',
                          opacity: isServed ? 0.7 : 1,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {item.tenmon}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--color-dark-gray)' }}>
                          x{item.soluong} × {fmt(item.dongia)}đ
                        </span>
                      </div>

                      {/* Badge + Giá + Nút phục vụ */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        {!isMobile && (
                          <span style={{
                            padding: '2px 8px', borderRadius: 20,
                            // FIX: tăng font từ 10 → 12px
                            fontSize: 12, fontWeight: 700,
                            color: '#000', background: badge.color,
                          }}>
                            {badge.label}
                          </span>
                        )}
                        <span style={{ fontSize: 13, color: 'var(--color-caramel)', fontWeight: 700, minWidth: 64, textAlign: 'right' }}>
                          {fmt(item.thanhtien)}đ
                        </span>
                        {isPhucVu && item.trangthai === 'sansang' && (
                          <Button
                            icon={isMarking ? 'pi pi-spin pi-spinner' : 'pi pi-check'}
                            size="small"
                            disabled={isMarking}
                            tooltip="Đánh dấu đã phục vụ"
                            style={{
                              width: 36, height: 36, padding: 0,
                              background: 'var(--color-success)',
                              borderRadius: 4,
                            }}
                            onClick={() => markItemServed(item)}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Banner tóm tắt */}
                {(() => {
                  const served    = orderDetail.filter(i => i.trangthai === 'daphucvu').length;
                  const total     = orderDetail.length;
                  const allServed = allItemsServed(orderDetail);
                  return (
                    <div style={{
                      marginTop: 8, padding: '8px 12px', borderRadius: 4,
                      background: allServed ? '#0c1a10' : '#1a0f00',
                      border: `1px solid ${allServed ? 'var(--color-success)' : '#3a1f00'}`,
                      fontSize: 12, color: allServed ? 'var(--color-success)' : 'var(--color-warning)',
                    }}>
                      {allServed
                        ? `Tất cả ${total} món đã phục vụ — Sẵn sàng thanh toán`
                        : `${served}/${total} món đã phục vụ — còn ${total - served} chưa xong`
                      }
                    </div>
                  );
                })()}
              </>
            )}
          </div>

          {/* Nút hành động */}
          <div style={{
            display: 'flex', gap: 8,
            justifyContent: isMobile ? 'stretch' : 'flex-end',
            flexWrap: 'wrap',
          }}>
            <Button label="Đóng" severity="secondary" size="small"
              style={isMobile ? { flex: 1 } : {}}
              onClick={() => setDetailDialog(false)} />

            {selectedOrder.trangthai === 'dangphucvu' && (
              <Button
                label="Gửi bếp" icon="pi pi-send" size="small"
                disabled={loadingDetail || orderDetail.filter(i => i.trangthai === 'moi').length === 0}
                style={{
                  ...(isMobile ? { flex: 1 } : {}),
                  background: orderDetail.filter(i => i.trangthai === 'moi').length > 0
                    ? 'var(--color-warning)' : 'var(--color-dark-gray)',
                  border: 'none', color: '#fff',
                }}
                onClick={() => handleSendToKitchen(selectedOrder.id)}
              />
            )}

            {canPayment && !isAlreadyPaid(selectedOrder) && (
              <>
                {!orderCanPay(selectedOrder) && (
                  <span style={{
                    fontSize: 11, color: 'var(--color-warning)',
                    alignSelf: 'center',
                    flexBasis: isMobile ? '100%' : 'auto',
                  }}>
                    <i className="pi pi-exclamation-triangle" style={{ marginRight: 4 }} />
                    Còn món chưa phục vụ
                  </span>
                )}
                <Button
                  label="Chuyển thanh toán" icon="pi pi-credit-card" size="small"
                  disabled={loadingDetail || !orderCanPay(selectedOrder)}
                  style={{
                    ...(isMobile ? { flex: 1 } : {}),
                    background: !orderCanPay(selectedOrder) ? undefined : 'var(--color-caramel)',
                    border: 'none', color: '#000',
                  }}
                  onClick={() => goToPayment(selectedOrder.id)}
                />
              </>
            )}
          </div>
        </Dialog>
      )}
    </div>
  );
};

//  button style 
const pgBtn = (active: boolean, disabled: boolean, isMobile: boolean): React.CSSProperties => ({
  minWidth: isMobile ? 40 : 32,
  height: isMobile ? 44 : 30,
  padding: '0 8px',
  borderRadius: 4,
  border: active ? '1px solid var(--color-caramel)' : '1px solid #2e2e2e',
  background: 'var(--color-deep-espresso)',
  color: active ? '#000' : disabled ? 'var(--color-dark-gray)' : 'var(--color-text-secondary)',
  ...(active ? { background: 'var(--color-caramel)' } : {}),
  fontWeight: active ? 700 : 400,
  fontSize: 13,
  cursor: disabled ? 'not-allowed' : 'pointer',
});

export default OrderList;