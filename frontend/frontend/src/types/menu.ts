export interface NhomMon {
  id: number;
  tennhom: string;
  mota?: string;
  thutu?: number;
}

export interface MonAn {
  id: number;
  mamon: string;
  tenmon: string;
  nhommonid: number;
  tennhom?: string;
  giaban: number;
  trangthai: 'dangban' | 'ngungban' | 'hethang';
  khuvucchebien: 'bep' | 'bar';
  mota?: string;
  hinhanh?: string;
}

export interface BienThe {
  id: number;
  monanid: number;
  loai: string;
  tenbienthe: string;
  giathem: number;
}

export interface DinhMuc {
  id: number;
  monanid: number;
  nguyenvatlieuid: number;
  soluong: number;
  donvinhap?: string;
  tennvl: string;
  donvitinh: string;
  tonkho: number;
}

export interface NVL {
  id: number;
  manvl: string;
  tennvl: string;
  donvitinh: string;
  tonkho: number;
}
