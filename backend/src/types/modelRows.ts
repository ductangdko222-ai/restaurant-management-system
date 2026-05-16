import { RowDataPacket } from 'mysql2';
import { IDonHang, IChiTietDonHang } from './order';
import { INguoiDung } from './user';
import { IBan, IKhuVuc } from './area';
import { INhomMon } from './category';
import { IMonAn, IBienThe } from './menu';
import { INguyenVatLieu } from './material';
import { IKhuyenMai } from './promotion';
import { KhuVucCheBien } from './enums';

export interface OrderRow extends RowDataPacket, IDonHang {}
export interface OrderItemRow extends RowDataPacket, IChiTietDonHang {}
export interface UserRow extends RowDataPacket, INguoiDung {}
export interface TableRow extends RowDataPacket, IBan {
  maqr?: string;
  qrtrangthai?: string;
}
export interface ShiftRow extends RowDataPacket {
  id: number;
  nguoidungid: number;
  thoigianbatdau: Date;
  thoigianketthuc?: Date;
  tiendauca: number;
  tiencuoica: number;
  trangthai: 'dangmo' | 'dadong';
}
export interface AreaRow extends RowDataPacket, IKhuVuc {}
export interface CategoryRow extends RowDataPacket, INhomMon {}
export interface KitchenTicketRow extends RowDataPacket {
  id: number;
  maphieu: string;
  chitietdonhangid: number;
  khuvucchebien: KhuVucCheBien;
  nguoinhanid?: number;
  trangthai: 'moi' | 'danglam' | 'sansang';
  thoigiantao: Date;
  thoigianbatdau?: Date;
  thoigianhoanthanh?: Date;
}
export interface NVLRow extends RowDataPacket, INguyenVatLieu {}
export interface MenuItemRow extends RowDataPacket, IMonAn {}
export interface ModifierRow extends RowDataPacket, IBienThe {}
export interface KhachHangRow extends RowDataPacket {
  id: number;
  sodienthoai: string;
  hoten: string;
  email: string;
  diachi: string;
  ngaytao: Date;
}
export interface KhuyenMaiRow extends RowDataPacket, IKhuyenMai {}
