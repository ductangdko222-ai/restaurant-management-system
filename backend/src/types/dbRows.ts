import { RowDataPacket } from 'mysql2';
import { PhuongThucThanhToan } from './enums';

export interface InvoiceRow extends RowDataPacket {
  id: number;
  mahoadon: string;
  donhangid: number;
  nguoithunganid?: number;
  phuongthucthanhtoan: PhuongThucThanhToan;
  tongtien: number;
  tienkhacdua: number;
  tienthua: number;
  thoigianthanhtoan: Date;
  ghichu?: string;
}

export interface RevenueStatsRow extends RowDataPacket {
  sohoadon: number;
  tongthu: number;
  giatrithbinh: number;
  tienmat: number;
  chuyenkhoan: number;
  vidientu: number;
}

export interface TopMonRow extends RowDataPacket {
  id: number;
  mamon: string;
  tenmon: string;
  giaban: number;
  tongban: number;
  doanhthu: number;
}

export interface RevenueByShiftRow extends RowDataPacket {
  sohoadon: number;
  tongthu: number;
  tienmat: number;
  chuyenkhoan: number;
  vidientu: number;
}

export interface RevenueByDayRow extends RowDataPacket {
  ngay: string;
  sohoadon: number;
  tongthu: number;
}

export interface OrderStatsRow extends RowDataPacket {
  tong: number;
  dangphucvu?: number;
  chothanhtoan?: number;
  dathanhtoan?: number;
}

export interface TableStatsRow extends RowDataPacket {
  tong: number;
  cokhach?: number;
  trong?: number;
  dattruoc?: number;
}

export interface QuarterComparisonRow extends RowDataPacket {
  sohoadon: number;
  tongthu: number;
  trungbinh: number;
  byNgay: RevenueByDayRow[];
}
