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
  mota?: string;
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

export interface GioHang {
  mon: MonAn;
  soluong: number;
  bienthe: BienThe[];
  ghichu: string;
}
