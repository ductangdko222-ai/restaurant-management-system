import React, { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';
import { Tag } from 'primereact/tag';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import api from '../../services/api';
import { IKhuyenMai } from '../../types/promotion';

type Severity = 'success' | 'danger' | 'warning' | 'secondary' | null | undefined;

const loaiMap: Record<string, { label: string; severity: Severity }> = {
  giamphantra: { label: 'Giảm %', severity: 'success' },
  giamtien: { label: 'Giảm tiền', severity: 'warning' },
  combo: { label: 'Combo', severity: 'secondary' },
};

const loaiOptions = [
  { label: 'Giảm phần trăm', value: 'giamphantra' },
  { label: 'Giảm tiền', value: 'giamtien' },
  { label: 'Combo', value: 'combo' },
];

const trangThaiOptions = [
  { label: 'Hoạt động', value: 'hoatdong' },
  { label: 'Ngừng', value: 'ngung' },
];

const emptyForm: Omit<IKhuyenMai, 'id'> = {
  makm: '', tenkm: '', loai: 'giamphantra', giatri: 0,
  ngaybatdau: null, ngayketthuc: null, giobatdau: null, gioketthuc: null,
  trangthai: 'hoatdong',
};

const KhuyenMaiList = () => {
  const [items, setItems] = useState<IKhuyenMai[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTT, setFilterTT] = useState<string | undefined>(undefined);
  const [filterLoai, setFilterLoai] = useState<string | undefined>(undefined);
  const [dialog, setDialog] = useState(false);
  const [editItem, setEditItem] = useState<IKhuyenMai | null>(null);
  const [form, setForm] = useState<Omit<IKhuyenMai, 'id'>>(emptyForm);
  const [saving, setSaving] = useState(false);
  const toast = useRef<Toast>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await api.getKhuyenMai({ loai: filterLoai, trangthai: filterTT });
      setItems(res.data.data);
    } catch {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải dữ liệu' });
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [filterTT, filterLoai]);

  const openCreate = () => { setEditItem(null); setForm(emptyForm); setDialog(true); };
  const openEdit = (item: IKhuyenMai) => {
    setEditItem(item);
    setForm({
      makm: item.makm, tenkm: item.tenkm, loai: item.loai, giatri: item.giatri,
      ngaybatdau: item.ngaybatdau || null, ngayketthuc: item.ngayketthuc || null,
      giobatdau: item.giobatdau || null, gioketthuc: item.gioketthuc || null,
      trangthai: item.trangthai,
    });
    setDialog(true);
  };

  const handleSave = async () => {
    if (!form.makm || !form.tenkm || !form.loai || !form.giatri) {
      toast.current?.show({ severity: 'warn', summary: 'Thiếu thông tin', detail: 'Vui lòng nhập đủ thông tin' });
      return;
    }
    setSaving(true);
    try {
      if (editItem) {
        await api.updateKhuyenMai(editItem.id, form);
        toast.current?.show({ severity: 'success', summary: 'Thành công', detail: 'Đã cập nhật khuyến mãi' });
      } else {
        await api.createKhuyenMai(form);
        toast.current?.show({ severity: 'success', summary: 'Thành công', detail: 'Đã tạo khuyến mãi mới' });
      }
      setDialog(false); fetchAll();
    } catch (e: any) {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: e.response?.data?.message });
    } finally { setSaving(false); }
  };

  const handleDelete = (item: IKhuyenMai) => {
    confirmDialog({
      message: `Xóa khuyến mãi "${item.tenkm}"?`,
      header: 'Xác nhận xóa', icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Xóa', rejectLabel: 'Hủy',
      accept: async () => {
        try {
          await api.deleteKhuyenMai(item.id);
          toast.current?.show({ severity: 'success', summary: 'Đã xóa' });
          fetchAll();
        } catch (e: any) {
          toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: e.response?.data?.message });
        }
      }
    });
  };

  const handleCapNhatTrangThai = async (item: IKhuyenMai) => {
    try {
      const trangThaiMoi = item.trangthai === 'hoatdong' ? 'ngung' : 'hoatdong';
      await api.capNhatTrangThaiKhuyenMai(item.id, trangThaiMoi);
      toast.current?.show({ severity: 'success', summary: 'Đã cập nhật trạng thái' });
      fetchAll();
    } catch (e: any) {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: e.response?.data?.message });
    }
  };

  const loaiBody = (row: IKhuyenMai) => {
    const l = loaiMap[row.loai];
    return <Tag value={l?.label} severity={l?.severity} />;
  };
  const isHetHan = (km: IKhuyenMai): boolean => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const timeNow = now.toTimeString().slice(0, 5); // HH:MM

    if (km.ngayketthuc && km.ngayketthuc < today) return true;
    if (km.ngayketthuc && km.ngayketthuc === today) {
      if (km.gioketthuc && km.gioketthuc.slice(0, 5) < timeNow) return true;
    }
    return false;
  };

  const trangThaiBody = (row: IKhuyenMai) => {
    if (row.trangthai === 'ngung') {
      return <Tag value="Ngừng" severity="danger" />;
    }
    if (isHetHan(row)) {
      return <Tag value="Hết hạn" severity="secondary" />;
    }
    return <Tag value="Hoạt động" severity="success" />;
  };
  const giatriBody = (row: IKhuyenMai) => (
    <span style={{ color: 'var(--color-caramel)', fontWeight: 600 }}>
      {row.loai === 'giamphantra' ? `${row.giatri}%` : `${Number(row.giatri).toLocaleString('vi-VN')}đ`}
    </span>
  );
  const formatNgay = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatGio = (timeStr: string) => {
    return timeStr.slice(0, 5);
  };

  const thoiGianBody = (row: IKhuyenMai) => (
    <div style={{ fontSize: 11, lineHeight: 1.8 }}>
      {row.ngaybatdau ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-text-secondary)' }}>
          <i className="pi pi-calendar" style={{ fontSize: 10, color: 'var(--color-caramel)' }} />
          {formatNgay(row.ngaybatdau)}
          <span style={{ color: 'var(--color-dark-gray)' }}>→</span>
          {row.ngayketthuc ? formatNgay(row.ngayketthuc) : <span style={{ color: 'var(--color-dark-gray)' }}>∞</span>}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-dark-gray)' }}>
          <i className="pi pi-calendar" style={{ fontSize: 10 }} />
          Không giới hạn ngày
        </div>
      )}
      {row.giobatdau ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-text-secondary)' }}>
          <i className="pi pi-clock" style={{ fontSize: 10, color: 'var(--color-caramel)' }} />
          {formatGio(row.giobatdau)}
          <span style={{ color: 'var(--color-dark-gray)' }}>→</span>
          {row.gioketthuc ? formatGio(row.gioketthuc) : <span style={{ color: 'var(--color-dark-gray)' }}>∞</span>}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-dark-gray)' }}>
          <i className="pi pi-clock" style={{ fontSize: 10 }} />
          Không giới hạn giờ
        </div>
      )}
    </div>
  );
  const actionBody = (row: IKhuyenMai) => (
    <div style={{ display: 'flex', gap: 6 }}>
      <Button icon={row.trangthai === 'hoatdong' ? 'pi pi-pause' : 'pi pi-play'} size="small"
        severity={row.trangthai === 'hoatdong' ? 'warning' : 'success'}
        tooltip={row.trangthai === 'hoatdong' ? 'Tạm ngừng' : 'Kích hoạt'}
        onClick={() => handleCapNhatTrangThai(row)} />
      <Button icon="pi pi-pencil" size="small" severity="info" tooltip="Sửa" onClick={() => openEdit(row)} />
      <Button icon="pi pi-trash" size="small" severity="danger" tooltip="Xóa" onClick={() => handleDelete(row)} />
    </div>
  );

  return (
    <div>
      <Toast ref={toast} />
      <ConfirmDialog />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <Dropdown value={filterLoai} options={loaiOptions} onChange={e => setFilterLoai(e.value)}
            placeholder="Tất cả loại" showClear style={{ minWidth: 170 }} />
          <Dropdown value={filterTT} options={trangThaiOptions} onChange={e => setFilterTT(e.value)}
            placeholder="Tất cả trạng thái" showClear style={{ minWidth: 170 }} />
          <Button icon="pi pi-refresh" size="small" severity="secondary" onClick={fetchAll} />
        </div>
        <Button label="Thêm khuyến mãi" icon="pi pi-plus" size="small"
          style={{ background: 'var(--color-burnt-orange)', border: 'none', color: '#f5f5f5' }} onClick={openCreate} />
      </div>

      <DataTable value={items} loading={loading} stripedRows size="small" emptyMessage="Không có khuyến mãi nào">
        <Column field="makm" header="Mã KM" style={{ width: 100 }} />
        <Column field="tenkm" header="Tên KM" sortable />
        <Column header="Loại" body={loaiBody} style={{ width: 110 }} />
        <Column header="Giá trị" body={giatriBody} style={{ width: 110 }} />
        <Column header="Thời gian" body={thoiGianBody} style={{ width: 180 }} />
        <Column header="Trạng thái" body={trangThaiBody} style={{ width: 110 }} />
        <Column header="Thao tác" body={actionBody} style={{ width: 130 }} />
      </DataTable>

      <Dialog header={editItem ? 'Sửa khuyến mãi' : 'Thêm khuyến mãi'}
        visible={dialog} style={{ width: 520 }} onHide={() => setDialog(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>MÃ KHUYẾN MÃI</label>
              <InputText className="w-full mt-1" value={form.makm}
                onChange={e => setForm({ ...form, makm: e.target.value })}
                placeholder="VD: KM001" disabled={!!editItem} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>TÊN KHUYẾN MÃI</label>
              <InputText className="w-full mt-1" value={form.tenkm}
                onChange={e => setForm({ ...form, tenkm: e.target.value })}
                placeholder="VD: Giảm 10% cuối tuần" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>LOẠI</label>
              <Dropdown className="w-full mt-1" value={form.loai} options={loaiOptions}
                onChange={e => setForm({ ...form, loai: e.value })} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>
                GIÁ TRỊ {form.loai === 'giamphantra' ? '(%)' : '(đ)'}
              </label>
              <InputNumber className="w-full mt-1" value={form.giatri}
                onValueChange={e => setForm({ ...form, giatri: e.value || 0 })}
                min={0} max={form.loai === 'giamphantra' ? 100 : undefined} locale="vi-VN" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>NGÀY BẮT ĐẦU</label>
              <InputText className="w-full mt-1" type="date" value={form.ngaybatdau || ''}
                onChange={e => setForm({ ...form, ngaybatdau: e.target.value || null })} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>NGÀY KẾT THÚC</label>
              <InputText className="w-full mt-1" type="date" value={form.ngayketthuc || ''}
                onChange={e => setForm({ ...form, ngayketthuc: e.target.value || null })} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>GIỜ BẮT ĐẦU</label>
              <InputText className="w-full mt-1" type="time" value={form.giobatdau || ''}
                onChange={e => setForm({ ...form, giobatdau: e.target.value || null })} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>GIỜ KẾT THÚC</label>
              <InputText className="w-full mt-1" type="time" value={form.gioketthuc || ''}
                onChange={e => setForm({ ...form, gioketthuc: e.target.value || null })} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>TRẠNG THÁI</label>
            <Dropdown className="w-full mt-1" value={form.trangthai} options={trangThaiOptions}
              onChange={e => setForm({ ...form, trangthai: e.value })} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button label="Hủy" severity="secondary" size="small" onClick={() => setDialog(false)} />
            <Button label={editItem ? 'Cập nhật' : 'Tạo mới'} size="small" loading={saving}
              style={{ background: 'var(--color-burnt-orange)', border: 'none', color: '#f5f5f5' }} onClick={handleSave} />
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default KhuyenMaiList;

