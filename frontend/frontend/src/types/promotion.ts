export interface IKhuyenMai {
  id: number;
  makm: string;
  tenkm: string;
  loai: 'giamphantra' | 'giamtien' | 'combo';
  giatri: number;
  ngaybatdau?: string | null;
  ngayketthuc?: string | null;
  giobatdau?: string | null;
  gioketthuc?: string | null;
  trangthai: 'hoatdong' | 'ngung';
}
