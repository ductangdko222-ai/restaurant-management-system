
export enum TrangThaiChiTiet {
  MOI = 'moi',
  DANG_LAM = 'danglam',
  SAN_SANG = 'sansang',
  DA_PHUC_VU = 'daphucvu',
}

export interface BienThe {
  id: number;
  loai: string;
  tenbienthe: string;
  giathem: number;
}

export interface MonAn {
  id: number;
  mamon: string;
  tenmon: string;
  giaban: number;
  hinhanh?: string;
  trangthai: string;
  khuvucchebien: 'bep' | 'bar';
  bienthe?: BienThe[];
}

export interface NhomMon {
  nhommonid: number;
  tennhom: string;
  thutu: number;
  monan: MonAn[];
}

export interface ChiTiet {
  id: number;
  monanid: number;
  tenmon: string;
  soluong: number;
  dongia: number;
  thanhtien: number;
  ghichu?: string;
  trangthai: string;
  bienthe?: BienThe[];
}

export interface ChiTietMon {
  id: number;
  tenmon: string;
  soluong: number;
  dongia: number;
  thanhtien: number;
  trangthai: string;
  hinhanh?: string;
}

export interface DonHang {
  id: number;
  madon: string;
  banid: number;
  tenban: string;
  trangthai: string;
  tongtien: number;
  tongthanhtoan: number;
  thoigiantao?: string;
  chitiet: ChiTiet[];
}
