export interface INguyenVatLieu {
  id: number;
  manvl: string;
  tennvl: string;
  donvitinh: string;
  tonkho: number;
  tontoithieu: number;
}

export interface ILichSuXuat {
  id: number;
  soluong: number;
  thoigianxuat: string;
  madon: string;
  tenmon: string;
}

export interface IDungTrongMon {
  monanid: number;
  mamon: string;
  tenmon: string;
  soluong: number;
  trangthai: string;
}
