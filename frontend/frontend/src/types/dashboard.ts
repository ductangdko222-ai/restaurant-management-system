// src/types/dashboard.ts - Types cho Dashboard
export interface ITongQuan {
  homNay: { sohoadon: number; tongthu: number };
  homQua: { sohoadon: number; tongthu: number };
  donHang: { tong: number; dangphucvu: number; chothanhtoan: number; dathanhtoan: number };
  ban: { tong: number; cokhach: number; trong: number; dattruoc: number };
}

export interface ICanhBao {
  nvlSapHet: { id: number; tennvl: string; tonkho: number; tontoithieu: number; donvitinh: string }[];
  banChoLau: { tenban: string; madon: string; phutcho: number }[];
  orderPending: { id: number; madon: string; tenban: string; somon: number }[];
}

export interface ITopMon {
  id: number;
  mamon: string;
  tenmon: string;
  tennhom: string;
  tongban: number;
  doanhthu: number;
}

export interface ISoSanh {
  ky1: { tungay: string; denngay: string; sohoadon: number; tongthu: number; trungbinh: number; byNgay: any[] };
  ky2: { tungay: string; denngay: string; sohoadon: number; tongthu: number; trungbinh: number; byNgay: any[] };
  tangTruong: { doanhThu: string | null; soHoaDon: string | null };
}
