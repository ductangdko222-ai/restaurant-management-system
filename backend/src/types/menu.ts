import { TrangThaiMon, KhuVucCheBien, LoaiBienThe } from './enums';

export interface IMonAn{
    id:number;
    mamon:string;
    tenmon:string;
    nhommonid?:number;
    tennhom?:string;
    giaban:number;
  tinhthue:boolean;
    trangthai:TrangThaiMon;
    hinhanh?:string;
    mota?:string;
    khuvucchebien:KhuVucCheBien;
}

export interface IBienThe{
    id:number;
    monanid:number;
    loai:LoaiBienThe;
    tenbienthe:string;
    giathem:number;
}

export interface DinhMuc {
  id: number;
  monanid: number;
  nguyenvatlieuid: number;
  soluong: number;
  tennvl: string;
  donvitinh: string;
  tonkho: number;
}
