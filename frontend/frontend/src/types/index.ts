export enum VaiTro {
  ADMIN = 'admin',
  THU_NGAN = 'thungan',
  PHUC_VU = 'phucvu',
  BEP = 'bep'
}

export enum TrangThaiBan {
  TRONG = 'trong',
  CO_KHACH = 'cokhach',
  DAT_TRUOC = 'dattruoc'
}

export enum TrangThaiMon {
  DANG_BAN = 'dangban',
  NGUNG_BAN = 'ngungban',
  HET_HANG = 'hethang'
}

export enum TrangThaiDonHang {
  DANG_PHUC_VU = 'dangphucvu',
  CHO_THANH_TOAN = 'chothanhtoan',
  DA_THANH_TOAN = 'dathanhtoan',
  DA_HUY = 'dahuy'
}

export enum TrangThaiChiTiet {
  MOI = 'moi',
  DANG_LAM = 'danglam',
  SAN_SANG = 'sansang',
  DA_PHUC_VU = 'daphucvu'
}

export interface User {
  id: number;
  tendangnhap: string;
  hoten: string;
  vaitro: VaiTro;
  trangthai: string;
  ngaytao: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface KhuVuc {
  id: number;
  tenkhuvuc: string;
  mota?: string;
  thutu: number;
}

export interface Ban {
  id: number;
  maban: string;
  tenban: string;
  khuvucid?: number;
  tenkhuvuc?: string;
  sochongoi: number;
  trangthai: TrangThaiBan;
  vitrix: number;
  vitriy: number;
}

export interface NhomMon {
  id: number;
  tennhom: string;
  mota?: string;
  thutu: number;
}

export interface MonAn {
  id: number;
  mamon: string;
  tenmon: string;
  nhommonid?: number;
  tennhom?: string;
  giaban: number;
  tinhthue: boolean;
  trangthai: TrangThaiMon;
  hinhanh?: string;
  mota?: string;
  khuvucchebien: 'bep' | 'bar';
}

export interface BienThe {
  id: number;
  monanid: number;
  loai: 'size' | 'topping' | 'khac';
  tenbienthe: string;
  giathem: number;
}

export interface DonHang {
  id: number;
  madon: string;
  loai: 'taiban' | 'mangdi';
  banid?: number;
  tenban?: string;
  nguoiphucvuid?: number;
  tongtien: number;
  tiengiam: number;
  thue: number;
  tongthanhtoan: number;
  trangthai: TrangThaiDonHang;
  ghichu?: string;
  thoigiantao: string;
  chitiet?: ChiTietDonHang[];
}

export interface ChiTietDonHang {
  id: number;
  donhangid: number;
  monanid: number;
  tenmon: string;
  soluong: number;
  dongia: number;
  thanhtien: number;
  ghichu?: string;
  trangthai: TrangThaiChiTiet;
  bienthe?: BienThe[];
}

export interface PhieuBep {
  id: number;
  maphieu: string;
  chitietdonhangid: number;
  khuvucchebien: 'bep' | 'bar';
  trangthai: 'moi' | 'danglam' | 'sansang';
  tenmon: string;
  soluong: number;
  tenban?: string;
  madon: string;
  ghichumon?: string;
  thoigiantao: string;
  bienthe?: BienThe[];
}
 export interface ICaLamViec {
  id: number;
  nguoidungid: number;
  hoten: string;
  thoigianbatdau: string;
  thoigianketthuc?: string;
  tiendauca: number;
  tiencuoica: number;
  trangthai: 'dangmo' | 'dadong';
}
export interface IDoanhThu {
  tongthu: number;
  sohoadon: number;
  tienmat: number;
  chuyenkhoan: number;
  vidientu: number;
}
