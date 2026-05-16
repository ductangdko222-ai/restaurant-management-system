import { VaiTro, TrangThaiNguoiDung } from './enums';

export interface INguoiDung {
    id:number;
    tendangnhap:string;
    matkhau:string;
    hoten:string;
    vaitro:VaiTro;
    trangthai:TrangThaiNguoiDung;
    ngaytao:Date;
}

export interface INguoiDungResponse {
    id:number;
    tendangnhap:string;
    hoten:string;
    vaitro:VaiTro;
    trangthai:TrangThaiNguoiDung;
    ngaytao:Date;
}
