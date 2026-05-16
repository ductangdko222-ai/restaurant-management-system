export interface ChiTiet {
  id: number;
  tenmon: string;
  soluong: number;
  dongia: number;
  thanhtien: number;
}

export interface DonHang {
  id: number;
  madon: string;
  tenban?: string;
  loai: string;
  trangthai: string;
  tongtien: number;
  tiengiam: number;
  thue: number;
  tongthanhtoan: number;
  chitiet: ChiTiet[];
}

export interface HoaDon {
  id: number;
  mahoadon: string;
  tongtien: number;
  phuongthucthanhtoan: string;
  thoigianthanhtoan: string;
  tenthungan: string;
  tienkhacdua: number;
  tienthua: number;
}

export interface IKhuyenMai {
  id: number;
  makm: string;
  tenkm: string;
  loai: 'giamphantra' | 'giamtien' | 'combo';
  giatri: number;
  trangthai: string;
}
