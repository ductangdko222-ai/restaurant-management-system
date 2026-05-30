// src/pages/Kitchen/KitchenScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { Badge } from 'primereact/badge';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import socketClient from '../../services/socketClient';
import { Ticket, KitchenData } from '../../types/kitchen';

const KitchenScreen = () => {
  const [khuvuc, setKhuvuc] = useState<'bep' | 'bar'>('bep');
  const [data, setData]     = useState<KitchenData>({ moi: [], danglam: [], sansang: [] });
  const [loading, setLoading] = useState(true);
  const toast = useRef<Toast>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
    socketClient.joinKitchenRoom(khuvuc);
    socketClient.onNewTicket(() => fetchData());
    socketClient.onTicketUpdated(() => fetchData());
    return () => { socketClient.removeAllListeners(); };
  }, [khuvuc]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.getKitchenByArea(khuvuc);
      setData(res.data.data || { moi: [], danglam: [], sansang: [] });
    } catch {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải dữ liệu' });
    } finally { setLoading(false); }
  };

  const handleStart = async (id: number) => {
    try {
      await api.startCooking(id);
      fetchData();
      toast.current?.show({ severity: 'info', summary: 'Bắt đầu làm', life: 1500 });
    } catch (e: any) {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: e.response?.data?.message });
    }
  };

  const handleFinish = async (id: number) => {
    try {
      await api.finishCooking(id);
      fetchData();
      toast.current?.show({ severity: 'success', summary: 'Món sẵn sàng!', life: 2000 });
    } catch (e: any) {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: e.response?.data?.message });
    }
  };

  const parseDbDateTime = (value: string) => {
    if (!value) return new Date(NaN);

    const match = value.match(/^\s*(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?\s*$/);
    if (match) {
      const [, year, month, day, hour, minute, second] = match;
      return new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second) || 0
      );
    }

    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) return parsed;
    return new Date(value.endsWith('Z') ? value : `${value}Z`);
  };

  const getWaitTime = (thoigiantao: string) => {
    const date = parseDbDateTime(thoigiantao);
    const diff = Math.floor((Date.now() - date.getTime()) / 60000);
    return Number.isFinite(diff) && diff >= 0 ? diff : 0;
  };

  const getTimeColor = (minutes: number) => {
    if (minutes < 5)  return 'var(--color-success)';
    if (minutes < 10) return 'var(--color-warning)';
    return 'var(--color-error)';
  };

  const TicketCard = ({ ticket, col, isTop = true }: { ticket: Ticket; col: 'moi' | 'danglam' | 'sansang'; isTop?: boolean }) => {
    const wait = getWaitTime(ticket.thoigiantao);
    return (
      <div style={{
        background: 'var(--color-deep-espresso)',
        border: `1px solid ${col === 'moi' ? 'var(--color-dark-gray)' : col === 'danglam' ? 'var(--color-warning)40' : 'var(--color-success)40'}`,
        padding: 12, marginBottom: 8,
        borderLeft: `3px solid ${col === 'moi' ? 'var(--color-text-secondary)' : col === 'danglam' ? 'var(--color-warning)' : 'var(--color-success)'}`,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>{ticket.maphieu}</span>
          <span style={{ fontSize: 11, color: getTimeColor(wait), fontWeight: 500 }}>{wait} phút</span>
        </div>

        {/* Tên món */}
        <div style={{ fontSize: 16, color: 'var(--color-off-white)', fontWeight: 500, marginBottom: 4 }}>
          {ticket.tenmon}
          <span style={{ fontSize: 13, color: 'var(--color-caramel)', marginLeft: 8 }}>x{ticket.soluong}</span>
        </div>

        {/* Biến thể */}
        {ticket.bienthe && ticket.bienthe.length > 0 && (
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
            {ticket.bienthe.map(b => b.tenbienthe).join(', ')}
          </div>
        )}

        {/* Ghi chú */}
        {ticket.ghichumon && (
          <div style={{ fontSize: 11, color: 'var(--color-warning)', fontStyle: 'italic', marginBottom: 8 }}>
            ⚠ {ticket.ghichumon}
          </div>
        )}

        {/* Bàn */}
        <div style={{ fontSize: 11, color: 'var(--color-dark-gray)', marginBottom: 10 }}>
          {ticket.tenban} • {ticket.madon}
        </div>

        {/* Nút action */}
        {col === 'moi' && (
          <Button label="Bắt đầu làm" icon="pi pi-play" size="small"
            disabled={!isTop}
            style={{ width: '100%', background: isTop ? 'var(--color-warning)' : 'var(--color-dark-gray)', border: 'none', color: isTop ? '#000' : '#666', cursor: isTop ? 'pointer' : 'not-allowed', opacity: isTop ? 1 : 0.7 }}
            onClick={() => handleStart(ticket.id)} />
        )}
        {col === 'danglam' && (
          <Button label="Hoàn thành" icon="pi pi-check" size="small"
            disabled={!isTop}
            style={{ width: '100%', background: isTop ? 'var(--color-success)' : 'var(--color-dark-gray)', border: 'none', color: isTop ? '#000' : '#666', cursor: isTop ? 'pointer' : 'not-allowed', opacity: isTop ? 1 : 0.7 }}
            onClick={() => handleFinish(ticket.id)} />
        )}
        {col === 'sansang' && (
          <div style={{ fontSize: 11, color: 'var(--color-success)', textAlign: 'center', padding: '4px 0' }}>
            ✓ Sẵn sàng phục vụ
          </div>
        )}
      </div>
    );
  };

  const colStyle = (color: string): React.CSSProperties => ({
    flex: 1, display: 'flex', flexDirection: 'column',
    background: 'var(--color-deep-espresso)', border: `1px solid var(--color-dark-gray)`,
    borderTop: `3px solid ${color}`, overflow: 'hidden',
  });

  const sortedMoi = (data.moi || []).slice().sort((a, b) => parseDbDateTime(a.thoigiantao).getTime() - parseDbDateTime(b.thoigiantao).getTime());
  const sortedDanglam = (data.danglam || []).slice().sort((a, b) => parseDbDateTime(a.thoigiantao).getTime() - parseDbDateTime(b.thoigiantao).getTime());
  const sortedSansang = (data.sansang || []).slice().sort((a, b) => parseDbDateTime(a.thoigiantao).getTime() - parseDbDateTime(b.thoigiantao).getTime());

  return (
    <div style={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      <Toast ref={toast} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ color: 'var(--color-caramel)', fontSize: 11, letterSpacing: 3 }}>MÀN HÌNH BẾP</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {(['bep', 'bar'] as const).map(k => (
            <button key={k} onClick={() => setKhuvuc(k)}
              style={{
                padding: '6px 20px', cursor: 'pointer', fontSize: 12, letterSpacing: 1,
                background: khuvuc === k ? 'var(--color-caramel)' : 'transparent',
                border: `1px solid ${khuvuc === k ? 'var(--color-caramel)' : 'var(--color-dark-gray)'}`,
                color: khuvuc === k ? '#000' : 'var(--color-text-secondary)',
              }}>
              {k === 'bep' ? 'BẾP' : 'BAR'}
            </button>
          ))}
          <Button icon="pi pi-refresh" size="small" severity="secondary" onClick={fetchData} />
        </div>
      </div>

      {/* Kanban */}
      <div style={{ flex: 1, display: 'flex', gap: 12, overflow: 'hidden' }}>

        {/* CỘT MÓN MỚI */}
        <div style={colStyle('var(--color-text-secondary)')}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-dark-gray)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', letterSpacing: 2 }}>MÓN MỚI</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>{data.moi.length}</span>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 10 }}>
            {loading ? <div style={{ color: 'var(--color-dark-gray)', fontSize: 12, textAlign: 'center', marginTop: 20 }}>Đang tải...</div>
              : data.moi.length === 0 ? <div style={{ color: 'var(--color-dark-gray)', fontSize: 12, textAlign: 'center', marginTop: 20 }}>Không có món</div>
              : sortedMoi.map((t, i) => <TicketCard key={t.id} ticket={t} col="moi" isTop={i === 0} />)}
          </div>
        </div>

        {/* CỘT ĐANG LÀM */}
        <div style={colStyle('var(--color-warning)')}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-dark-gray)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--color-warning)', letterSpacing: 2 }}>ĐANG LÀM</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-warning)' }}>{data.danglam.length}</span>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 10 }}>
            {loading ? <div style={{ color: 'var(--color-dark-gray)', fontSize: 12, textAlign: 'center', marginTop: 20 }}>Đang tải...</div>
              : data.danglam.length === 0 ? <div style={{ color: 'var(--color-dark-gray)', fontSize: 12, textAlign: 'center', marginTop: 20 }}>Không có món</div>
              : sortedDanglam.map((t, i) => <TicketCard key={t.id} ticket={t} col="danglam" isTop={i === 0} />)}
          </div>
        </div>

        {/* CỘT SẴN SÀNG */}
        <div style={colStyle('var(--color-success)')}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-dark-gray)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--color-success)', letterSpacing: 2 }}>SẴN SÀNG</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-success)' }}>{data.sansang.length}</span>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 10 }}>
            {loading ? <div style={{ color: 'var(--color-dark-gray)', fontSize: 12, textAlign: 'center', marginTop: 20 }}>Đang tải...</div>
              : data.sansang.length === 0 ? <div style={{ color: 'var(--color-dark-gray)', fontSize: 12, textAlign: 'center', marginTop: 20 }}>Không có món</div>
              : sortedSansang.map((t, i) => <TicketCard key={t.id} ticket={t} col="sansang" isTop={i === 0} />)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KitchenScreen;

