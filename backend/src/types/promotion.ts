import { LoaiKhuyenMai, TrangThaiKhuyenMai } from './enums';

export interface IKhuyenMai {
    id: number;
    makm: string;
    tenkm: string;
    loai: LoaiKhuyenMai;
    giatri: number;
    ngaybatdau?: string | null;
    ngayketthuc?: string | null;
    giobatdau?: string | null;
    gioketthuc?: string | null;
    trangthai: TrangThaiKhuyenMai;
}
