import React, { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Toast } from 'primereact/toast';
import { Tag } from 'primereact/tag';
import { TabView, TabPanel } from 'primereact/tabview';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import api from '../../services/api';
import { INguyenVatLieu, ILichSuXuat, IDungTrongMon } from '../../types/material';

const emptyForm: Omit<INguyenVatLieu, 'id'> = {
  manvl: '', tennvl: '', donvitinh: '', tonkho: 0, tontoithieu: 0,
};

const NguyenVatLieuList = () => {
  const [items, setItems] = useState<INguyenVatLieu[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCanhBao, setShowCanhBao] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [editItem, setEditItem] = useState<INguyenVatLieu | null>(null);
  const [form, setForm] = useState<Omit<INguyenVatLieu, 'id'>>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [khoDialog, setKhoDialog] = useState(false);
  const [khoType, setKhoType] = useState<'nhap' | 'xuat'>('nhap');
  const [khoItem, setKhoItem] = useState<INguyenVatLieu | null>(null);
  const [khoSoLuong, setKhoSoLuong] = useState<number>(0);
  const [savingKho, setSavingKho] = useState(false);
  const [detailDialog, setDetailDialog] = useState(false);
  const [detailItem, setDetailItem] = useState<INguyenVatLieu | null>(null);
  const [lichSuXuat, setLichSuXuat] = useState<ILichSuXuat[]>([]);
  const [dungTrongMon, setDungTrongMon] = useState<IDungTrongMon[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const toast = useRef<Toast>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = showCanhBao ? await api.getNguyenVatLieuCanhBao() : await api.getNguyenVatLieu();
      setItems(res.data.data);
    } catch {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải dữ liệu' });
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [showCanhBao]);

  const openCreate = () => { setEditItem(null); setForm(emptyForm); setDialog(true); };
  const openEdit = (item: INguyenVatLieu) => {
    setEditItem(item);
    setForm({ manvl: item.manvl, tennvl: item.tennvl, donvitinh: item.donvitinh, tonkho: item.tonkho, tontoithieu: item.tontoithieu });
    setDialog(true);
  };

  const handleSave = async () => {
    if (!form.manvl || !form.tennvl || !form.donvitinh) {
      toast.current?.show({ severity: 'warn', summary: 'Thiếu thông tin', detail: 'Vui lòng nhập đủ thông tin' });
      return;
    }
    setSaving(true);
    try {
      if (editItem) {
        await api.updateNguyenVatLieu(editItem.id, form);
        toast.current?.show({ severity: 'success', summary: 'Thành công', detail: 'Đã cập nhật nguyên vật liệu' });
      } else {
        await api.createNguyenVatLieu(form);
        toast.current?.show({ severity: 'success', summary: 'Thành công', detail: 'Đã thêm nguyên vật liệu mới' });
      }
      setDialog(false); fetchAll();
    } catch (e: any) {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: e.response?.data?.message });
    } finally { setSaving(false); }
  };

  const handleDelete = (item: INguyenVatLieu) => {
    confirmDialog({
      message: `Xóa "${item.tennvl}"?`,
      header: 'Xác nhận xóa', icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Xóa', rejectLabel: 'Hủy',
      accept: async () => {
        try {
          await api.deleteNguyenVatLieu(item.id);
          toast.current?.show({ severity: 'success', summary: 'Đã xóa' });
          fetchAll();
        } catch (e: any) {
          toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: e.response?.data?.message });
        }
      }
    });
  };

  const openKho = (item: INguyenVatLieu, type: 'nhap' | 'xuat') => {
    setKhoItem(item); setKhoType(type); setKhoSoLuong(0); setKhoDialog(true);
  };

  const handleKho = async () => {
    if (!khoSoLuong || khoSoLuong <= 0) {
      toast.current?.show({ severity: 'warn', summary: 'Thiếu thông tin', detail: 'Vui lòng nhập số lượng hợp lệ' });
      return;
    }
    setSavingKho(true);
    try {
      if (khoType === 'nhap') {
        await api.nhapKhoNVL(khoItem!.id, khoSoLuong);
      } else {
        await api.xuatKhoNVL(khoItem!.id, khoSoLuong);
      }
      toast.current?.show({ severity: 'success', summary: 'Thành công', detail: `${khoType === 'nhap' ? 'Nhập' : 'Xuất'} kho thành công` });
      setKhoDialog(false); fetchAll();
    } catch (e: any) {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: e.response?.data?.message });
    } finally { setSavingKho(false); }
  };

  const openDetail = async (item: INguyenVatLieu) => {
    setDetailItem(item); setDetailDialog(true); setLoadingDetail(true);
    try {
      const [lsRes, dtRes] = await Promise.all([
        api.getLichSuXuatNVL(item.id),
        api.getDungTrongMonNVL(item.id),
      ]);
      setLichSuXuat(lsRes.data.data);
      setDungTrongMon(dtRes.data.data);
    } catch {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải chi tiết' });
    } finally { setLoadingDetail(false); }
  };

  const tonKhoBody = (row: INguyenVatLieu) => {
    const tonkho = Number(row.tonkho);
    const tontoithieu = Number(row.tontoithieu);
    const sapHet = tonkho <= tontoithieu;
    return (
      <span style={{ color: sapHet ? 'var(--color-error)' : 'var(--color-off-white)', fontWeight: sapHet ? 700 : 400 }}>
        {tonkho.toLocaleString('vi-VN')} {row.donvitinh}
        {sapHet && <i className="pi pi-exclamation-triangle" style={{ marginLeft: 6, fontSize: 11 }} />}
      </span>
    );
  };

  const tonToiThieuBody = (row: INguyenVatLieu) => (
    <span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>
      {Number(row.tontoithieu).toLocaleString('vi-VN')} {row.donvitinh}
    </span>
  );

  const actionBody = (row: INguyenVatLieu) => (
    <div style={{ display: 'flex', gap: 6 }}>
      <Button icon="pi pi-info-circle" size="small" severity="secondary" tooltip="Chi tiết" onClick={() => openDetail(row)} />
      <Button icon="pi pi-arrow-down" size="small" severity="success" tooltip="Nhập kho" onClick={() => openKho(row, 'nhap')} />
      <Button icon="pi pi-arrow-up" size="small" severity="warning" tooltip="Xuất kho" onClick={() => openKho(row, 'xuat')} />
      <Button icon="pi pi-pencil" size="small" severity="info" tooltip="Sửa" onClick={() => openEdit(row)} />
      <Button icon="pi pi-trash" size="small" severity="danger" tooltip="Xóa" onClick={() => handleDelete(row)} />
    </div>
  );

  return (
    <div>
      <Toast ref={toast} />
      <ConfirmDialog />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Button icon={showCanhBao ? 'pi pi-list' : 'pi pi-exclamation-triangle'}
            label={showCanhBao ? 'Tất cả' : 'Sắp hết hàng'} size="small"
            severity={showCanhBao ? 'secondary' : 'danger'}
            onClick={() => setShowCanhBao(!showCanhBao)} />
          <Button icon="pi pi-refresh" size="small" severity="secondary" onClick={fetchAll} />
          {showCanhBao && <Tag value={`${items.length} nguyên vật liệu sắp hết`} severity="danger" />}
        </div>
        <Button label="Thêm nguyên vật liệu" icon="pi pi-plus" size="small"
          style={{ background: 'var(--color-burnt-orange)', border: 'none', color: '#f5f5f5' }} onClick={openCreate} />
      </div>

      <DataTable value={items} loading={loading} stripedRows size="small" emptyMessage="Không có nguyên vật liệu nào">
        <Column field="manvl" header="Mã NVL" style={{ width: 100 }} />
        <Column field="tennvl" header="Tên NVL" sortable />
        <Column field="donvitinh" header="Đơn vị" style={{ width: 80 }} />
        <Column header="Tồn kho" body={tonKhoBody} sortField="tonkho" sortable style={{ width: 160 }} />
        <Column header="Tồn tối thiểu" body={tonToiThieuBody} style={{ width: 140 }} />
        <Column header="Thao tác" body={actionBody} style={{ width: 210 }} />
      </DataTable>

      {/* Dialog thêm/sửa */}
      <Dialog header={editItem ? 'Sửa nguyên vật liệu' : 'Thêm nguyên vật liệu'}
        visible={dialog} style={{ width: 460 }} onHide={() => setDialog(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>MÃ NVL</label>
              <InputText className="w-full mt-1" value={form.manvl}
                onChange={e => setForm({ ...form, manvl: e.target.value })}
                placeholder="VD: NVL001" disabled={!!editItem} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>ĐƠN VỊ TÍNH</label>
              <InputText className="w-full mt-1" value={form.donvitinh}
                onChange={e => setForm({ ...form, donvitinh: e.target.value })}
                placeholder="VD: kg, lít, chai..." />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>TÊN NGUYÊN VẬT LIỆU</label>
            <InputText className="w-full mt-1" value={form.tennvl}
              onChange={e => setForm({ ...form, tennvl: e.target.value })}
              placeholder="VD: Đường cát trắng..." />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>
                TỒN KHO ({form.donvitinh || 'đơn vị'})
              </label>
              <InputNumber className="w-full mt-1" value={form.tonkho}
                onValueChange={e => setForm({ ...form, tonkho: e.value || 0 })}
                min={0} minFractionDigits={0} maxFractionDigits={3} disabled={!!editItem} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>
                TỒN TỐI THIỂU ({form.donvitinh || 'đơn vị'})
              </label>
              <InputNumber className="w-full mt-1" value={form.tontoithieu}
                onValueChange={e => setForm({ ...form, tontoithieu: e.value || 0 })}
                min={0} minFractionDigits={0} maxFractionDigits={3} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button label="Hủy" severity="secondary" size="small" onClick={() => setDialog(false)} />
            <Button label={editItem ? 'Cập nhật' : 'Tạo mới'} size="small" loading={saving}
              style={{ background: 'var(--color-burnt-orange)', border: 'none', color: '#f5f5f5' }} onClick={handleSave} />
          </div>
        </div>
      </Dialog>

      {/* Dialog nhập/xuất kho */}
      <Dialog header={
        <span>
          <i className={`pi ${khoType === 'nhap' ? 'pi-arrow-down' : 'pi-arrow-up'}`}
            style={{ marginRight: 8, color: khoType === 'nhap' ? 'var(--color-success)' : 'var(--color-warning)' }} />
          {khoType === 'nhap' ? 'Nhập kho' : 'Xuất kho'} — {khoItem?.tennvl}
        </span>
      }
        visible={khoDialog} style={{ width: 360 }} onHide={() => setKhoDialog(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 8 }}>
          <div style={{ padding: '10px 14px', background: 'var(--color-deep-espresso)', border: '1px solid var(--color-dark-gray)', fontSize: 13, color: 'var(--color-text-secondary)' }}>
            Tồn kho hiện tại:{' '}
            <span style={{ color: 'var(--color-caramel)', fontWeight: 700 }}>
              {Number(khoItem?.tonkho).toLocaleString('vi-VN')} {khoItem?.donvitinh}
            </span>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>
              SỐ LƯỢNG {khoType === 'nhap' ? 'NHẬP' : 'XUẤT'} ({khoItem?.donvitinh})
            </label>
            <InputNumber className="w-full mt-1" value={khoSoLuong}
              onValueChange={e => setKhoSoLuong(e.value || 0)}
              min={0} minFractionDigits={0} maxFractionDigits={3} autoFocus />
          </div>
          {khoType === 'xuat' && khoItem && khoSoLuong > khoItem.tonkho && (
            <div style={{ color: 'var(--color-error)', fontSize: 12 }}>
              <i className="pi pi-exclamation-triangle" style={{ marginRight: 6 }} />
              Số lượng xuất vượt quá tồn kho hiện tại!
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button label="Hủy" severity="secondary" size="small" onClick={() => setKhoDialog(false)} />
            <Button label={khoType === 'nhap' ? 'Nhập kho' : 'Xuất kho'} size="small" loading={savingKho}
              severity={khoType === 'nhap' ? 'success' : 'warning'} onClick={handleKho} />
          </div>
        </div>
      </Dialog>

      {/* Dialog chi tiết */}
      <Dialog header={`Chi tiết — ${detailItem?.tennvl}`}
        visible={detailDialog} style={{ width: 620 }} onHide={() => setDetailDialog(false)}>
        <TabView>
          <TabPanel header="Dùng trong món" leftIcon="pi pi-book mr-2">
            {loadingDetail ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--color-dark-gray)' }}>Đang tải...</div>
            ) : dungTrongMon.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--color-dark-gray)', fontSize: 13 }}>Chưa dùng trong món nào</div>
            ) : dungTrongMon.map(m => (
              <div key={m.monanid} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 10px', marginBottom: 4, background: 'var(--color-deep-espresso)', border: '1px solid var(--color-dark-gray)',
              }}>
                <div>
                  <span style={{ fontSize: 13, color: 'var(--color-off-white)' }}>{m.tenmon}</span>
                  <span style={{ fontSize: 10, color: 'var(--color-dark-gray)', marginLeft: 8 }}>{m.mamon}</span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--color-caramel)' }}>
                  {m.soluong} {detailItem?.donvitinh} / phần
                </span>
              </div>
            ))}
          </TabPanel>
          <TabPanel header="Lịch sử xuất" leftIcon="pi pi-history mr-2">
            {loadingDetail ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--color-dark-gray)' }}>Đang tải...</div>
            ) : lichSuXuat.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--color-dark-gray)', fontSize: 13 }}>Chưa có lịch sử xuất kho</div>
            ) : (
              <DataTable value={lichSuXuat} size="small" stripedRows>
                <Column field="madon" header="Mã đơn" style={{ width: 100 }} />
                <Column field="tenmon" header="Món ăn" />
                <Column header="Số lượng" body={r => `${r.soluong} ${detailItem?.donvitinh}`} style={{ width: 110 }} />
                <Column header="Thời gian" body={r => new Date(r.thoigianxuat).toLocaleString('vi-VN')} style={{ width: 150 }} />
              </DataTable>
            )}
          </TabPanel>
        </TabView>
      </Dialog>
    </div>
  );
};

export default NguyenVatLieuList;

