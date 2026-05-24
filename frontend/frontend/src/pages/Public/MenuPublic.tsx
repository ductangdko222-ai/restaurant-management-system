import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import { Toast } from 'primereact/toast';
import { Tag } from 'primereact/tag';
import api from '../../services/api';
import socketClient from '../../services/socketClient';
import { BienThe, MonAn, NhomMon, GioHang } from '../../types/menu-public';
import { Table } from '../../types/tables';

const fmt = (n: number) => Number(n).toLocaleString('vi-VN');

const getImageUrl = (path?: string) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const base = process.env.REACT_APP_API_URL?.replace(/\/api\/?$/i, '') || window.location.origin;
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
};

const MenuPublic = () => {
  const { tableId } = useParams<{ tableId?: string }>();
  const toast = useRef<Toast>(null);
  
  const [menu, setMenu] = useState<NhomMon[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeNhom, setActiveNhom] = useState<number>(0);
  const [search, setSearch] = useState('');
  
  // Giỏ hàng
  const [gioHang, setGioHang] = useState<GioHang[]>([]);
  
  // Chi tiết món
  const [showDetail, setShowDetail] = useState<MonAn | null>(null);
  const [detailBT, setDetailBT] = useState<BienThe[]>([]);
  const [detailGhiChu, setDetailGhiChu] = useState('');
  
  // Bàn & đơn hàng
  const [tableInfo, setTableInfo] = useState<Table | null>(null);
  const [tableStatus, setTableStatus] = useState<'trong' | 'cokhach' | 'dattruoc' | null>(null);
  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCart, setShowCart] = useState(false);

  const orderStatusLabel = (status?: string) => {
    switch (status) {
      case 'choxacnhan':
        return 'Chờ xác nhận';
      case 'dangphucvu':
        return 'Đang xử lý';
      case 'chothanhtoan':
        return 'Chờ thanh toán';
      case 'dathanhtoan':
        return 'Đã thanh toán';
      case 'dahuy':
        return 'Đã hủy';
      default:
        return 'Đang xử lý';
    }
  };

  useEffect(() => {
    fetchMenu();
    if (tableId) {
      fetchTableInfo();
      fetchActiveOrder();
    }
    return () => {
      if (tableId) socketClient.disconnectSocket();
    };
  }, [tableId]);

  const fetchMenu = async () => {
    try {
      const res = await api.getPublicMenuByCategory();
      setMenu(res.data.data || []);
    } catch {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải thực đơn' });
    } finally { setLoading(false); }
  };

  const fetchTableInfo = async () => {
    if (!tableId) return;
    try {
      const res = await api.getPublicTableById(Number(tableId));
      setTableInfo(res.data.data);
      setTableStatus(res.data.data.trangthai);
    } catch {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải thông tin bàn' });
    }
  };

  const fetchActiveOrder = async () => {
    if (!tableId) {
      setActiveOrder(null);
      return;
    }
    try {
      const res = await api.getPublicOrderByTable(Number(tableId));
      setActiveOrder(res.data.data || null);
    } catch {
      setActiveOrder(null);
    }
  };

  // Lọc món theo search
  const filteredMenu = menu.map(nhom => ({
    ...nhom,
    monan: nhom.monan.filter(m =>
      m.tenmon.toLowerCase().includes(search.toLowerCase()) &&
      m.trangthai === 'dangban'
    ),
  })).filter(nhom => nhom.monan.length > 0);

  const displayMenu = search ? filteredMenu : menu.map(n => ({ ...n, monan: n.monan.filter(m => m.trangthai === 'dangban') })).filter(n => n.monan.length > 0);

  const openDetail = async (mon: MonAn) => {
    setDetailBT([]);
    setDetailGhiChu('');
    setShowDetail(mon);
    try {
      const res = await api.getPublicMenuItem(mon.id);
      setShowDetail({ ...mon, bienthe: res.data.data?.bienthe || [] });
    } catch {}
  };

  const toggleBT = (bt: BienThe) => {
    setDetailBT(prev =>
      prev.find(b => b.id === bt.id) ? prev.filter(b => b.id !== bt.id) : [...prev, bt]
    );
  };

  const addToCart = (mon: MonAn, bts: BienThe[], ghichu: string) => {
    setGioHang(prev => {
      const exist = prev.findIndex(g => g.mon.id === mon.id && JSON.stringify(g.bienthe.map(b=>b.id).sort()) === JSON.stringify(bts.map(b=>b.id).sort()));
      if (exist >= 0) {
        const next = [...prev];
        next[exist] = { ...next[exist], soluong: next[exist].soluong + 1 };
        return next;
      }
      return [...prev, { mon, soluong: 1, bienthe: bts, ghichu }];
    });
    setShowDetail(null);
    toast.current?.show({ severity: 'success', summary: 'Đã thêm', detail: mon.tenmon, life: 1500 });
  };

  const updateQty = (idx: number, delta: number) => {
    setGioHang(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], soluong: next[idx].soluong + delta };
      return next.filter(g => g.soluong > 0);
    });
  };

  const handleOrder = async () => {
    if (!tableId || gioHang.length === 0) return;
    setIsSubmitting(true);
    const payloads = gioHang.map(g => ({
      monanid: g.mon.id,
      soluong: g.soluong,
      dongia: Number(g.mon.giaban) + g.bienthe.reduce((a, b) => a + Number(b.giathem), 0),
      ghichu: g.ghichu,
      bienthe: g.bienthe.map(b => b.id)
    }));

    try {
      let order = activeOrder;
      const createdNewOrder = !order;

      if (!order) {
        const res = await api.createPublicOrder({
          loai: 'taiban',
          banid: Number(tableId),
          chitiet: payloads
        });
        order = res.data.data;
      }

      if (!order?.id) {
        throw new Error('Không thể xác định đơn hàng');
      }

      if (!createdNewOrder) {
        for (const item of payloads) {
          await api.addItemToPublicOrder(order.id, item);
        }
      }

      await fetchActiveOrder();
      await fetchTableInfo();
      setGioHang([]);
      toast.current?.show({
        severity: 'success',
        summary: createdNewOrder ? 'Tạo đơn thành công' : 'Thêm món vào đơn cũ',
        detail: `Mã đơn: ${order.madon}`
      });
    } catch (error: any) {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: error.response?.data?.message || error.message || 'Đặt hàng thất bại' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const detailTong = showDetail
    ? Number(showDetail.giaban) + detailBT.reduce((s, b) => s + Number(b.giathem), 0)
    : 0;

  const tongTien = gioHang.reduce((s, g) => s + (Number(g.mon.giaban) + g.bienthe.reduce((a, b) => a + Number(b.giathem), 0)) * g.soluong, 0);
  const tongMon = gioHang.reduce((s, g) => s + g.soluong, 0);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, color: 'var(--color-caramel)' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="inline-flex align-items-center justify-content-center mb-3"
          style={{ width: 56, height: 56, border: '1px solid var(--color-caramel)', transform: 'rotate(45deg)', margin: '0 auto 12px' }}>
          <i className="pi pi-home" style={{ color: 'var(--color-caramel)', fontSize: '1.5rem', transform: 'rotate(-45deg)' }} />
        </div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: 'var(--color-off-white)', letterSpacing: 3, marginBottom: 8 }}>
          DCOFFE
        </div>
        <div style={{ color: 'var(--color-text-secondary)' }}>Đang tải thực đơn...</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-deep-espresso)' }}>
      <Toast ref={toast} />

      {/*  HEADER  */}
      <header style={{
        background: 'var(--color-deep-espresso)', borderBottom: '1px solid var(--color-dark-gray)',
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
        padding: '16px 20px',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="inline-flex align-items-center justify-content-center"
                style={{ width: 56, height: 56, border: '1px solid var(--color-caramel)', transform: 'rotate(45deg)', marginRight: 12 }}>
                <i className="pi pi-home" style={{ color: 'var(--color-caramel)', fontSize: '1.25rem', transform: 'rotate(-45deg)' }} />
              </div>
              <div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: 'var(--color-off-white)', letterSpacing: 4, margin: 0, fontWeight: 400 }}>
                  DCOFFE
                </div>
                <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', letterSpacing: 5, textTransform: 'uppercase' }}>
                  {tableInfo ? `Bàn ${tableInfo.tenban}` : 'Thực đơn'}
                </div>
              </div>
            </div>

            {/* Search */}
            <div style={{ position: 'relative', flex: 1, maxWidth: 340, margin: '0 20px' }}>
              <i className="pi pi-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-dark-gray)', fontSize: 14 }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm món..."
                style={{
                  width: '100%', padding: '10px 12px 10px 36px', borderRadius: 6,
                  border: '1px solid var(--color-dark-gray)', background: 'var(--color-deep-espresso)', color: 'var(--color-off-white)',
                  fontSize: 14, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Giỏ hàng */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {activeOrder && (
                <div style={{ fontSize: 12, color: 'var(--color-success)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="pi pi-check-circle" />
                    Đơn: {activeOrder.madon}
                  </span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    {orderStatusLabel(activeOrder.trangthai)}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowCart(prev => !prev)}
                style={{
                  position: 'relative', background: 'var(--color-caramel)', border: 'none',
                  borderRadius: 6, padding: '10px 16px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8, color: '#000',
                  fontSize: 14, fontWeight: 600,
                }}>
                <i className="pi pi-shopping-cart" />
                {showCart ? 'Đóng giỏ' : `Giỏ (${tongMon})`}
                {tongMon > 0 && (
                  <span style={{
                    position: 'absolute', top: -6, right: -6,
                    background: 'var(--color-error)', color: '#fff', borderRadius: '50%',
                    width: 20, height: 20, fontSize: 10, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {tongMon}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Tab nhóm */}
          {!search && (
            <div style={{ display: 'flex', gap: 0, overflowX: 'auto', paddingBottom: 0, scrollbarWidth: 'none' }}>
              {displayMenu.map((nhom, i) => (
                <button key={nhom.nhommonid} onClick={() => setActiveNhom(i)}
                  style={{
                    padding: '8px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
                    fontSize: 13, fontWeight: activeNhom === i ? 600 : 400,
                    color: activeNhom === i ? 'var(--color-caramel)' : 'var(--color-text-secondary)',
                    borderBottom: activeNhom === i ? '2px solid var(--color-caramel)' : '2px solid transparent',
                    whiteSpace: 'nowrap', transition: 'all 0.2s',
                  }}>
                  {nhom.tennhom}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/*  MAIN LAYOUT  */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '20px', display: 'flex', gap: 20 }}>
        
        {/*  MENU CONTENT  */}
        <div style={{ flex: 1 }}>
          {search ? (
            <>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 20 }}>
                {filteredMenu.reduce((s, n) => s + n.monan.length, 0)} kết quả cho "<span style={{ color: 'var(--color-caramel)' }}>{search}</span>"
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
                {filteredMenu.flatMap(nhom => nhom.monan).map(mon => (
                  <MonCard key={mon.id} mon={mon} onOpen={() => openDetail(mon)} />
                ))}
              </div>
            </>
          ) : (
            <>
              {displayMenu[activeNhom] && (
                <>
                  <div style={{ marginBottom: 24 }}>
                    <h2 style={{ fontSize: 22, color: 'var(--color-off-white)', fontWeight: 700, margin: 0, letterSpacing: 0.5 }}>
                      {displayMenu[activeNhom].tennhom}
                    </h2>
                    <div style={{ width: 30, height: 2, background: 'var(--color-caramel)', marginTop: 8, borderRadius: 1 }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
                    {displayMenu[activeNhom].monan.map(mon => (
                      <MonCard key={mon.id} mon={mon} onOpen={() => openDetail(mon)} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/*  SIDEBAR GIỎ HÀNG  */}
        {showCart && (
          <div style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ color: 'var(--color-caramel)', fontSize: 11, letterSpacing: 2 }}>GIỎ HÀNG</div>
              <button type="button" onClick={() => setShowCart(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 14, padding: 0 }}>
                Đóng
              </button>
            </div>

            {tableInfo && (
              <div style={{ background: 'var(--color-deep-espresso)', border: '1px solid var(--color-dark-gray)', padding: 16, marginBottom: 12 }}>
                <div style={{ color: 'var(--color-caramel)', fontSize: 11, letterSpacing: 2, marginBottom: 12 }}>THÔNG TIN BÀN</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Bàn:</span>
                  <span style={{ fontSize: 12, color: 'var(--color-off-white)' }}>{tableInfo.tenban}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Trạng thái:</span>
                  <Tag
                    value={tableStatus === 'cokhach' ? 'Có khách' : tableStatus === 'trong' ? 'Trống' : 'Đặt trước'}
                    severity={tableStatus === 'cokhach' ? 'danger' : tableStatus === 'trong' ? 'success' : 'info'}
                  />
                </div>
              </div>
            )}

            <div style={{ background: 'var(--color-deep-espresso)', border: '1px solid var(--color-dark-gray)', padding: 16, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ color: 'var(--color-caramel)', fontSize: 11, letterSpacing: 2, marginBottom: 12 }}>GIỎ HÀNG ({tongMon})</div>

              {gioHang.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}>
                  <div>
                    <i className="pi pi-shopping-cart" style={{ fontSize: 32, marginBottom: 12, display: 'block' }} />
                    <div style={{ fontSize: 13 }}>Giỏ hàng trống</div>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12, paddingRight: 8 }}>
                    {gioHang.map((g, i) => {
                      const donGia = Number(g.mon.giaban) + g.bienthe.reduce((s, b) => s + Number(b.giathem), 0);
                      return (
                        <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid var(--color-deep-espresso)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, color: 'var(--color-off-white)', fontWeight: 600 }}>{g.mon.tenmon}</div>
                              {g.bienthe.length > 0 && (
                                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                                  {g.bienthe.map(b => b.tenbienthe).join(', ')}
                                </div>
                              )}
                            </div>
                            <button onClick={() => updateQty(i, -1)}
                              style={{
                                background: 'var(--color-deep-espresso)', border: '1px solid var(--color-dark-gray)', color: 'var(--color-caramel)',
                                width: 24, height: 24, borderRadius: 4, cursor: 'pointer', fontSize: 12, display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                              }}>
                              ×
                            </button>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                              {fmt(donGia)}đ
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <button onClick={() => updateQty(i, -1)}
                                style={{
                                  background: 'var(--color-deep-espresso)', border: '1px solid var(--color-dark-gray)', color: 'var(--color-text-secondary)',
                                  width: 24, height: 24, borderRadius: 3, cursor: 'pointer', fontSize: 12, display: 'flex',
                                  alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-caramel)'; }}
                                onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-secondary)'; }}>
                                −
                              </button>
                              <span style={{ fontSize: 12, color: 'var(--color-off-white)', fontWeight: 600, minWidth: 20, textAlign: 'center' }}>
                                {g.soluong}
                              </span>
                              <button onClick={() => updateQty(i, 1)}
                                style={{
                                  background: 'var(--color-deep-espresso)', border: '1px solid var(--color-dark-gray)', color: 'var(--color-text-secondary)',
                                  width: 24, height: 24, borderRadius: 3, cursor: 'pointer', fontSize: 12, display: 'flex',
                                  alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-caramel)'; }}
                                onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-secondary)'; }}>
                                +
                              </button>
                              <span style={{ fontSize: 12, color: 'var(--color-success)', fontWeight: 600, textAlign: 'right', minWidth: 50 }}>
                                {fmt(donGia * g.soluong)}đ
                              </span>
                            </div>
                          </div>
                          {g.ghichu && (
                            <div style={{ fontSize: 11, color: 'var(--color-dark-gray)', fontStyle: 'italic', marginTop: 4 }}>
                              "{g.ghichu}"
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Tổng tiền */}
                  <div style={{ borderTop: '1px solid var(--color-dark-gray)', paddingTop: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Tổng cộng:</span>
                      <span style={{ fontSize: 16, color: 'var(--color-caramel)', fontWeight: 700 }}>
                        {fmt(tongTien)}đ
                      </span>
                    </div>
                    <Button
                      label={activeOrder ? 'Thêm vào đơn cũ' : 'Tạo đơn mới'}
                      icon={activeOrder ? 'pi pi-plus' : 'pi pi-check'}
                      disabled={gioHang.length === 0 || isSubmitting}
                      onClick={handleOrder}
                      style={{ width: '100%', background: 'var(--color-burnt-orange)', border: 'none', color: '#f5f5f5', fontWeight: 700, padding: 12, letterSpacing: 0.5 }}
                    />
                  </div>
                </>
              )}
            </div>

            {gioHang.length > 0 && (
              <Button
                label="Xóa giỏ hàng"
                icon="pi pi-trash"
                severity="danger"
                text
                onClick={() => setGioHang([])}
                style={{ fontSize: 12 }}
              />
            )}
          </div>
        )}
      </main>

      {/*  DIALOG CHI TIẾT MÓN  */}
      <Dialog
        header={showDetail?.tenmon}
        visible={!!showDetail}
        onHide={() => setShowDetail(null)}
        style={{ width: 480 }}
        modal
        blockScroll
        contentStyle={{ padding: '20px', maxHeight: 'calc(90vh - 80px)', overflowY: 'auto' }}>
        
        {showDetail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* Ảnh món */}
            <div style={{ overflow: 'hidden', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-deep-espresso)', minHeight: 300 }}>
              {showDetail.hinhanh ? (
                <img
                  src={getImageUrl(showDetail.hinhanh)}
                  alt={showDetail.tenmon}
                  loading="lazy"
                  onError={e => {
                    const img = e.currentTarget;
                    img.onerror = null;
                    img.style.display = 'none';
                  }}
                  style={{ maxWidth: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: 6, background: 'var(--color-deep-espresso)', display: 'block' }}
                />
              ) : (
                <div style={{ width: '100%', height: 300, background: 'var(--color-deep-espresso)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>
                  {showDetail.khuvucchebien === 'bar' ? '🥤' : '🍽️'}
                </div>
              )}
            </div>

            {/* Tên + loại + giá */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, color: 'var(--color-off-white)', fontWeight: 700 }}>{showDetail.tenmon}</h3>
                  <Tag
                    value={showDetail.khuvucchebien === 'bar' ? 'BAR' : 'BẾP'}
                    severity={showDetail.khuvucchebien === 'bar' ? 'info' : 'warning'}
                    style={{ marginTop: 6 }}
                  />
                </div>
                <span style={{ fontSize: 18, color: 'var(--color-caramel)', fontWeight: 700 }}>{fmt(showDetail.giaban)}đ</span>
              </div>

              {showDetail.mota && (
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '8px 0', lineHeight: 1.6 }}>{showDetail.mota}</p>
              )}
            </div>

            {/* Biến thể */}
            {showDetail.bienthe && showDetail.bienthe.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, fontWeight: 600 }}>
                  Tùy chọn
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {showDetail.bienthe.map(bt => {
                    const selected = detailBT.find(b => b.id === bt.id);
                    return (
                      <button key={bt.id} onClick={() => toggleBT(bt)}
                        style={{
                          padding: '8px 12px', borderRadius: 4, cursor: 'pointer',
                          background: selected ? 'var(--color-caramel)' : 'transparent',
                          color: selected ? '#000' : 'var(--color-off-white)',
                          border: `1px solid ${selected ? 'var(--color-caramel)' : 'var(--color-dark-gray)'}`,
                          fontSize: 12, transition: 'all 0.15s',
                          fontWeight: selected ? 600 : 400,
                        }}>
                        {bt.tenbienthe}
                        {bt.giathem > 0 && <span style={{ marginLeft: 4 }}>+{fmt(bt.giathem)}đ</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Ghi chú */}
            <div>
              <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, fontWeight: 600, display: 'block' }}>
                Ghi chú
              </label>
              <InputTextarea
                value={detailGhiChu}
                onChange={e => setDetailGhiChu(e.target.value)}
                placeholder="VD: ít đường, không đá..."
                rows={2}
                style={{ width: '100%', fontSize: 13 }}
              />
            </div>

            {/* Nút thêm */}
            <div style={{ display: 'flex', gap: 12, paddingTop: 8, borderTop: '1px solid var(--color-dark-gray)' }}>
              <Button
                label="Hủy"
                severity="secondary"
                onClick={() => setShowDetail(null)}
                style={{ flex: 1 }}
              />
              <Button
                label={`Thêm — ${fmt(detailTong)}đ`}
                icon="pi pi-plus"
                onClick={() => addToCart(showDetail, detailBT, detailGhiChu)}
                style={{ flex: 1, background: 'var(--color-burnt-orange)', border: 'none', color: '#f5f5f5', fontWeight: 700 }}
              />
            </div>
          </div>
        )}
      </Dialog>

      {/*  SIDEBAR GIỎ HÀNG  */}
    </div>
  );
};

//  MON CARD 
const MonCard = ({ mon, onOpen }: { mon: MonAn; onOpen: () => void }) => (
  <div onClick={onOpen}
    style={{
      background: 'var(--color-deep-espresso)', border: '1px solid var(--color-dark-gray)', borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
      transition: 'all 0.2s',
    }}
    onMouseEnter={e => {
      const el = e.currentTarget as HTMLDivElement;
      el.style.borderColor = 'var(--color-caramel)';
      el.style.boxShadow = '0 8px 24px rgba(201,151,58,0.15)';
    }}
    onMouseLeave={e => {
      const el = e.currentTarget as HTMLDivElement;
      el.style.borderColor = 'var(--color-dark-gray)';
      el.style.boxShadow = 'none';
    }}>
    
    {/* Ảnh */}
    <div style={{ height: 140, background: 'var(--color-deep-espresso)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      {mon.hinhanh ? (
        <img
          src={getImageUrl(mon.hinhanh)}
          alt={mon.tenmon}
          loading="lazy"
          onError={e => {
            const img = e.currentTarget;
            img.onerror = null;
            img.style.display = 'none';
          }}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <span style={{ fontSize: 44 }}>{mon.khuvucchebien === 'bar' ? '🥤' : '🍽️'}</span>
      )}
      <Tag
        value={mon.khuvucchebien === 'bar' ? 'BAR' : 'BẾP'}
        severity={mon.khuvucchebien === 'bar' ? 'info' : 'warning'}
        style={{ position: 'absolute', top: 8, left: 8 }}
      />
    </div>

    {/* Info */}
    <div style={{ padding: '12px' }}>
      <div style={{ fontSize: 13, color: 'var(--color-off-white)', fontWeight: 600, marginBottom: 4, lineHeight: 1.3, minHeight: 32 }}>
        {mon.tenmon}
      </div>
      {mon.mota && (
        <div style={{
          fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 8, lineHeight: 1.3,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
        }}>
          {mon.mota}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 14, color: 'var(--color-caramel)', fontWeight: 700 }}>{fmt(mon.giaban)}đ</span>
        <button style={{
          width: 28, height: 28, background: 'var(--color-caramel)', border: 'none', borderRadius: 4,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000',
          fontSize: 14, fontWeight: 700, cursor: 'pointer'
        }}>+</button>
      </div>
    </div>
  </div>
);

export default MenuPublic;


