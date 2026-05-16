import { VaiTro } from './enums';
import { INguoiDungResponse } from './user';

export interface LoginRequest{
    tendangnhap:string;
    matkhau:string;
}

export interface LoginResponse{
    success:boolean;
    message :string;
    token?:string;
    user?:INguoiDungResponse;
}

export interface JWTPayload {
  id: number;
  tendangnhap: string;
  hoten: string;
  vaitro: VaiTro;
  iat?: number;
  exp?: number;
}
