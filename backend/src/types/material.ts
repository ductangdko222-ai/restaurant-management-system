import { TrangThaiMon } from './enums';

export interface INguyenVatLieu {
    id: number;
    manvl: string;
    tennvl: string;
    donvitinh: string;
    tonkho: number;
    tontoithieu: number;
}

export interface ILichSuXuatNVL {
    id: number;
    soluong: number;
    thoigianxuat: Date;
    chitietdonhangid: number;
    madon: string;
    tenmon: string;
}

export interface IDungTrongMon {
    monanid: number;
    mamon: string;
    tenmon: string;
    soluong: number;
    trangthai: TrangThaiMon;
}
