// src/pages/Tables/TableMap.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import socketClient from '../../services/socketClient';
import { Area, Table } from '../../types/tables';

const statusStyle: Record<string, { bg: string; border: string; color: string; label: string }> = {
  trong:    { bg: 'rgba(34,197,94,0.1)',  border: 'var(--color-success)', color: 'var(--color-success)', label: 'Trống'     },
  cokhach:  { bg: 'rgba(239,68,68,0.1)',  border: 'var(--color-error)', color: 'var(--color-error)', label: 'Có khách'  },
  dattruoc: { bg: 'rgba(234,179,8,0.1)',  border: 'var(--color-warning)', color: 'var(--color-warning)', label: 'Đặt trước' },
};

const CELL = 110;
const COLS = 8;
const ROWS = 6;

const TableMap = () => {
  const [tables, setTables]     = useState<Table[]>([]);
  const [areas, setAreas]       = useState<Area[]>([]);
  const [filterKV, setFilterKV] = useState<number | ''>('');
  const [dragging, setDragging] = useState<Table | null>(null);
  const [saving, setSaving]     = useState(false);
  const toast = useRef<Toast>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = () => user?.vaitro === 'admin';

  useEffect(() => {
    fetchAll();
    socketClient.onTableUpdated(() => fetchAll());
    return () => { socketClient.removeAllListeners(); };
  }, []);

  const fetchAll = async () => {
    try {
      const [tRes, aRes] = await Promise.all([api.getTables(), api.getAreas()]);
      setTables(tRes.data.data);
      setAreas(aRes.data.data);
    } catch {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải dữ liệu' });
    }
  };

  const filtered = tables.filter(t => !filterKV || t.khuvucid === filterKV);

  // Chuyển pixel → index ô lưới
  const normalizedTables = filtered
    .filter((t): t is Table & { vitrix: number; vitriy: number } => t.vitrix != null && t.vitriy != null)
    .map(t => ({
      ...t,
      vitrix: Math.round(t.vitrix / CELL),
      vitriy: Math.round(t.vitriy / CELL),
    }));

  // Map vị trí → bàn
  const posMap: Record<string, Table> = {};
  normalizedTables.forEach(t => {
    if (t.vitrix != null) posMap[`${t.vitrix}-${t.vitriy}`] = t;
  });

  const handleDragStart = (t: Table) => { if (isAdmin()) setDragging(t); };

  const handleDrop = async (col: number, row: number) => {
    if (!dragging || !isAdmin()) return;

    const occupied = normalizedTables.find(t =>
      t.id !== dragging.id && t.vitrix === col && t.vitriy === row
    );
    if (occupied) {
      toast.current?.show({ severity: 'warn', summary: 'Ô đã có bàn' });
      return;
    }
    setSaving(true);
    try {
      // Lưu pixel vào DB
      await api.updateTablePosition(dragging.id, col * CELL, row * CELL);
      // Cập nhật state với pixel
      setTables(prev => prev.map(t =>
        t.id === dragging.id ? { ...t, vitrix: col * CELL, vitriy: row * CELL } : t
      ));
    } catch {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: 'Không thể cập nhật vị trí' });
    } finally { setSaving(false); setDragging(null); }
  };

  const areaOptions = [
    ...areas.map(a => ({ label: a.tenkhuvuc, value: a.id }))
  ];

  return (
    <div>
      <Toast ref={toast} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ color: 'var(--color-caramel)', fontSize: 11, letterSpacing: 3 }}>SƠ ĐỒ BÀN</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Dropdown value={filterKV} options={areaOptions} onChange={e => setFilterKV(e.value)}
            placeholder="Khu vực" style={{ minWidth: 140 }} />
          <Button label="Danh sách" icon="pi pi-list" size="small" severity="secondary"
            onClick={() => navigate('/tables')} />
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        {Object.entries(statusStyle).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: v.color }}>
            <div style={{ width: 12, height: 12, background: v.bg, border: `1px solid ${v.border}` }} />
            {v.label}
          </div>
        ))}
        {isAdmin() && (
          <div style={{ fontSize: 11, color: 'var(--color-dark-gray)', marginLeft: 'auto' }}>Kéo thả để di chuyển bàn</div>
        )}
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${COLS}, ${CELL}px)`,
        gridTemplateRows: `repeat(${ROWS}, ${CELL}px)`,
        gap: 4,
        background: 'var(--color-deep-espresso)',
        border: '1px solid var(--color-dark-gray)',
        padding: 8,
        overflowX: 'auto',
      }}>
        {Array.from({ length: ROWS }).map((_, row) =>
          Array.from({ length: COLS }).map((_, col) => {
            const table = posMap[`${col}-${row}`];
            const s = table ? statusStyle[table.trangthai] : null;
            return (
              <div
                key={`${col}-${row}`}
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleDrop(col, row)}
                style={{
                  width: CELL, height: CELL,
                  border: '1px dashed var(--color-deep-espresso)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {table && s && (
                  <div
                    draggable={isAdmin()}
                    onDragStart={() => handleDragStart(table)}
                    onClick={() => navigate(`/pos/${table.id}`)}
                    style={{
                      width: '90%', height: '90%',
                      background: s.bg,
                      border: `1px solid ${s.border}`,
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer',
                      userSelect: 'none',
                      transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.opacity = '0.8'}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.opacity = '1'}
                  >
                    <div style={{ fontSize: 14, color: s.color, fontWeight: 500 }}>{table.maban}</div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 2 }}>{table.tenban}</div>
                    <div style={{ fontSize: 10, color: 'var(--color-dark-gray)', marginTop: 2 }}>{table.sochongoi} người</div>
                    <div style={{ fontSize: 10, color: s.color, marginTop: 4 }}>{s.label}</div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {saving && (
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--color-caramel)' }}>Đang lưu vị trí...</div>
      )}
    </div>
  );
};

export default TableMap;

