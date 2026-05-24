// src/pages/Menu/MenuList.tsx
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
import { TabView, TabPanel } from 'primereact/tabview';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import api from '../../services/api';
import { NhomMon, MonAn, BienThe, DinhMuc, NVL } from '../../types/menu';

type Severity = 'success' | 'danger' | 'warning' | 'secondary' | null | undefined;

const trangThaiMap: Record<string, { label: string; severity: Severity }> = {
  dangban: { label: 'Đang bán', severity: 'success' },
  ngungban: { label: 'Ngừng bán', severity: 'warning' },
  hethang: { label: 'Hết hàng', severity: 'danger' },
};
const trangThaiOptions = [
  { label: 'Đang bán', value: 'dangban' },
  { label: 'Ngừng bán', value: 'ngungban' },
  { label: 'Hết hàng', value: 'hethang' },
];
const khuvucOptions = [{ label: 'Bếp', value: 'bep' }, { label: 'Bar', value: 'bar' }];
const loaiBienTheOptions = [
  { label: 'Size', value: 'size' }, { label: 'Topping', value: 'topping' }, { label: 'Khác', value: 'khac' },
];

// Bảng convert đơn vị: đơn vị gốc -> các đơn vị có thể nhập
const donViConvert: Record<string, { label: string; value: string; heso: number }[]> = {
  'kg': [{ label: 'g (gram)', value: 'g', heso: 0.001 }, { label: 'kg', value: 'kg', heso: 1 }],
  'lít': [{ label: 'ml', value: 'ml', heso: 0.001 }, { label: 'lít', value: 'lít', heso: 1 }],
  'lit': [{ label: 'ml', value: 'ml', heso: 0.001 }, { label: 'lít', value: 'lít', heso: 1 }],
  'l': [{ label: 'ml', value: 'ml', heso: 0.001 }, { label: 'l', value: 'l', heso: 1 }],
};

const getDonViOptions = (nvlId: number, danhSach: NVL[]) => {
  const nvl = danhSach.find(n => n.id === nvlId);
  if (!nvl) return [];
  const key = nvl.donvitinh.toLowerCase().trim();
  return donViConvert[key] || [{ label: nvl.donvitinh, value: nvl.donvitinh, heso: 1 }];
};

const formatSoLuong = (dm: DinhMuc): string => {
  if (dm.donvinhap && dm.donvinhap !== dm.donvitinh) {
    const key = dm.donvitinh.toLowerCase().trim();
    const opt = (donViConvert[key] || []).find(o => o.value === dm.donvinhap);
    if (opt && opt.heso < 1) {
      const val = dm.soluong / opt.heso;
      return `${val % 1 === 0 ? val : val.toFixed(1)} ${dm.donvinhap}`;
    }
  }
  return `${dm.soluong} ${dm.donvitinh}`;
};

const emptyMonForm = { mamon: '', tenmon: '', nhommonid: 0, giaban: 0, trangthai: 'dangban' as any, khuvucchebien: 'bep' as any, mota: '', hinhanh: null as File | string | null };
const emptyNhomForm = { tennhom: '', mota: '', thutu: 0 };
const emptyBTForm = { loai: 'size', tenbienthe: '', giathem: 0 };
const emptyDMForm = { nguyenvatlieuid: 0, soluong: 0, donvinhap: '' };

const getImageUrl = (path?: string) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const base = process.env.REACT_APP_API_URL?.replace(/\/api\/?$/i, '') || 'http://localhost:5000';
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
};

const MenuList = () => {
  const [items, setItems] = useState<MonAn[]>([]);
  const [nhoms, setNhoms] = useState<NhomMon[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterNhom, setFilterNhom] = useState<number | undefined>(undefined);
  const [filterTT, setFilterTT] = useState<string | undefined>(undefined);

  const [monDialog, setMonDialog] = useState(false);
  const [editMon, setEditMon] = useState<MonAn | null>(null);
  const [monForm, setMonForm] = useState(emptyMonForm);
  const [savingMon, setSavingMon] = useState(false);

  const [nhomDialog, setNhomDialog] = useState(false);
  const [editNhom, setEditNhom] = useState<NhomMon | null>(null);
  const [nhomForm, setNhomForm] = useState(emptyNhomForm);
  const [savingNhom, setSavingNhom] = useState(false);

  const [bienTheDialog, setBienTheDialog] = useState(false);
  const [selectedMon, setSelectedMon] = useState<MonAn | null>(null);
  const [bienTheList, setBienTheList] = useState<BienThe[]>([]);
  const [bienTheForm, setBienTheForm] = useState(emptyBTForm);
  const [savingBT, setSavingBT] = useState(false);

  const [dinhMucDialog, setDinhMucDialog] = useState(false);
  const [dinhMucMon, setDinhMucMon] = useState<MonAn | null>(null);
  const [dinhMucList, setDinhMucList] = useState<DinhMuc[]>([]);
  const [danhSachNVL, setDanhSachNVL] = useState<NVL[]>([]);
  const [dinhMucForm, setDinhMucForm] = useState(emptyDMForm);
  const [savingDM, setSavingDM] = useState(false);
  const [loadingDM, setLoadingDM] = useState(false);

  const toast = useRef<Toast>(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [iRes, nRes] = await Promise.all([api.getMenuItems(), api.getCategories()]);
      setItems(iRes.data.data);
      setNhoms(nRes.data.data);
    } catch {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải dữ liệu' });
    } finally { setLoading(false); }
  };

  const filteredItems = items.filter(t =>
    (!filterNhom || t.nhommonid === filterNhom) &&
    (!filterTT || t.trangthai === filterTT)
  );

  //  MÓN ĂN 
  const openCreateMon = () => { setEditMon(null); setMonForm(emptyMonForm); setMonDialog(true); };
  const openEditMon = (m: MonAn) => {
    setEditMon(m);
    setMonForm({ mamon: m.mamon, tenmon: m.tenmon, nhommonid: m.nhommonid, giaban: m.giaban, trangthai: m.trangthai, khuvucchebien: m.khuvucchebien, mota: m.mota || '', hinhanh: m.hinhanh || null });
    setMonDialog(true);
  };
  const handleSaveMon = async () => {
    if (!monForm.mamon || !monForm.tenmon || !monForm.giaban) {
      toast.current?.show({ severity: 'warn', summary: 'Thiếu thông tin', detail: 'Vui lòng nhập đủ thông tin' });
      return;
    }
    setSavingMon(true);
    try {
      const formData = new FormData();
      formData.append('mamon', monForm.mamon);
      formData.append('tenmon', monForm.tenmon);
      formData.append('nhommonid', monForm.nhommonid.toString());
      formData.append('giaban', monForm.giaban.toString());
      formData.append('trangthai', monForm.trangthai);
      formData.append('khuvucchebien', monForm.khuvucchebien);
      formData.append('mota', monForm.mota);
      if (monForm.hinhanh instanceof File) {
        formData.append('hinhanh', monForm.hinhanh);
      }

      if (editMon) {
        await api.updateMenuItem(editMon.id, formData);
        toast.current?.show({ severity: 'success', summary: 'Thành công', detail: 'Đã cập nhật món' });
      } else {
        await api.createMenuItem(formData);
        toast.current?.show({ severity: 'success', summary: 'Thành công', detail: 'Đã tạo món mới' });
      }
      setMonDialog(false); fetchAll();
    } catch (e: any) {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: e.response?.data?.message });
    } finally { setSavingMon(false); }
  };
  const handleDeleteMon = (m: MonAn) => {
    confirmDialog({
      message: `Xóa món "${m.tenmon}"?`, header: 'Xác nhận xóa', icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Xóa', rejectLabel: 'Hủy',
      accept: async () => {
        try {
          await api.deleteMenuItem(m.id);
          toast.current?.show({ severity: 'success', summary: 'Đã xóa' });
          fetchAll();
        } catch (e: any) {
          toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: e.response?.data?.message });
        }
      }
    });
  };

  //  NHÓM MÓN 
  const openCreateNhom = () => { setEditNhom(null); setNhomForm(emptyNhomForm); setNhomDialog(true); };
  const openEditNhom = (n: NhomMon) => {
    setEditNhom(n);
    setNhomForm({ tennhom: n.tennhom, mota: n.mota || '', thutu: n.thutu || 0 });
    setNhomDialog(true);
  };
  const handleSaveNhom = async () => {
    if (!nhomForm.tennhom) {
      toast.current?.show({ severity: 'warn', summary: 'Thiếu thông tin', detail: 'Vui lòng nhập tên nhóm' });
      return;
    }
    setSavingNhom(true);
    try {
      if (editNhom) {
        await api.updateCategory(editNhom.id, nhomForm);
        toast.current?.show({ severity: 'success', summary: 'Thành công', detail: 'Đã cập nhật nhóm' });
      } else {
        await api.createCategory(nhomForm);
        toast.current?.show({ severity: 'success', summary: 'Thành công', detail: 'Đã tạo nhóm mới' });
      }
      setNhomDialog(false); fetchAll();
    } catch (e: any) {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: e.response?.data?.message });
    } finally { setSavingNhom(false); }
  };
  const handleDeleteNhom = (n: NhomMon) => {
    confirmDialog({
      message: `Xóa nhóm "${n.tennhom}"?`, header: 'Xác nhận xóa', icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Xóa', rejectLabel: 'Hủy',
      accept: async () => {
        try {
          await api.deleteCategory(n.id);
          toast.current?.show({ severity: 'success', summary: 'Đã xóa' });
          fetchAll();
        } catch (e: any) {
          toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: e.response?.data?.message });
        }
      }
    });
  };

  //  BIẾN THỂ 
  const openBienThe = async (m: MonAn) => {
    setSelectedMon(m); setBienTheForm(emptyBTForm);
    try {
      const res = await api.getMenuItem(m.id);
      setBienTheList(res.data.data?.bienthe || []);
    } catch { setBienTheList([]); }
    setBienTheDialog(true);
  };
  const handleAddBienThe = async () => {
    if (!bienTheForm.tenbienthe) {
      toast.current?.show({ severity: 'warn', summary: 'Thiếu thông tin', detail: 'Vui lòng nhập tên biến thể' });
      return;
    }
    setSavingBT(true);
    try {
      const res = await api.getMenuItem(selectedMon!.id);
      setBienTheList(res.data.data?.bienthe || []);
      setBienTheForm(emptyBTForm);
      toast.current?.show({ severity: 'success', summary: 'Đã thêm biến thể' });
    } catch (e: any) {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: e.response?.data?.message });
    } finally { setSavingBT(false); }
  };

  //  ĐỊNH MỨC NVL 
  const openDinhMuc = async (m: MonAn) => {
    setDinhMucMon(m); setDinhMucForm(emptyDMForm); setDinhMucDialog(true); setLoadingDM(true);
    try {
      const [dmRes, nvlRes] = await Promise.all([api.getDinhMucNVL(m.id), api.getNguyenVatLieu()]);
      setDinhMucList(dmRes.data.data);
      setDanhSachNVL(nvlRes.data.data);
    } catch {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải dữ liệu' });
    } finally { setLoadingDM(false); }
  };

  const handleUpsertDinhMuc = async () => {
    if (!dinhMucForm.nguyenvatlieuid || !dinhMucForm.soluong || dinhMucForm.soluong <= 0) {
      toast.current?.show({ severity: 'warn', summary: 'Thiếu thông tin', detail: 'Vui lòng chọn NVL và nhập số lượng' });
      return;
    }
    // Convert về đơn vị gốc trước khi lưu
    const opts = getDonViOptions(dinhMucForm.nguyenvatlieuid, danhSachNVL);
    const selectedDV = opts.find(o => o.value === dinhMucForm.donvinhap);
    const heso = selectedDV?.heso ?? 1;
    const soluongGoc = dinhMucForm.soluong * heso;

    setSavingDM(true);
    try {
      await api.upsertDinhMucNVL(dinhMucMon!.id, {
        nguyenvatlieuid: dinhMucForm.nguyenvatlieuid,
        soluong: soluongGoc,
        donvinhap: dinhMucForm.donvinhap,
      });
      const res = await api.getDinhMucNVL(dinhMucMon!.id);
      setDinhMucList(res.data.data);
      setDinhMucForm(emptyDMForm);
      toast.current?.show({ severity: 'success', summary: 'Đã cập nhật định mức' });
    } catch (e: any) {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: e.response?.data?.message });
    } finally { setSavingDM(false); }
  };

  const handleDeleteDinhMuc = (dm: DinhMuc) => {
    confirmDialog({
      message: `Xóa "${dm.tennvl}" khỏi công thức?`, header: 'Xác nhận xóa', icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Xóa', rejectLabel: 'Hủy',
      accept: async () => {
        try {
          await api.deleteDinhMucNVL(dinhMucMon!.id, dm.nguyenvatlieuid);
          setDinhMucList(prev => prev.filter(d => d.nguyenvatlieuid !== dm.nguyenvatlieuid));
          toast.current?.show({ severity: 'success', summary: 'Đã xóa định mức' });
        } catch (e: any) {
          toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: e.response?.data?.message });
        }
      }
    });
  };

  //  TEMPLATES 
  const statusBody = (row: MonAn) => { const s = trangThaiMap[row.trangthai]; return s ? <Tag value={s.label} severity={s.severity} /> : null; };
  const khuvucBody = (row: MonAn) => <span style={{ fontSize: 11, color: row.khuvucchebien === 'bar' ? 'var(--color-info)' : 'var(--color-warning)' }}>{row.khuvucchebien === 'bar' ? '● BAR' : '● BẾP'}</span>;
  const giaBody = (row: MonAn) => <span style={{ color: 'var(--color-caramel)' }}>{Number(row.giaban).toLocaleString('vi-VN')}đ</span>;
  const monActionBody = (row: MonAn) => (
    <div style={{ display: 'flex', gap: 6 }}>
      <Button icon="pi pi-list" size="small" severity="secondary" tooltip="Biến thể" onClick={() => openBienThe(row)} />
      <Button icon="pi pi-chart-bar" size="small" severity="warning" tooltip="Định mức NVL" onClick={() => openDinhMuc(row)} />
      <Button icon="pi pi-pencil" size="small" severity="info" tooltip="Sửa" onClick={() => openEditMon(row)} />
      <Button icon="pi pi-trash" size="small" severity="danger" tooltip="Xóa" onClick={() => handleDeleteMon(row)} />
    </div>
  );
  const nhomActionBody = (row: NhomMon) => (
    <div style={{ display: 'flex', gap: 6 }}>
      <Button icon="pi pi-pencil" size="small" severity="info" tooltip="Sửa" onClick={() => openEditNhom(row)} />
      <Button icon="pi pi-trash" size="small" severity="danger" tooltip="Xóa" onClick={() => handleDeleteNhom(row)} />
    </div>
  );

  const nhomOptions = nhoms.map(n => ({ label: n.tennhom, value: n.id }));
  const nvlOptions = danhSachNVL.map(n => ({
    label: `${n.tennvl} (${n.donvitinh}) — Kho: ${Number(n.tonkho).toLocaleString('vi-VN')}`,
    value: n.id,
  }));
  const selectedNVL = danhSachNVL.find(n => n.id === dinhMucForm.nguyenvatlieuid);
  const donViOpts = getDonViOptions(dinhMucForm.nguyenvatlieuid, danhSachNVL);
  const selectedDVOpt = donViOpts.find(o => o.value === dinhMucForm.donvinhap);
  const previewSoluong = dinhMucForm.soluong > 0 && selectedDVOpt
    ? dinhMucForm.soluong * selectedDVOpt.heso
    : 0;

  return (
    <div>
      <Toast ref={toast} />
      <ConfirmDialog />

      <TabView>
        <TabPanel header="Món ăn" leftIcon="pi pi-book mr-2">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <Dropdown value={filterNhom} options={nhomOptions} onChange={e => setFilterNhom(e.value)} placeholder="Tất cả nhóm" showClear style={{ minWidth: 160 }} />
              <Dropdown value={filterTT} options={trangThaiOptions} onChange={e => setFilterTT(e.value)} placeholder="Tất cả trạng thái" showClear style={{ minWidth: 170 }} />
              <Button icon="pi pi-refresh" size="small" severity="secondary" onClick={fetchAll} />
            </div>
            <Button label="Thêm món" icon="pi pi-plus" size="small" style={{ background: 'var(--color-burnt-orange)', border: 'none', color: '#f5f5f5' }} onClick={openCreateMon} />
          </div>
          <DataTable value={filteredItems} loading={loading} stripedRows size="small" emptyMessage="Không có món nào">
            <Column field="mamon" header="Mã món" sortable style={{ width: 90 }} />
            <Column field="tenmon" header="Tên món" sortable />
            <Column field="tennhom" header="Nhóm" sortable style={{ width: 120 }} />
            <Column header="Giá" body={giaBody} sortable style={{ width: 110 }} />
            <Column header="Khu vực" body={khuvucBody} style={{ width: 80 }} />
            <Column header="Trạng thái" body={statusBody} style={{ width: 110 }} />
            <Column header="Thao tác" body={monActionBody} style={{ width: 170 }} />
          </DataTable>
        </TabPanel>

        <TabPanel header="Nhóm món" leftIcon="pi pi-tags mr-2">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <Button label="Thêm nhóm" icon="pi pi-plus" size="small" style={{ background: 'var(--color-burnt-orange)', border: 'none', color: '#f5f5f5' }} onClick={openCreateNhom} />
          </div>
          <DataTable value={nhoms} loading={loading} stripedRows size="small" emptyMessage="Không có nhóm nào">
            <Column field="id" header="ID" style={{ width: 60 }} />
            <Column field="tennhom" header="Tên nhóm" sortable />
            <Column field="mota" header="Mô tả" body={r => r.mota || '—'} />
            <Column field="thutu" header="Thứ tự" sortable style={{ width: 90 }} />
            <Column header="Số món" body={r => items.filter(i => i.nhommonid === r.id).length} style={{ width: 80 }} />
            <Column header="Thao tác" body={nhomActionBody} style={{ width: 100 }} />
          </DataTable>
        </TabPanel>
      </TabView>

      {/* DIALOG MÓN ĂN */}
      <Dialog header={editMon ? 'Sửa món ăn' : 'Thêm món mới'} visible={monDialog} style={{ width: 480 }} onHide={() => setMonDialog(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>MÃ MÓN</label>
              <InputText className="w-full mt-1" value={monForm.mamon} onChange={e => setMonForm({ ...monForm, mamon: e.target.value })} placeholder="VD: CF001..." disabled={!!editMon} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>TÊN MÓN</label>
              <InputText className="w-full mt-1" value={monForm.tenmon} onChange={e => setMonForm({ ...monForm, tenmon: e.target.value })} placeholder="Tên món ăn..." />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>NHÓM MÓN</label>
              <Dropdown className="w-full mt-1" value={monForm.nhommonid} options={nhomOptions} onChange={e => setMonForm({ ...monForm, nhommonid: e.value })} placeholder="Chọn nhóm" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>GIÁ BÁN (đ)</label>
              <InputNumber className="w-full mt-1" value={monForm.giaban} onValueChange={e => setMonForm({ ...monForm, giaban: e.value || 0 })} locale="vi-VN" min={0} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>KHU VỰC CHẾ BIẾN</label>
              <Dropdown className="w-full mt-1" value={monForm.khuvucchebien} options={khuvucOptions} onChange={e => setMonForm({ ...monForm, khuvucchebien: e.value })} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>TRẠNG THÁI</label>
              <Dropdown className="w-full mt-1" value={monForm.trangthai} options={trangThaiOptions} onChange={e => setMonForm({ ...monForm, trangthai: e.value })} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>MÔ TẢ</label>
            <InputText className="w-full mt-1" value={monForm.mota} onChange={e => setMonForm({ ...monForm, mota: e.target.value })} placeholder="Mô tả món ăn..." />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>HÌNH ẢNH</label>
            <input type="file" accept="image/*" className="w-full mt-1" onChange={(e) => setMonForm({ ...monForm, hinhanh: e.target.files?.[0] || '' })} />
            {editMon && monForm.hinhanh && typeof monForm.hinhanh === 'string' && (
              <div style={{ marginTop: 8 }}>
                <img src={getImageUrl(monForm.hinhanh)} alt="Current" style={{ maxWidth: '100px', maxHeight: '100px' }} />
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button label="Hủy" severity="secondary" size="small" onClick={() => setMonDialog(false)} />
            <Button label={editMon ? 'Cập nhật' : 'Tạo mới'} size="small" loading={savingMon} style={{ background: 'var(--color-burnt-orange)', border: 'none', color: '#f5f5f5' }} onClick={handleSaveMon} />
          </div>
        </div>
      </Dialog>

      {/* DIALOG NHÓM MÓN */}
      <Dialog header={editNhom ? 'Sửa nhóm món' : 'Thêm nhóm mới'} visible={nhomDialog} style={{ width: 380 }} onHide={() => setNhomDialog(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 8 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>TÊN NHÓM</label>
            <InputText className="w-full mt-1" value={nhomForm.tennhom} onChange={e => setNhomForm({ ...nhomForm, tennhom: e.target.value })} placeholder="VD: Cà phê, Trà sữa..." />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>MÔ TẢ</label>
            <InputText className="w-full mt-1" value={nhomForm.mota} onChange={e => setNhomForm({ ...nhomForm, mota: e.target.value })} placeholder="Mô tả nhóm..." />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>THỨ TỰ</label>
            <InputNumber className="w-full mt-1" value={nhomForm.thutu} onValueChange={e => setNhomForm({ ...nhomForm, thutu: e.value || 0 })} min={0} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button label="Hủy" severity="secondary" size="small" onClick={() => setNhomDialog(false)} />
            <Button label={editNhom ? 'Cập nhật' : 'Tạo mới'} size="small" loading={savingNhom} style={{ background: 'var(--color-burnt-orange)', border: 'none', color: '#f5f5f5' }} onClick={handleSaveNhom} />
          </div>
        </div>
      </Dialog>

      {/* DIALOG BIẾN THỂ */}
      <Dialog header={`Biến thể — ${selectedMon?.tenmon}`} visible={bienTheDialog} style={{ width: 500 }} onHide={() => setBienTheDialog(false)}>
        <div style={{ paddingTop: 8 }}>
          <div style={{ marginBottom: 16 }}>
            {bienTheList.length === 0
              ? <div style={{ fontSize: 12, color: 'var(--color-dark-gray)', textAlign: 'center', padding: '16px 0' }}>Chưa có biến thể nào</div>
              : bienTheList.map(bt => (
                <div key={bt.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', marginBottom: 4, background: 'var(--color-deep-espresso)', border: '1px solid var(--color-dark-gray)' }}>
                  <div>
                    <span style={{ fontSize: 13, color: 'var(--color-off-white)' }}>{bt.tenbienthe}</span>
                    <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginLeft: 8 }}>{bt.loai}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 12, color: 'var(--color-caramel)' }}>+{Number(bt.giathem).toLocaleString('vi-VN')}đ</span>
                    <Button icon="pi pi-trash" size="small" severity="danger" text onClick={() => bt.id} />
                  </div>
                </div>
              ))}
          </div>
          <div style={{ borderTop: '1px solid var(--color-dark-gray)', paddingTop: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1, marginBottom: 10 }}>THÊM BIẾN THỂ</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div>
                <label style={{ fontSize: 10, color: 'var(--color-dark-gray)' }}>Loại</label>
                <Dropdown className="w-full mt-1" value={bienTheForm.loai} options={loaiBienTheOptions} onChange={e => setBienTheForm({ ...bienTheForm, loai: e.value })} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: 'var(--color-dark-gray)' }}>Tên biến thể</label>
                <InputText className="w-full mt-1" value={bienTheForm.tenbienthe} onChange={e => setBienTheForm({ ...bienTheForm, tenbienthe: e.target.value })} placeholder="VD: Size L..." />
              </div>
              <div>
                <label style={{ fontSize: 10, color: 'var(--color-dark-gray)' }}>Giá thêm (đ)</label>
                <InputNumber className="w-full mt-1" value={bienTheForm.giathem} onValueChange={e => setBienTheForm({ ...bienTheForm, giathem: e.value || 0 })} min={0} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button label="Thêm" icon="pi pi-plus" size="small" loading={savingBT} style={{ background: 'var(--color-burnt-orange)', border: 'none', color: '#f5f5f5' }} onClick={handleAddBienThe} />
            </div>
          </div>
        </div>
      </Dialog>

      {/* DIALOG ĐỊNH MỨC NVL */}
      <Dialog header={`Định mức NVL — ${dinhMucMon?.tenmon}`} visible={dinhMucDialog} style={{ width: 600 }} onHide={() => setDinhMucDialog(false)}>
        <div style={{ paddingTop: 8 }}>

          {/* Danh sách định mức */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1, marginBottom: 8 }}>CÔNG THỨC HIỆN TẠI</div>
            {loadingDM ? (
              <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--color-dark-gray)', fontSize: 12 }}>Đang tải...</div>
            ) : dinhMucList.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--color-dark-gray)', textAlign: 'center', padding: '16px 0' }}>Chưa có định mức nào</div>
            ) : dinhMucList.map(dm => (
              <div key={dm.nguyenvatlieuid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', marginBottom: 4, background: 'var(--color-deep-espresso)', border: '1px solid var(--color-dark-gray)' }}>
                <div>
                  <span style={{ fontSize: 13, color: 'var(--color-off-white)' }}>{dm.tennvl}</span>
                  {Number(dm.tonkho) <= 0 && (
                    <span style={{ fontSize: 10, color: 'var(--color-error)', marginLeft: 8 }}>
                      <i className="pi pi-exclamation-triangle" style={{ marginRight: 3 }} />Hết kho
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {/* Hiển thị theo đơn vị nhỏ nếu có */}
                  <span style={{ fontSize: 13, color: 'var(--color-caramel)', fontWeight: 600 }}>
                    {formatSoLuong(dm)} / phần
                  </span>
                  {/* Hiển thị thêm đơn vị gốc nếu khác */}
                  {dm.donvinhap && dm.donvinhap !== dm.donvitinh && (
                    <span style={{ fontSize: 10, color: 'var(--color-dark-gray)' }}>({dm.soluong} {dm.donvitinh})</span>
                  )}
                  <span style={{ fontSize: 10, color: '#444' }}>
                    Kho: {Number(dm.tonkho).toLocaleString('vi-VN')} {dm.donvitinh}
                  </span>
                  <Button icon="pi pi-trash" size="small" severity="danger" text onClick={() => handleDeleteDinhMuc(dm)} />
                </div>
              </div>
            ))}
          </div>

          {/* Form thêm/cập nhật */}
          <div style={{ borderTop: '1px solid var(--color-dark-gray)', paddingTop: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1, marginBottom: 10 }}>THÊM / CẬP NHẬT ĐỊNH MỨC</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 130px 40px', gap: 8, alignItems: 'end' }}>
              <div>
                <label style={{ fontSize: 10, color: 'var(--color-dark-gray)', display: 'block', marginBottom: 4 }}>Nguyên vật liệu</label>
                <Dropdown
                  className="w-full" value={dinhMucForm.nguyenvatlieuid} options={nvlOptions}
                  onChange={e => {
                    const opts = getDonViOptions(e.value, danhSachNVL);
                    setDinhMucForm({ ...dinhMucForm, nguyenvatlieuid: e.value, soluong: 0, donvinhap: opts[0]?.value || '' });
                  }}
                  placeholder="Chọn NVL..." filter emptyMessage="Không có NVL"
                />
              </div>
              <div>
                <label style={{ fontSize: 10, color: 'var(--color-dark-gray)', display: 'block', marginBottom: 4 }}>Đơn vị</label>
                <Dropdown
                  className="w-full" value={dinhMucForm.donvinhap}
                  options={donViOpts.map(o => ({ label: o.label, value: o.value }))}
                  onChange={e => setDinhMucForm({ ...dinhMucForm, donvinhap: e.value })}
                  disabled={!dinhMucForm.nguyenvatlieuid} placeholder="—"
                />
              </div>
              <div>
                <label style={{ fontSize: 10, color: 'var(--color-dark-gray)', display: 'block', marginBottom: 4 }}>
                  Số lượng {dinhMucForm.donvinhap ? `(${dinhMucForm.donvinhap})` : ''}
                </label>
                <InputNumber
                  className="w-full" value={dinhMucForm.soluong}
                  onValueChange={e => setDinhMucForm({ ...dinhMucForm, soluong: e.value || 0 })}
                  min={0} minFractionDigits={0} maxFractionDigits={1} placeholder="0"
                />
              </div>
              <Button icon="pi pi-check" size="small" loading={savingDM}
                style={{ background: 'var(--color-burnt-orange)', border: 'none', color: '#f5f5f5', height: 38 }}
                onClick={handleUpsertDinhMuc}
              />
            </div>

            {/* Preview convert */}
            {dinhMucForm.nguyenvatlieuid > 0 && dinhMucForm.soluong > 0 && selectedNVL && (
              <div style={{ marginTop: 8, padding: '6px 10px', background: 'var(--color-deep-espresso)', border: '1px solid var(--color-dark-gray)', fontSize: 11 }}>
                <span style={{ color: 'var(--color-dark-gray)' }}>Lưu vào DB: </span>
                <span style={{ color: 'var(--color-caramel)', fontWeight: 600 }}>
                  {previewSoluong % 1 === 0 ? previewSoluong : previewSoluong.toFixed(4)} {selectedNVL.donvitinh}
                </span>
                <span style={{ color: 'var(--color-dark-gray)' }}> / phần</span>
              </div>
            )}
            <div style={{ fontSize: 11, color: 'var(--color-dark-gray)', marginTop: 8 }}>
              * Nếu NVL đã có trong công thức, nhập lại sẽ cập nhật số lượng mới
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default MenuList;


