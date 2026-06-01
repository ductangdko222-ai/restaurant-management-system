import { TrangThaiDonHang, TrangThaiChiTiet } from './enums';
import { IBienThe } from './menu';

export interface IDonHang {
    id:number;
    madon:string;
    loai : 'taiban' | 'mangdi';
    banid?:number;
    nguoiphucvuid?:number;
    khachhangid?:number;
    tenkhachhang?:string;
    sodienthoai?:string;
    diachi?:string;
    tongtien:number;
    tiengiam:number;
    thue:number;
    tongthanhtoan:number;
    trangthai:TrangThaiDonHang;
    calamviecid:number;
    ghichu?:string;
    thoigiantao: Date;
    thoigiancapnhap:Date;
    chitiet?: IChiTietDonHang[];
}

export interface IChiTietDonHang{
    id:number;
    donhangid:number;
    mamon:number;
    tenmon?:string;
    soluong:number;
    dongia:number;
    thanhtien:number;
    ghichu?:string;
    trangthai:TrangThaiChiTiet;
    thoigiantao:Date;
    bienthe?:IBienThe[];
}
