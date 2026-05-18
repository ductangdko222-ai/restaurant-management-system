// src/pages/Tables/TableList.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';
import { Tag } from 'primereact/tag';
import { TabView, TabPanel } from 'primereact/tabview';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Checkbox } from 'primereact/checkbox';
import QRCode from 'react-qr-code';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Area, Table } from '../../types/tables';

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
};

type Severity = 'success' | 'danger' | 'warning' | 'secondary' | 'info' | 'contrast' | null | undefined;

const trangThaiOptions = [
  { label: 'Trống', value: 'trong' },
  { label: 'Có khách', value: 'cokhach' },
  { label: 'Đặt trước', value: 'dattruoc' },
];

const statusMap: Record<string, { label: string; severity: Severity }> = {
  trong: { label: 'Trống', severity: 'success' },
  cokhach: { label: 'Có khách', severity: 'danger' },
  dattruoc: { label: 'Đặt trước', severity: 'warning' },
};

const emptyTableForm = {
  maban: '', tenban: '', khuvucid: 0, sochongoi: 4,
  trangthai: 'trong' as 'trong' | 'cokhach' | 'dattruoc'
};
const emptyAreaForm = { tenkhuvuc: '', mota: '', thutu: 0 };

const TableList = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loadingTable, setLoadingTable] = useState(true);
  const [loadingArea, setLoadingArea] = useState(true);
  const [filterKV, setFilterKV] = useState<number | undefined>(undefined);
  const [filterTT, setFilterTT] = useState<string | undefined>(undefined);
  const [selectedTables, setSelectedTables] = useState<Table[]>([]);

  const isTableSelected = (table: Table) => selectedTables.some(t => t.id === table.id);
  const toggleTableSelection = (table: Table) => {
    setSelectedTables(prev => {
      if (prev.some(t => t.id === table.id)) {
        return prev.filter(t => t.id !== table.id);
      }
      return [...prev, table];
    });
  };

  const TableCard = ({ table }: { table: Table }) => {
    const selected = isTableSelected(table);
    return (
      <div style={{
        background: selected ? 'rgba(76, 175, 80, 0.05)' : 'var(--color-deep-espresso)',
        border: selected ? '1px solid var(--color-success)' : '1px solid var(--color-dark-gray)',
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, color: 'var(--color-off-white)', fontWeight: 700, marginBottom: 4 }}>{table.maban} — {table.tenban}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', color: 'var(--color-dark-gray)', fontSize: 12 }}>
              <span>{table.sochongoi} chỗ</span>
              <span>{table.khuvuc?.tenkhuvuc || areas.find(a => a.id === table.khuvucid)?.tenkhuvuc || 'Chưa có khu vực'}</span>
              <span>{statusMap[table.trangthai]?.label}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Checkbox inputId={`table-select-${table.id}`} checked={selected} onChange={() => toggleTableSelection(table)} />
            <label htmlFor={`table-select-${table.id}`} style={{ color: 'var(--color-off-white)', cursor: 'pointer' }}>Chọn</label>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button icon="pi pi-shopping-cart" iconPos="left" label="Đặt món" size="small" severity="warning" className="w-full" style={{ flex: 1, minWidth: 120 }}
            onClick={() => navigate(`/pos/${table.id}`)} />
          {table.trangthai === 'cokhach' && (
            <Button icon="pi pi-arrows-h" iconPos="left" label="Chuyển" size="small" severity="info" className="w-full" style={{ flex: 1, minWidth: 120, color: 'inherit' }}
              onClick={() => openTransferDialog(table)} />
          )}
          {isAdmin() && (
            <>
              <Button icon="pi pi-pencil" iconPos="left" label="Sửa" size="small" severity="info" className="w-full" style={{ flex: 1, minWidth: 120 }}
                onClick={() => openEditTable(table)} />
              <Button icon="pi pi-trash" iconPos="left" label="Xóa" size="small" severity="danger" className="w-full" style={{ flex: 1, minWidth: 120 }}
                onClick={() => handleDeleteTable(table)} />
              <Button icon="pi pi-qrcode" iconPos="left" label="QR" size="small" severity="success" className="w-full" style={{ flex: 1, minWidth: 120 }}
                onClick={() => openQrDialog(table)} />
            </>
          )}
        </div>
      </div>
    );
  };

  // Chuyển bàn
  const [transferDialog, setTransferDialog] = useState(false);
  const [transferSourceTable, setTransferSourceTable] = useState<Table | null>(null);
  const [transferTargetTableId, setTransferTargetTableId] = useState<number | null>(null);
  const [transferLoading, setTransferLoading] = useState(false);
  const [availableTables, setAvailableTables] = useState<Table[]>([]);

  // Ghép bàn
  const [mergeDialog, setMergeDialog] = useState(false);
  const [mergeTargetTableId, setMergeTargetTableId] = useState<number | null>(null);
  const [mergeLoading, setMergeLoading] = useState(false);

  // Dialog bàn
  const [tableDialog, setTableDialog] = useState(false);
  const [editTable, setEditTable] = useState<Table | null>(null);
  const [tableForm, setTableForm] = useState(emptyTableForm);
  const [savingTable, setSavingTable] = useState(false);

  // Dialog khu vực
  const [areaDialog, setAreaDialog] = useState(false);
  const [editArea, setEditArea] = useState<Area | null>(null);
  const [areaForm, setAreaForm] = useState(emptyAreaForm);
  const [savingArea, setSavingArea] = useState(false);

  const toast = useRef<Toast>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = () => user?.vaitro === 'admin';
  const isMobile = useIsMobile();

  const [qrDialog, setQrDialog] = useState(false);
  const [qrTable, setQrTable] = useState<{ id: number; maban: string; tenban: string; maqr?: string } | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);

  const openQrDialog = async (table: Table) => {
    setLoadingQr(true);
    try {
      const res = await api.getTableById(table.id);
      const data = res.data.data;

      const baseUrl = window.location.origin;
      const qrUrl = `${baseUrl}/menu/${data.id}`;

      setQrTable({
        id: data.id,
        maban: data.maban,
        tenban: data.tenban,
        maqr: qrUrl
      });
      setQrDialog(true);
    } catch (e: any) {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: e.response?.data?.message || 'Không tải được QR' });
    } finally {
      setLoadingQr(false);
    }
  };

  const printQr = () => {
    if (!qrTable?.maqr) return;
    const qrValue = qrTable.maqr;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrValue)}`;
    printWindow.document.write
    (`
    <html>
      <head>
        <title>In Menu QR - ${qrTable.tenban}</title>
      </head>
      <body style="font-family: Arial, sans-serif; padding: 15px;">
        <h5 style = "text-align: center;">Quét mã QR để chọn món cho bàn của mình nhé</h5>
        <p><strong>Tên bàn:</strong> ${qrTable.tenban}</p>
        <img id="qr-img" src="${qrUrl}" alt="Menu QR" style="width:300px;height:300px;" />
        <p style="word-break: break-all;">${qrValue}</p>
        <script>
          const img = document.getElementById('qr-img');
          const printPage = () => { window.focus(); window.print(); window.close(); };
          if (img.complete && img.naturalHeight !== 0) {
            printPage();
          } else {
            img.onload = printPage;
            img.onerror = printPage;
          }
        </script>
      </body>
    </html>
  `);
    printWindow.document.close();
  };

  const fetchAll = async () => {
    setLoadingTable(true);
    setLoadingArea(true);
    try {
      const [tRes, aRes] = await Promise.all([api.getTables(), api.getAreas()]);
      setTables(tRes.data.data);
      setAreas(aRes.data.data);
    } catch {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải dữ liệu' });
    } finally {
      setLoadingTable(false);
      setLoadingArea(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    if (selectedTables.length > 0 && !selectedTables.some(t => t.id === mergeTargetTableId)) {
      setMergeTargetTableId(selectedTables[0]?.id || null);
    }
  }, [selectedTables, mergeTargetTableId]);

  // Filter bàn
  const filteredTables = tables.filter(t => {
    const matchKV = !filterKV || t.khuvucid === filterKV;
    const matchTT = !filterTT || t.trangthai === filterTT;
    return matchKV && matchTT;
  });

  //  BÀN 
  const openCreateTable = () => { setEditTable(null); setTableForm(emptyTableForm); setTableDialog(true); };

  const openTransferDialog = async (table: Table) => {
    setTransferSourceTable(table);
    setTransferTargetTableId(null);
    setTransferDialog(true);
    try {
      const res = await api.getTables({ trangthai: 'trong' });
      const options = res.data.data.filter((t: Table) => t.id !== table.id);
      setAvailableTables(options);
    } catch (e: any) {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: 'Không tải được bàn trống' });
    }
  };

  const handleConfirmTransfer = async () => {
    if (!transferSourceTable || !transferTargetTableId) {
      toast.current?.show({ severity: 'warn', summary: 'Thiếu thông tin', detail: 'Vui lòng chọn bàn đích' });
      return;
    }
    setTransferLoading(true);
    try {
      await api.transferTable(transferSourceTable.id, transferTargetTableId);
      toast.current?.show({ severity: 'success', summary: 'Thành công', detail: `Đã chuyển bàn ${transferSourceTable.tenban} sang bàn mới` });
      setTransferDialog(false);
      setSelectedTables([]);
      fetchAll();
    } catch (e: any) {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: e.response?.data?.message || 'Chuyển bàn thất bại' });
    } finally {
      setTransferLoading(false);
    }
  };

  const openMergeDialog = () => {
    if (selectedTables.length < 2) return;
    setMergeTargetTableId(selectedTables[0]?.id || null);
    setMergeDialog(true);
  };

  const handleConfirmMerge = async () => {
    if (!mergeTargetTableId || selectedTables.length < 2) {
      toast.current?.show({ severity: 'warn', summary: 'Thiếu thông tin', detail: 'Vui lòng chọn tối thiểu 2 bàn' });
      return;
    }

    const sourceTableIds = selectedTables
      .map(t => t.id)
      .filter(id => id !== mergeTargetTableId);

    if (sourceTableIds.length === 0) {
      toast.current?.show({ severity: 'warn', summary: 'Thiếu thông tin', detail: 'Vui lòng chọn bàn nguồn để ghép' });
      return;
    }

    setMergeLoading(true);
    try {
      await api.mergeTables(mergeTargetTableId, sourceTableIds);
      toast.current?.show({ severity: 'success', summary: 'Thành công', detail: 'Ghép bàn thành công' });
      setMergeDialog(false);
      setSelectedTables([]);
      fetchAll();
    } catch (e: any) {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: e.response?.data?.message || 'Ghép bàn thất bại' });
    } finally {
      setMergeLoading(false);
    }
  };
  const openEditTable = (t: Table) => {
    setEditTable(t);
    setTableForm({ maban: t.maban, tenban: t.tenban, khuvucid: t.khuvucid, sochongoi: t.sochongoi, trangthai: t.trangthai });
    setTableDialog(true);
  };

  const handleSaveTable = async () => {
    if (!tableForm.maban || !tableForm.tenban || !tableForm.khuvucid) {
      toast.current?.show({ severity: 'warn', summary: 'Thiếu thông tin', detail: 'Vui lòng nhập đủ thông tin' });
      return;
    }
    setSavingTable(true);
    try {
      if (editTable) {
        await api.updateTable(editTable.id, {
          tenban: tableForm.tenban,
          khuvucid: tableForm.khuvucid,
          sochongoi: tableForm.sochongoi,
        });
        if (tableForm.trangthai !== editTable.trangthai) {
          await api.updateTableStatus(editTable.id, tableForm.trangthai);
        }
        toast.current?.show({ severity: 'success', summary: 'Thành công', detail: 'Đã cập nhật bàn' });
      } else {
        await api.createTable({
          maban: tableForm.maban,
          tenban: tableForm.tenban,
          khuvucid: tableForm.khuvucid || undefined,
          sochongoi: tableForm.sochongoi,
        });
        toast.current?.show({ severity: 'success', summary: 'Thành công', detail: 'Đã tạo bàn mới' });
      }
      setTableDialog(false);
      fetchAll();
    } catch (e: any) {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: e.response?.data?.message || 'Thao tác thất bại' });
    } finally { setSavingTable(false); }
  };

  const handleDeleteTable = (t: Table) => {
    confirmDialog({
      message: `Xóa bàn ${t.maban} - ${t.tenban}?`,
      header: 'Xác nhận xóa',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Xóa', rejectLabel: 'Hủy',
      accept: async () => {
        try {
          await api.deleteTable(t.id);
          toast.current?.show({ severity: 'success', summary: 'Đã xóa', detail: `Bàn ${t.maban} đã xóa` });
          fetchAll();
        } catch (e: any) {
          toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: e.response?.data?.message });
        }
      }
    });
  };

  //  KHU VỰC 
  const openCreateArea = () => { setEditArea(null); setAreaForm(emptyAreaForm); setAreaDialog(true); };
  const openEditArea = (a: Area) => {
    setEditArea(a);
    setAreaForm({ tenkhuvuc: a.tenkhuvuc, mota: a.mota || '', thutu: a.thutu || 0 });
    setAreaDialog(true);
  };

  const handleSaveArea = async () => {
    if (!areaForm.tenkhuvuc) {
      toast.current?.show({ severity: 'warn', summary: 'Thiếu thông tin', detail: 'Vui lòng nhập tên khu vực' });
      return;
    }
    setSavingArea(true);
    try {
      if (editArea) {
        await api.updateArea(editArea.id, areaForm);
        toast.current?.show({ severity: 'success', summary: 'Thành công', detail: 'Đã cập nhật khu vực' });
      } else {
        await api.createArea(areaForm);
        toast.current?.show({ severity: 'success', summary: 'Thành công', detail: 'Đã tạo khu vực mới' });
      }
      setAreaDialog(false);
      fetchAll();
    } catch (e: any) {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: e.response?.data?.message || 'Thao tác thất bại' });
    } finally { setSavingArea(false); }
  };

  const handleDeleteArea = (a: Area) => {
    confirmDialog({
      message: `Xóa khu vực "${a.tenkhuvuc}"? Khu vực không được có bàn.`,
      header: 'Xác nhận xóa',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Xóa', rejectLabel: 'Hủy',
      accept: async () => {
        try {
          await api.deleteArea(a.id);
          toast.current?.show({ severity: 'success', summary: 'Đã xóa', detail: `Khu vực "${a.tenkhuvuc}" đã xóa` });
          fetchAll();
        } catch (e: any) {
          toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: e.response?.data?.message });
        }
      }
    });
  };

  //  TEMPLATES 
  const statusBody = (row: Table) => {
    const s = statusMap[row.trangthai];
    if (!s) return null;
    return <Tag value={s.label} severity={s.severity} />;
  };

  const tableActionBody = (row: Table) => (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <Button icon="pi pi-shopping-cart" size="small" severity="warning" tooltip="Đặt món"
        onClick={() => navigate(`/pos/${row.id}`)} />
      {row.trangthai === 'cokhach' && (
        <Button icon="pi pi-arrows-h" size="small" severity="info" tooltip="Chuyển bàn"
          onClick={() => openTransferDialog(row)} />
      )}
      {isAdmin() && <>
        <Button icon="pi pi-pencil" size="small" severity="info" tooltip="Sửa"
          onClick={() => openEditTable(row)} />
        <Button icon="pi pi-trash" size="small" severity="danger" tooltip="Xóa"
          onClick={() => handleDeleteTable(row)} />
        <Button icon="pi pi-qrcode" size="small" severity="success" tooltip="Xem QR"
          onClick={() => openQrDialog(row)} />
      </>}
    </div>
  );

  const areaActionBody = (row: Area) => (
    <div style={{ display: 'flex', gap: 6 }}>
      <Button icon="pi pi-pencil" size="small" severity="info" tooltip="Sửa"
        onClick={() => openEditArea(row)} />
      <Button icon="pi pi-trash" size="small" severity="danger" tooltip="Xóa"
        onClick={() => handleDeleteArea(row)} />
    </div>
  );

  const areaOptions = areas.map(a => ({ label: a.tenkhuvuc, value: a.id }));
  const areaFormOptions = areas.map(a => ({ label: a.tenkhuvuc, value: a.id }));

  return (
    <div>
      <Toast ref={toast} />
      <ConfirmDialog />

      <TabView>
        {/*  TAB BÀN  */}
        <TabPanel header="Danh sách bàn" leftIcon="pi pi-list mr-2">
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 10, justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, width: isMobile ? '100%' : 'auto' }}>
              <Dropdown
                value={filterKV}
                options={areaOptions}
                onChange={e => setFilterKV(e.value)}
                placeholder="Tất cả khu vực"
                showClear
                style={{ minWidth: 170 }}
              />
              <Dropdown
                value={filterTT}
                options={trangThaiOptions}
                onChange={e => setFilterTT(e.value)}
                placeholder="Tất cả trạng thái"
                showClear
                style={{ minWidth: 170 }}
              />
              <Button icon="pi pi-refresh" size="small" severity="secondary" onClick={fetchAll} />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end', width: isMobile ? '100%' : 'auto' }}>
              <Button label="Ghép bàn" icon="pi pi-object-group" size="small" severity="secondary"
                disabled={selectedTables.length < 2}
                onClick={openMergeDialog}
                style={{ minWidth: 140, width: isMobile ? '100%' : undefined }} />
              <Button label="Sơ đồ bàn" icon="pi pi-th-large" size="small" severity="secondary"
                style={{ width: isMobile ? '100%' : undefined }}
                onClick={() => navigate('/tables/map')} />
              {isAdmin() && (
                <Button label="Thêm bàn" icon="pi pi-plus" size="small"
                  style={{ width: isMobile ? '100%' : undefined, background: 'var(--color-burnt-orange)', border: 'none', color: '#f5f5f5' }}
                  onClick={openCreateTable} />
              )}
            </div>
          </div>

          {isMobile ? (
            <div>
              {filteredTables.length === 0 ? (
                <div style={{ color: 'var(--color-caramel)', textAlign: 'center', padding: 20 }}>Không có bàn nào</div>
              ) : filteredTables.map(table => (
                <TableCard key={table.id} table={table} />
              ))}
            </div>
          ) : (
            <DataTable value={filteredTables} loading={loadingTable} stripedRows size="small"
              emptyMessage="Không có bàn nào" selection={selectedTables} onSelectionChange={e => setSelectedTables(e.value as Table[])}
              dataKey="id" selectionMode="checkbox" responsiveLayout="scroll">
              <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />
              <Column field="maban" header="Mã bàn" sortable style={{ width: 100 }} />
              <Column field="tenban" header="Tên bàn" sortable />
              <Column header="Khu vực"
                body={r => r.khuvuc?.tenkhuvuc || areas.find(a => a.id === r.khuvucid)?.tenkhuvuc || '—'}
                sortable />
              <Column field="sochongoi" header="Sức chứa" sortable style={{ width: 100 }} />
              <Column field="trangthai" header="Trạng thái" body={statusBody} sortable style={{ width: 130 }} />
              <Column header="Thao tác" body={tableActionBody} style={{ width: 190 }} />
            </DataTable>
          )}
        </TabPanel>

        {/*  TAB KHU VỰC  */}
        {isAdmin() && (
          <TabPanel header="Khu vực" leftIcon="pi pi-map mr-2">
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <Button label="Thêm khu vực" icon="pi pi-plus" size="small"
                style={{ background: 'var(--color-burnt-orange)', border: 'none', color: '#f5f5f5' }}
                onClick={openCreateArea} />
            </div>
            <DataTable value={areas} loading={loadingArea} stripedRows size="small"
              emptyMessage="Không có khu vực nào">
              <Column field="id" header="ID" style={{ width: 60 }} />
              <Column field="tenkhuvuc" header="Tên khu vực" sortable />
              <Column field="mota" header="Mô tả" body={r => r.mota || '—'} />
              <Column field="thutu" header="Thứ tự" sortable style={{ width: 90 }} />
              <Column header="Số bàn" body={r => tables.filter(t => t.khuvucid === r.id).length} style={{ width: 80 }} />
              <Column header="Thao tác" body={areaActionBody} style={{ width: 100 }} />
            </DataTable>
          </TabPanel>
        )}
      </TabView>

      {/*  DIALOG BÀN  */}
      <Dialog header={editTable ? 'Sửa bàn' : 'Thêm bàn mới'} visible={tableDialog}
        style={{ width: isMobile ? '100%' : 420 }} onHide={() => setTableDialog(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>MÃ BÀN</label>
            <InputText className="w-full mt-1" value={tableForm.maban}
              onChange={e => setTableForm({ ...tableForm, maban: e.target.value })}
              placeholder="VD: B01, A02..." />

          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>TÊN BÀN</label>
            <InputText className="w-full mt-1" value={tableForm.tenban}
              onChange={e => setTableForm({ ...tableForm, tenban: e.target.value })}
              placeholder="VD: Bàn 01..." />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>KHU VỰC</label>
            <Dropdown className="w-full mt-1" value={tableForm.khuvucid} options={areaFormOptions}
              onChange={e => setTableForm({ ...tableForm, khuvucid: e.value })}
              placeholder="Chọn khu vực" />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>SỨC CHỨA</label>
            <InputText className="w-full mt-1" type="number" value={String(tableForm.sochongoi)}
              onChange={e => setTableForm({ ...tableForm, sochongoi: Number(e.target.value) })} />
          </div>
          {editTable && (
            <div>
              <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>TRẠNG THÁI</label>
              <Dropdown className="w-full mt-1" value={tableForm.trangthai}
                options={trangThaiOptions}
                onChange={e => setTableForm({ ...tableForm, trangthai: e.value })} />
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button label="Hủy" severity="secondary" size="small" onClick={() => setTableDialog(false)} />
            <Button label={editTable ? 'Cập nhật' : 'Tạo mới'} size="small" loading={savingTable}
              style={{ background: 'var(--color-burnt-orange)', border: 'none', color: '#f5f5f5' }}
              onClick={handleSaveTable} />
          </div>
        </div>
      </Dialog>

      {/*  DIALOG KHU VỰC  */}
      {/*  DIALOG CHUYỂN BÀN  */}
      <Dialog header={transferSourceTable ? `Chuyển bàn ${transferSourceTable.tenban}` : 'Chuyển bàn'} visible={transferDialog}
        style={{ width: isMobile ? '100%' : 420 }} onHide={() => setTransferDialog(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>Bàn nguồn</label>
            <InputText className="w-full mt-1" value={transferSourceTable?.tenban || ''} disabled />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>Bàn đích</label>
            <Dropdown className="w-full mt-1" value={transferTargetTableId}
              options={availableTables.map(t => ({ label: `${t.maban} - ${t.tenban}`, value: t.id }))}
              onChange={e => setTransferTargetTableId(e.value as number)} placeholder="Chọn bàn đích" />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button label="Hủy" severity="secondary" size="small" onClick={() => setTransferDialog(false)} />
            <Button label="Chuyển" size="small" loading={transferLoading}
              onClick={handleConfirmTransfer}
              style={{ background: 'var(--color-burnt-orange)', border: 'none', color: '#f5f5f5' }} />
          </div>
        </div>
      </Dialog>

      {/*  DIALOG GHÉP BÀN  */}
      <Dialog header="Ghép bàn" visible={mergeDialog} style={{ width: isMobile ? '100%' : 420 }} onHide={() => setMergeDialog(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>Bàn nguồn</label>
            <div style={{ minHeight: 44, padding: 10, border: '1px solid var(--color-dark-gray)', borderRadius: 8, background: '#222' }}>
              {selectedTables.length > 0 ? selectedTables.map(table => (
                <div key={table.id} style={{ marginBottom: 4 }}>{table.maban} - {table.tenban}</div>
              )) : <span>Chọn ít nhất 2 bàn để ghép</span>}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>Bàn đích</label>
            <Dropdown className="w-full mt-1" value={mergeTargetTableId}
              options={selectedTables.map(t => ({ label: `${t.maban} - ${t.tenban}`, value: t.id }))}
              onChange={e => setMergeTargetTableId(e.value as number)} placeholder="Chọn bàn đích" />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button label="Hủy" severity="secondary" size="small" onClick={() => setMergeDialog(false)} />
            <Button label="Ghép" size="small" loading={mergeLoading}
              onClick={handleConfirmMerge}
              style={{ background: 'var(--color-burnt-orange)', border: 'none', color: '#f5f5f5' }} />
          </div>
        </div>
      </Dialog>

      <Dialog header={editArea ? 'Sửa khu vực' : 'Thêm khu vực mới'} visible={areaDialog}
        style={{ width: isMobile ? '100%' : 400 }} onHide={() => setAreaDialog(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>TÊN KHU VỰC</label>
            <InputText className="w-full mt-1" value={areaForm.tenkhuvuc}
              onChange={e => setAreaForm({ ...areaForm, tenkhuvuc: e.target.value })}
              placeholder="VD: Tầng 1, Sân vườn..." />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>MÔ TẢ</label>
            <InputTextarea className="w-full mt-1" value={areaForm.mota}
              onChange={e => setAreaForm({ ...areaForm, mota: e.target.value })}
              rows={3} placeholder="Mô tả khu vực..." />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>THỨ TỰ</label>
            <InputText className="w-full mt-1" type="number" value={String(areaForm.thutu)}
              onChange={e => setAreaForm({ ...areaForm, thutu: Number(e.target.value) })} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button label="Hủy" severity="secondary" size="small" onClick={() => setAreaDialog(false)} />
            <Button label={editArea ? 'Cập nhật' : 'Tạo mới'} size="small" loading={savingArea}
              style={{ background: 'var(--color-burnt-orange)', border: 'none', color: '#f5f5f5' }}
              onClick={handleSaveArea} />
          </div>
        </div>
      </Dialog>
      <Dialog header={qrTable ? `Menu QR - ${qrTable.tenban}` : 'Menu QR'}
        visible={qrDialog}
        style={{ width: isMobile ? '100%' : 420 }}
        onHide={() => setQrDialog(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button label="Đóng" severity="secondary" size="small" onClick={() => setQrDialog(false)} />
            <Button label="In QR" severity="success" size="small" onClick={printQr} disabled={!qrTable?.maqr} />
          </div>
        }>
        <div style={{ textAlign: 'center', padding: 16 }}>
          {loadingQr ? (
            <p>Đang tải...</p>
          ) : qrTable?.maqr ? (
            <>
              <p><strong>{qrTable.tenban}</strong></p>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <QRCode value={qrTable.maqr} size={260} />
              </div>
              <p style={{ wordBreak: 'break-word' }}>{qrTable.maqr}</p>
            </>
          ) : (
            <p>Không có QR cho bàn này.</p>
          )}
        </div>
      </Dialog>
    </div>
  );
};

export default TableList;

