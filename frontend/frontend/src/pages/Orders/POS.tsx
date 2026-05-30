// src/pages/Orders/POS.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { Dialog } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputNumber } from 'primereact/inputnumber';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import socketClient from '../../services/socketClient';
import { BienThe, MonAn, NhomMon, ChiTiet, DonHang } from '../../types/orders';

const trangThaiColor: Record<string, string> = {
  moi: 'var(--color-text-secondary)',
  danglam: 'var(--color-warning)',
  sansang: 'var(--color-success)',
  daphucvu: 'var(--color-info)',
};
const trangThaiLabel: Record<string, string> = {
  moi: 'Mới', danglam: 'Đang làm', sansang: 'Sẵn sàng', daphucvu: 'Đã phục vụ',
};

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
};

const POS = () => {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useRef<Toast>(null);
  const isMobile = useIsMobile();

  const [menu, setMenu] = useState<NhomMon[]>([]);
  const [order, setOrder] = useState<DonHang | null>(null);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  //tab đang hiển thị 'menu''order'
  const [mobilePanel, setMobilePanel] = useState<'menu' | 'order'>('menu');

  const [selectedBT, setSelectedBT] = useState<Record<number, Record<string, number>>>({});
  const [selectedQty, setSelectedQty] = useState<Record<number, number>>({});

  const [noteDialog, setNoteDialog] = useState(false);
  const [noteItem, setNoteItem] = useState<ChiTiet | null>(null);
  const [noteText, setNoteText] = useState('');

  const [createDialog, setCreateDialog] = useState(false);
  const [loaiDon, setLoaiDon] = useState<'taiban' | 'mangdi'>('taiban');
  const [creating, setCreating] = useState(false);

  const [pendingMon, setPendingMon] = useState<{ mon: MonAn; bts: number[]; qty: number } | null>(null);

  useEffect(() => {
    fetchAll();
    if (user?.id) socketClient.joinWaiterRoom(user.id);
    socketClient.onOrderUpdated(() => fetchOrder());
    socketClient.onTicketUpdated((data) => {
      fetchOrder();
      if (data?.data?.trangthai === 'sansang') {
        toast.current?.show({
          severity: 'success', summary: '🔔 Món sẵn sàng!',
          detail: `${data.data.tenmon} - ${data.data.tenban} đã sẵn sàng phục vụ!`, life: 5000,
        });
      }
    });
    socketClient.onTableUpdated(() => fetchOrder());
    return () => { socketClient.removeAllListeners(); };
  }, [tableId, user?.id]);

  useEffect(() => {
    if (order && pendingMon) {
      addItem(pendingMon.mon, pendingMon.bts, pendingMon.qty);
      setPendingMon(null);
    }
  }, [order]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchMenuWithBienThe(), fetchOrder()]);
    } finally { setLoading(false); }
  };

  const fetchMenuWithBienThe = async () => {
    const res = await api.getMenuByCategory();
    const rawMenu: NhomMon[] = res.data.data || [];
    const menuWithBT = await Promise.all(
      rawMenu.map(async (nhom) => ({
        ...nhom,
        monan: await Promise.all(
          nhom.monan.map(async (mon) => {
            try {
              const btRes = await api.getMenuItem(mon.id);
              return { ...mon, bienthe: btRes.data.data?.bienthe || [] };
            } catch { return { ...mon, bienthe: [] }; }
          })
        ),
      }))
    );
    setMenu(menuWithBT);
  };

  const fetchOrder = async () => {
    if (!tableId && !order?.id) return;
    try {
      if (tableId) {
        const res = await api.getOrderByTable(Number(tableId));
        setOrder(res.data.data);
      } else if (order?.id) {
        const res = await api.getOrder(order.id);
        setOrder(res.data.data);
      }
    } catch { setOrder(null); }
  };

  const toggleBienThe = (monanid: number, loai: string, btheid: number) => {
    setSelectedBT(prev => {
      const monBT = prev[monanid] || {};
      const newMonBT = monBT[loai] === btheid
        ? { ...monBT, [loai]: 0 }
        : { ...monBT, [loai]: btheid };
      return { ...prev, [monanid]: newMonBT };
    });
  };

  const getSelectedBTIds = (monanid: number): number[] => {
    const monBT = selectedBT[monanid] || {};
    return Object.values(monBT).filter(id => id > 0);
  };

  const handleAddItem = async (mon: MonAn) => {
    const btIds = getSelectedBTIds(mon.id);
    const qty = selectedQty[mon.id] || 1;
    if (!order) {
      setPendingMon({ mon, bts: btIds, qty });
      setCreateDialog(true);
      return;
    }
    await addItem(mon, btIds, qty);
  };

  const addItem = async (mon: MonAn, bts: number[], qty: number = 1) => {
    if (!order) return;
    try {
      await api.addItemToOrder(order.id, {
        monanid: mon.id,
        soluong: qty,
        dongia: Number(mon.giaban),
        bienthe: bts,
      });
      fetchOrder();
      setSelectedBT(prev => ({ ...prev, [mon.id]: {} }));
      setSelectedQty(prev => ({ ...prev, [mon.id]: 1 }));
      toast.current?.show({ severity: 'success', summary: 'Đã thêm', detail: mon.tenmon, life: 1500 });
    } catch (e: any) {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: e.response?.data?.message });
    }
  };

  const handleCreateOrder = async () => {
    if (loaiDon === 'taiban' && !tableId) {
      toast.current?.show({ severity: 'warn', summary: 'Lỗi', detail: 'Không xác định bàn để tạo đơn tại bàn' });
      return;
    }
    setCreating(true);
    try {
      const payload: any = { loai: loaiDon };
      if (loaiDon === 'taiban') payload.banid = Number(tableId);
      const res = await api.createOrder(payload);
      setOrder(res.data.data);
      setCreateDialog(false);
      toast.current?.show({ severity: 'success', summary: 'Thành công', detail: 'Đã tạo đơn hàng' });
    } catch (e: any) {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: e.response?.data?.message });
    } finally { setCreating(false); }
  };

  const handleQty = async (item: ChiTiet, delta: number) => {
    const newQty = Number(item.soluong) + delta;
    if (newQty <= 0) { handleDeleteItem(item); return; }
    try { await api.updateOrderItem(item.id, { soluong: newQty }); fetchOrder(); }
    catch (e: any) { toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: e.response?.data?.message }); }
  };

  const handleDeleteItem = async (item: ChiTiet) => {
    try { await api.deleteOrderItem(item.id); fetchOrder(); }
    catch (e: any) { toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: e.response?.data?.message }); }
  };

  const handleServed = async (item: ChiTiet) => {
    try {
      await api.updateOrderItem(item.id, { trangthai: 'daphucvu' });
      try {
        const res = await api.getKitchenTickets();
        const tickets = res.data?.data || [];
        const related = tickets.filter((t: any) => t.chitietdonhangid === item.id);
        for (const t of related) {
          try { await api.markAsServed(t.id); } catch (e) { /* ignore individual failures */ }
        }
      } catch (e) { /* ignore */ }

      fetchOrder();
      toast.current?.show({ severity: 'info', summary: 'Đã phục vụ', detail: item.tenmon, life: 2000 });
    } catch (e: any) { toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: e.response?.data?.message }); }
  };

  const openNote = (item: ChiTiet) => { setNoteItem(item); setNoteText(item.ghichu || ''); setNoteDialog(true); };
  const saveNote = async () => {
    if (!noteItem) return;
    try { await api.updateOrderItem(noteItem.id, { ghichu: noteText }); fetchOrder(); setNoteDialog(false); }
    catch (e: any) { toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: e.response?.data?.message }); }
  };

  const handleSendToKitchen = async () => {
    if (!order) return;
    const moiIds = order.chitiet.filter(c => c.trangthai === 'moi').map(c => c.id);
    if (moiIds.length === 0) {
      toast.current?.show({ severity: 'warn', summary: 'Không có món mới', detail: 'Tất cả món đã gửi bếp' });
      return;
    }
    setSending(true);
    try {
      await api.sendToKitchen(order.id, moiIds);
      fetchOrder();
      toast.current?.show({ severity: 'success', summary: 'Đã gửi bếp', detail: `${moiIds.length} món` });
    } catch (e: any) {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: e.response?.data?.message });
    } finally { setSending(false); }
  };

  const handlePayment = () => { if (order) navigate(`/payment?orderId=${order.id}`); };

  const tongtien = order?.chitiet?.reduce((s, c) => s + Number(c.thanhtien), 0) || 0;
  const soMonMoi = order?.chitiet?.filter(c => c.trangthai === 'moi').length || 0;

  const groupBienThe = (list: BienThe[]) =>
    list.reduce((acc, bt) => {
      if (!acc[bt.loai]) acc[bt.loai] = [];
      acc[bt.loai].push(bt);
      return acc;
    }, {} as Record<string, BienThe[]>);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, color: 'var(--color-caramel)' }}>
      Đang tải...
    </div>
  );

  // Menu dùng chung
  const renderMenu = () => (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--color-deep-espresso)',
      border: '1px solid var(--color-dark-gray)',
      overflow: 'hidden',
      minHeight: 0,
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--color-dark-gray)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexShrink: 0,
      }}>
        <div style={{ color: 'var(--color-caramel)', fontSize: 11, letterSpacing: 2 }}>THỰC ĐƠN</div>
        {!isMobile && (
          <Button icon="pi pi-arrow-left" size="small" severity="secondary"
            label="Quay lại" onClick={() => navigate('/tables')} />
        )}
      </div>

      {/* Tab nhóm scroll ngang  */}
      <div style={{
        display: 'flex',
        gap: 4,
        padding: '8px 10px',
        borderBottom: '1px solid var(--color-dark-gray)',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        flexShrink: 0,
      }}>
        {menu.map((nhom, i) => (
          <button key={nhom.nhommonid} onClick={() => setActiveTab(i)}
            style={{
              flexShrink: 0,
              padding: '6px 14px',
              fontSize: 12,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              background: activeTab === i ? 'var(--color-caramel)' : 'transparent',
              color: activeTab === i ? '#000' : 'var(--color-text-secondary)',
              border: `1px solid ${activeTab === i ? 'var(--color-caramel)' : 'var(--color-dark-gray)'}`,
              borderRadius: 2,
              minHeight: 36,
            }}>
            {nhom.tennhom}
          </button>
        ))}
      </div>

      {/* Grid món  */}
      <div style={{ flex: 1, overflow: 'auto', padding: 10 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 8,
        }}>
          {(menu[activeTab]?.monan || []).map(mon => {
            const bientheList = mon.bienthe || [];
            const groups = groupBienThe(bientheList);
            const monBT = selectedBT[mon.id] || {};
            const hasSelected = Object.values(monBT).some(id => id > 0);

            return (
              <div key={mon.id}
                style={{
                  background: 'var(--color-deep-espresso)',
                  border: '1px solid var(--color-dark-gray)',
                  padding: 10,
                  transition: 'border-color 0.15s',
                  cursor: 'default',
                  borderRadius: 4,
                }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-caramel)'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-dark-gray)'}>

                <div style={{
                  fontSize: 13, color: 'var(--color-off-white)',
                  marginBottom: 2, lineHeight: 1.3, fontWeight: 500,
                }}>
                  {mon.tenmon}
                </div>

                <div style={{
                  fontSize: 10,
                  color: mon.khuvucchebien === 'bar' ? 'var(--color-info)' : 'var(--color-warning)',
                  marginBottom: 5,
                }}>
                  {mon.khuvucchebien === 'bar' ? '● BAR' : '● BẾP'}
                </div>

                <div style={{ fontSize: 13, color: 'var(--color-caramel)', fontWeight: 600, marginBottom: 8 }}>
                  {Number(mon.giaban).toLocaleString('vi-VN')}đ
                </div>

                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                    Số lượng:
                  </label>
                  <InputNumber
                    value={selectedQty[mon.id] || 1}
                    onValueChange={(e) => setSelectedQty(prev => ({ ...prev, [mon.id]: e.value || 1 }))}
                    min={1}
                    size={3}
                    style={{ width: '100%', fontSize: 12 }}
                  />
                </div>

                {Object.entries(groups).map(([loai, list]) => (
                  <div key={loai} style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {list.map(bt => {
                        const isSelected = monBT[loai] === bt.id;
                        return (
                          <button key={bt.id}
                            onClick={e => { e.stopPropagation(); toggleBienThe(mon.id, loai, bt.id); }}
                            style={{
                              padding: '4px 8px',
                              fontSize: 11,
                              cursor: 'pointer',
                              minHeight: 30,
                              background: isSelected ? 'var(--color-caramel)' : 'transparent',
                              color: isSelected ? '#000' : 'var(--color-text-secondary)',
                              border: `1px solid ${isSelected ? 'var(--color-caramel)' : 'var(--color-dark-gray)'}`,
                              borderRadius: 2,
                              fontWeight: isSelected ? 700 : 400,
                              transition: 'all 0.15s',
                            }}>
                            {bt.tenbienthe}
                            {bt.giathem > 0 && (
                              <span style={{ fontSize: 9, marginLeft: 3, opacity: 0.8 }}>
                                +{Number(bt.giathem).toLocaleString('vi-VN')}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Nút thêm */}
                <button
                  onClick={() => handleAddItem(mon)}
                  style={{
                    marginTop: bientheList.length > 0 ? 6 : 0,
                    width: '100%',
                    padding: '8px 0',
                    cursor: 'pointer',
                    background: hasSelected ? 'var(--color-caramel)' : 'var(--color-deep-espresso)',
                    color: hasSelected ? '#000' : 'var(--color-text-secondary)',
                    border: `1px solid ${hasSelected ? 'var(--color-caramel)' : 'var(--color-dark-gray)'}`,
                    fontSize: 12,
                    fontWeight: hasSelected ? 700 : 400,
                    borderRadius: 2,
                    transition: 'all 0.15s',
                  }}>
                  {bientheList.length > 0
                    ? hasSelected ? '+ Thêm vào đơn' : '+ Thêm'
                    : '+ Thêm'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // Panel Order
  const renderOrder = () => (
    <div style={{
      width: isMobile ? '100%' : 340,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--color-deep-espresso)',
      border: '1px solid var(--color-dark-gray)',
      overflow: 'hidden',
      minHeight: 0,
    }}>
      {/* Header đơn */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-dark-gray)', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: 'var(--color-caramel)', fontSize: 11, letterSpacing: 2 }}>
            {order ? `ĐƠN - ${order.madon}` : 'CHƯA CÓ ĐƠN'}
          </div>
          {order && <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>{order.tenban}</span>}
        </div>
        {!order && (
          <Button label="Tạo đơn mới" icon="pi pi-plus" size="small"
            style={{ marginTop: 8, width: '100%', background: 'var(--color-burnt-orange)', border: 'none', color: '#f5f5f5' }}
            onClick={() => setCreateDialog(true)} />
        )}
      </div>

      {/* Danh sách món trong đơn */}
      <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
        {!order || order.chitiet?.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#444', fontSize: 12, marginTop: 40 }}>Chưa có món nào</div>
        ) : (
          order.chitiet.map(item => (
            <div key={item.id} style={{
              background: 'var(--color-deep-espresso)',
              border: '1px solid var(--color-dark-gray)',
              padding: isMobile ? '10px 12px' : '8px 10px',
              marginBottom: 6,
              borderLeft: `3px solid ${trangThaiColor[item.trangthai] || 'var(--color-text-secondary)'}`,
              borderRadius: 2,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, color: 'var(--color-off-white)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {item.tenmon}
                  </div>
                  {item.bienthe && item.bienthe.length > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--color-caramel)', marginTop: 2 }}>
                      {item.bienthe.map(bt => bt.tenbienthe).join(' + ')}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: trangThaiColor[item.trangthai], marginTop: 2 }}>
                    {trangThaiLabel[item.trangthai]}
                  </div>
                  {item.ghichu && (
                    <div style={{ fontSize: 10, color: 'var(--color-dark-gray)', marginTop: 2, fontStyle: 'italic' }}>
                      {item.ghichu}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-caramel)', flexShrink: 0 }}>
                  {Number(item.thanhtien).toLocaleString('vi-VN')}đ
                </div>
              </div>

              {/* Thao tác theo trạng thái */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {item.trangthai === 'moi' && (
                  <>
                    <button onClick={() => handleQty(item, -1)}
                      style={{
                        width: 36, height: 36,
                        background: 'var(--color-dark-gray)',
                        border: '1px solid var(--color-dark-gray)',
                        color: 'var(--color-off-white)',
                        cursor: 'pointer', fontSize: 16,
                        borderRadius: 2,
                      }}>−</button>
                    <span style={{ color: 'var(--color-off-white)', fontSize: 13, minWidth: 24, textAlign: 'center' }}>
                      {item.soluong}
                    </span>
                    <button onClick={() => handleQty(item, 1)}
                      style={{
                        width: 36, height: 36,
                        background: 'var(--color-dark-gray)',
                        border: '1px solid var(--color-dark-gray)',
                        color: 'var(--color-off-white)',
                        cursor: 'pointer', fontSize: 16,
                        borderRadius: 2,
                      }}>+</button>
                    {/* nút ghi chú  */}
                    <button onClick={() => openNote(item)}
                      style={{
                        marginLeft: 4, width: 36, height: 36,
                        background: 'none', border: '1px solid var(--color-dark-gray)',
                        color: 'var(--color-text-secondary)', cursor: 'pointer',
                        borderRadius: 2,
                      }}>
                      <i className="pi pi-pencil" style={{ fontSize: 13 }} />
                    </button>
                    <button onClick={() => handleDeleteItem(item)}
                      style={{
                        marginLeft: 'auto', width: 36, height: 36,
                        background: 'none', border: '1px solid var(--color-dark-gray)',
                        color: 'var(--color-error)', cursor: 'pointer',
                        borderRadius: 2,
                      }}>
                      <i className="pi pi-trash" style={{ fontSize: 13 }} />
                    </button>
                  </>
                )}
                {item.trangthai === 'danglam' && (
                  <span style={{ fontSize: 12, color: 'var(--color-warning)' }}>
                    🔥 Đang chế biến... SL: {item.soluong}
                  </span>
                )}
                {item.trangthai === 'sansang' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                    <span style={{ fontSize: 12, color: 'var(--color-success)', flex: 1 }}>
                      ✓ Sẵn sàng - SL: {item.soluong}
                    </span>
                    <button onClick={() => handleServed(item)}
                      style={{
                        padding: '6px 12px', height: 36,
                        background: 'var(--color-success)', border: 'none',
                        color: '#000', fontSize: 12, cursor: 'pointer', fontWeight: 700,
                        borderRadius: 2,
                      }}>
                      Đã phục vụ
                    </button>
                  </div>
                )}
                {item.trangthai === 'daphucvu' && (
                  <span style={{ fontSize: 12, color: 'var(--color-info)' }}>
                    ✓ Đã phục vụ - SL: {item.soluong}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* tổng tiền + nút hành động */}
      {order && (
        <div style={{ padding: 12, borderTop: '1px solid var(--color-dark-gray)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Tổng tiền:</span>
            <span style={{ fontSize: 16, color: 'var(--color-caramel)', fontWeight: 500 }}>
              {tongtien.toLocaleString('vi-VN')}đ
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              label={`Gửi bếp${soMonMoi > 0 ? ` (${soMonMoi})` : ''}`}
              icon="pi pi-send" size="small" loading={sending} disabled={soMonMoi === 0}
              style={{
                flex: 1,
                height: isMobile ? 44 : 36,
                background: soMonMoi > 0 ? 'var(--color-warning)' : 'var(--color-dark-gray)',
                border: 'none',
                color: soMonMoi > 0 ? '#fff' : 'var(--color-dark-gray)',
              }}
              onClick={handleSendToKitchen}
            />
            <Button
              label="Thanh toán" icon="pi pi-credit-card" size="small"
              style={{
                flex: 1,
                height: isMobile ? 44 : 36,
                background: 'var(--color-burnt-orange)', border: 'none', color: '#f5f5f5',
              }}
              onClick={handlePayment}
            />
          </div>
        </div>
      )}
    </div>
  );

  const orderCount = order?.chitiet?.length || 0;

  return (
    <div style={{
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? 0 : 16,
      height: isMobile ? 'calc(100dvh - 56px)' : 'calc(100vh - 100px)',
      paddingBottom: isMobile ? 56 : 0,
      boxSizing: 'border-box',
    }}>
      <Toast ref={toast} />

      {!isMobile && (
        <>
          {renderMenu()}
          {renderOrder()}
        </>
      )}
      {/* chỉ hiển thị 1 panel theo tab */}
      {isMobile && (
        <>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {mobilePanel === 'menu' ? renderMenu() : renderOrder()}
          </div>

          <div style={{
            position: 'fixed',
            bottom: 0, left: 0, right: 0,
            height: 56,
            display: 'flex',
            borderTop: '1px solid var(--color-dark-gray)',
            background: 'var(--color-deep-espresso)',
            zIndex: 100,
          }}>
            {/* Nút Quay lại */}
            <button
              onClick={() => navigate('/tables')}
              style={{
                width: 56, height: 56,
                background: 'none',
                border: 'none',
                borderRight: '1px solid var(--color-dark-gray)',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              <i className="pi pi-arrow-left" style={{ fontSize: 18 }} />
            </button>

            {/* Tab Thực đơn */}
            <button 
              onClick={() => setMobilePanel('menu')}
              style={{
                flex: 1, height: 56,
                background: mobilePanel === 'menu' ? 'rgba(255,255,255,0.06)' : 'none',
                border: 'none',
                borderRight: '1px solid var(--color-dark-gray)',
                color: mobilePanel === 'menu' ? 'var(--color-caramel)' : 'var(--color-text-secondary)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                fontSize: 13, fontWeight: mobilePanel === 'menu' ? 700 : 400,
              }}>
              <i className="pi pi-th-large" style={{ fontSize: 16 }} />
              Thực đơn
            </button>

            <button
              onClick={() => setMobilePanel('order')}
              style={{
                flex: 1, height: 56,
                background: mobilePanel === 'order' ? 'rgba(255,255,255,0.06)' : 'none',
                border: 'none',
                color: mobilePanel === 'order' ? 'var(--color-caramel)' : 'var(--color-text-secondary)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                fontSize: 13, fontWeight: mobilePanel === 'order' ? 700 : 400,
                position: 'relative',
              }}>
              <i className="pi pi-shopping-cart" style={{ fontSize: 16 }} />
              Đơn hàng
              {orderCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: 8, right: 'calc(50% - 32px)',
                  minWidth: 18, height: 18,
                  background: 'var(--color-caramel)',
                  color: '#000',
                  borderRadius: 999,
                  fontSize: 10, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px',
                }}>
                  {orderCount}
                </span>
              )}
            </button>
          </div>
        </>
      )}

      {/* DIALOG TẠO ĐƠN */}
      <Dialog
        header="Tạo đơn hàng mới"
        visible={createDialog}
        style={{ width: 'min(320px, 92vw)' }}
        onHide={() => { setCreateDialog(false); setPendingMon(null); }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Loại đơn hàng:</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[{ label: 'Tại bàn', value: 'taiban' }, { label: 'Mang đi', value: 'mangdi' }].map(opt => (
              <button key={opt.value} onClick={() => setLoaiDon(opt.value as any)}
                style={{
                  flex: 1,
                  padding: '12px 0',
                  cursor: 'pointer',
                  background: loaiDon === opt.value ? 'var(--color-caramel)' : 'transparent',
                  border: `1px solid ${loaiDon === opt.value ? 'var(--color-caramel)' : 'var(--color-dark-gray)'}`,
                  color: loaiDon === opt.value ? '#000' : 'var(--color-text-secondary)',
                  fontSize: 14, borderRadius: 4,
                }}>
                {opt.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button label="Hủy" severity="secondary" size="small"
              style={{ height: 40 }}
              onClick={() => { setCreateDialog(false); setPendingMon(null); }} />
            <Button label="Tạo đơn" size="small" loading={creating}
              style={{ background: 'var(--color-burnt-orange)', border: 'none', color: '#f5f5f5', height: 40 }}
              onClick={handleCreateOrder} />
          </div>
        </div>
      </Dialog>

      {/* DIALOG GHI CHÚ */}
      <Dialog
        header="Ghi chú món"
        visible={noteDialog}
        style={{ width: 'min(320px, 92vw)' }}
        onHide={() => setNoteDialog(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8 }}>
          <div style={{ fontSize: 13, color: 'var(--color-caramel)' }}>{noteItem?.tenmon}</div>
          <InputTextarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            rows={3}
            placeholder="Ghi chú cho món ăn..."
            className="w-full"
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button label="Hủy" severity="secondary" size="small"
              style={{ height: 40 }}
              onClick={() => setNoteDialog(false)} />
            <Button label="Lưu" size="small"
              style={{ background: 'var(--color-burnt-orange)', border: 'none', color: '#f5f5f5', height: 40 }}
              onClick={saveNote} />
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default POS;