// src/pages/Users/UserList.tsx
import React, { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';
import { Tag } from 'primereact/tag';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { NhanVien } from '../../types/users';

type Severity = 'success' | 'danger' | 'warning' | 'secondary' | null | undefined;

const vaitroOptions = [
    { label: 'Admin', value: 'admin' },
    { label: 'Phục vụ', value: 'phucvu' },
    { label: 'Bếp', value: 'bep' },
    { label: 'Thu ngân', value: 'thungan' },
];

const vaitroMap: Record<string, { label: string; severity: Severity }> = {
    admin: { label: 'Admin', severity: 'danger' },
    phucvu: { label: 'Phục vụ', severity: 'success' },
    bep: { label: 'Bếp', severity: 'warning' },
    bar: { label: 'Bar', severity: 'secondary' },
};

const trangThaiMap: Record<string, { label: string; severity: Severity }> = {
    hoatdong: { label: 'Hoạt động', severity: 'success' },
    nghiviec: { label: 'Nghỉ việc', severity: 'danger' },
};

const emptyCreateForm = { tendangnhap: '', matkhau: '', hoten: '', vaitro: 'phucvu' };
const emptyEditForm = { hoten: '', vaitro: 'phucvu', trangthai: 'hoatdong' };

const UserList = () => {
    const [users, setUsers] = useState<NhanVien[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterVT, setFilterVT] = useState<string | undefined>(undefined);
    const [filterTT, setFilterTT] = useState<string | undefined>(undefined);

    // Dialog tạo
    const [createDialog, setCreateDialog] = useState(false);
    const [createForm, setCreateForm] = useState(emptyCreateForm);
    const [creating, setCreating] = useState(false);

    // Dialog sửa
    const [editDialog, setEditDialog] = useState(false);
    const [editUser, setEditUser] = useState<NhanVien | null>(null);
    const [editForm, setEditForm] = useState(emptyEditForm);
    const [editing, setEditing] = useState(false);

    // Dialog đổi mật khẩu
    const [pwDialog, setPwDialog] = useState(false);
    const [pwUser, setPwUser] = useState<NhanVien | null>(null);
    const [newPw, setNewPw] = useState('');
    const [savingPw, setSavingPw] = useState(false);

    const toast = useRef<Toast>(null);
    const { user: currentUser } = useAuth();

    useEffect(() => { fetchUsers(); }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await api.getAllUsers();
            setUsers(res.data.data);
        } catch {
            toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải dữ liệu' });
        } finally { setLoading(false); }
    };

    const filteredUsers = users.filter(u =>
        (!filterVT || u.vaitro === filterVT) &&
        (!filterTT || u.trangthai === filterTT)
    );

    //  TẠO TÀI KHOẢN 
    const handleCreate = async () => {
        if (!createForm.tendangnhap || !createForm.matkhau || !createForm.hoten) {
            toast.current?.show({ severity: 'warn', summary: 'Thiếu thông tin' });
            return;
        }
        setCreating(true);
        try {
            await api.register(createForm);
            toast.current?.show({ severity: 'success', summary: 'Đã tạo tài khoản' });
            setCreateDialog(false);
            setCreateForm(emptyCreateForm);
            fetchUsers();
        } catch (e: any) {
            toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: e.response?.data?.message });
        } finally { setCreating(false); }
    };

    //  SỬA 
    const openEdit = (u: NhanVien) => {
        setEditUser(u);
        setEditForm({ hoten: u.hoten, vaitro: u.vaitro, trangthai: u.trangthai });
        setEditDialog(true);
    };

    const handleEdit = async () => {
        if (!editUser) return;
        setEditing(true);
        try {
            await api.updateUser(editUser.id, editForm);
            toast.current?.show({ severity: 'success', summary: 'Đã cập nhật' });
            setEditDialog(false);
            fetchUsers();
        } catch (e: any) {
            toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: e.response?.data?.message });
        } finally { setEditing(false); }
    };

    //  XÓA 
    const handleDelete = (u: NhanVien) => {
        if (u.id === currentUser?.id) {
            toast.current?.show({ severity: 'warn', summary: 'Không thể xóa tài khoản đang đăng nhập' });
            return;
        }
        confirmDialog({
            message: `Vô hiệu hóa tài khoản "${u.hoten}"?`,
            header: 'Xác nhận', icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Xác nhận', rejectLabel: 'Hủy',
            accept: async () => {
                try {
                    await api.deleteUser(u.id);
                    toast.current?.show({ severity: 'success', summary: 'Đã vô hiệu hóa' });
                    fetchUsers();
                } catch (e: any) {
                    toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: e.response?.data?.message });
                }
            }
        });
    };

    //  TEMPLATES 
    const vaitroBody = (row: NhanVien) => {
        const v = vaitroMap[row.vaitro] || { label: row.vaitro, severity: 'secondary' as Severity };
        return <Tag value={v.label} severity={v.severity} />;
    };

    const trangThaiBody = (row: NhanVien) => {
        const t = trangThaiMap[row.trangthai] || { label: row.trangthai, severity: 'secondary' as Severity };
        return <Tag value={t.label} severity={t.severity} />;
    };

    const actionBody = (row: NhanVien) => (
        <div style={{ display: 'flex', gap: 6 }}>
            <Button icon="pi pi-pencil" size="small" severity="info" tooltip="Sửa"
                onClick={() => openEdit(row)} />
            <Button icon="pi pi-trash" size="small" severity="danger" tooltip="Vô hiệu hóa"
                disabled={row.id === currentUser?.id}
                onClick={() => handleDelete(row)} />
        </div>
    );

    const ngayBody = (row: NhanVien) =>
        new Date(row.ngaytao).toLocaleDateString('vi-VN');

    return (
        <div>
            <Toast ref={toast} />
            <ConfirmDialog />

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                    <Dropdown value={filterVT} options={vaitroOptions} onChange={e => setFilterVT(e.value)}
                        placeholder="Tất cả vai trò" showClear style={{ minWidth: 150 }} />
                    <Dropdown value={filterTT}
                        options={[{ label: 'Hoạt động', value: 'hoatdong' }, { label: 'Nghỉ việc', value: 'nghiviec' }]}
                        onChange={e => setFilterTT(e.value)}
                        placeholder="Tất cả trạng thái" showClear style={{ minWidth: 160 }} />
                    <Button icon="pi pi-refresh" size="small" severity="secondary" onClick={fetchUsers} />
                </div>
                <Button label="Thêm nhân viên" icon="pi pi-plus" size="small"
                    style={{ background: 'var(--color-burnt-orange)', border: 'none', color: '#f5f5f5' }}
                    onClick={() => { setCreateForm(emptyCreateForm); setCreateDialog(true); }} />
            </div>

            <DataTable value={filteredUsers} loading={loading} stripedRows size="small"
                emptyMessage="Không có nhân viên nào">
                <Column field="id" header="ID" style={{ width: 60 }} />
                <Column field="tendangnhap" header="Tên đăng nhập" sortable />
                <Column field="hoten" header="Họ tên" sortable />
                <Column header="Vai trò" body={vaitroBody} style={{ width: 110 }} />
                <Column header="Trạng thái" body={trangThaiBody} style={{ width: 120 }} />
                <Column header="Ngày tạo" body={ngayBody} style={{ width: 110 }} />
                <Column header="Thao tác" body={actionBody} style={{ width: 100 }} />
            </DataTable>

            {/*  DIALOG TẠO  */}
            <Dialog header="Thêm nhân viên mới" visible={createDialog}
                style={{ width: 420 }} onHide={() => setCreateDialog(false)}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 8 }}>
                    <div>
                        <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>TÊN ĐĂNG NHẬP</label>
                        <InputText className="w-full mt-1" value={createForm.tendangnhap}
                            onChange={e => setCreateForm({ ...createForm, tendangnhap: e.target.value })}
                            placeholder="Tên đăng nhập..." />
                    </div>
                    <div>
                        <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>MẬT KHẨU</label>
                        <InputText className="w-full mt-1" type="password" value={createForm.matkhau}
                            onChange={e => setCreateForm({ ...createForm, matkhau: e.target.value })}
                            placeholder="Ít nhất 6 ký tự..." />
                    </div>
                    <div>
                        <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>HỌ TÊN</label>
                        <InputText className="w-full mt-1" value={createForm.hoten}
                            onChange={e => setCreateForm({ ...createForm, hoten: e.target.value })}
                            placeholder="Họ và tên..." />
                    </div>
                    <div>
                        <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>VAI TRÒ</label>
                        <Dropdown className="w-full mt-1" value={createForm.vaitro} options={vaitroOptions}
                            onChange={e => setCreateForm({ ...createForm, vaitro: e.value })} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <Button label="Hủy" severity="secondary" size="small" onClick={() => setCreateDialog(false)} />
                        <Button label="Tạo tài khoản" size="small" loading={creating}
                            style={{ background: 'var(--color-burnt-orange)', border: 'none', color: '#f5f5f5' }}
                            onClick={handleCreate} />
                    </div>
                </div>
            </Dialog>

            {/*  DIALOG SỬA  */}
            <Dialog header={`Sửa - ${editUser?.hoten}`} visible={editDialog}
                style={{ width: 380 }} onHide={() => setEditDialog(false)}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 8 }}>
                    <div>
                        <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>HỌ TÊN</label>
                        <InputText className="w-full mt-1" value={editForm.hoten}
                            onChange={e => setEditForm({ ...editForm, hoten: e.target.value })} />
                    </div>
                    <div>
                        <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>VAI TRÒ</label>
                        <Dropdown className="w-full mt-1" value={editForm.vaitro} options={vaitroOptions}
                            onChange={e => setEditForm({ ...editForm, vaitro: e.value })} />
                    </div>
                    <div>
                        <label style={{ fontSize: 11, color: 'var(--color-caramel)', letterSpacing: 1 }}>TRẠNG THÁI</label>
                        <Dropdown className="w-full mt-1" value={editForm.trangthai}
                            options={[{ label: 'Hoạt động', value: 'hoatdong' }, { label: 'Nghỉ việc', value: 'nghiviec' }]}
                            onChange={e => setEditForm({ ...editForm, trangthai: e.value })} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <Button label="Hủy" severity="secondary" size="small" onClick={() => setEditDialog(false)} />
                        <Button label="Cập nhật" size="small" loading={editing}
                            style={{ background: 'var(--color-burnt-orange)', border: 'none', color: '#f5f5f5' }}
                            onClick={handleEdit} />
                    </div>
                </div>
            </Dialog>
        </div>
    );
};

export default UserList;

