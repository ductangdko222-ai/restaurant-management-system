import { TrangThaiBan } from './enums';

export interface IKhuVuc{
    id:number;
    tenkhuvuc:string;
    mota?:string;
    thutu:number;
}

export interface IBan{
    id:number;
    maban:string;
    tenban:string;
    khuvucid?:number;
    tenkhuvuc?:string;
    sochongoi:number;
    trangthai:TrangThaiBan;
    vitrix:number;
    vitriy:number;
}
