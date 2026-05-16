import { RowDataPacket, ResultSetHeader } from 'mysql2';
import db from '../config/db';
import bcrypt from 'bcryptjs';
import { KhachHangRow } from '../types/modelRows';

class KhachHang {

  // Đăng ký
  static async dangKy(data: {
    sodienthoai: string;
    matkhau: string;
    hoten?: string;
    email?: string;
  }): Promise<KhachHangRow | null> {
    try {
      const { sodienthoai, matkhau, hoten, email } = data;
      const matkhauHash = await bcrypt.hash(matkhau, 10);

      const [result] = await db.query<ResultSetHeader>(
        `INSERT INTO khachhang (sodienthoai, matkhau, hoten, email) 
         VALUES (?, ?, ?, ?)`,
        [sodienthoai, matkhauHash, hoten, email]
      );

      return await this.findById(result.insertId);
    } catch (error) {
      throw error;
    }
  }

  // Đăng nhập
  static async dangNhap(sodienthoai: string, matkhau: string): Promise<KhachHangRow | null> {
    try {
      const [rows] = await db.query<KhachHangRow[]>(
        `SELECT * FROM khachhang WHERE sodienthoai = ?`,
        [sodienthoai]
      );

      if (rows.length === 0) return null;

      const khachhang = rows[0];
      const hople = await bcrypt.compare(matkhau, khachhang.matkhau);
      if (!hople) return null;

      // Bỏ matkhau trước khi trả về
      const { matkhau: _, ...rest } = khachhang;
      return rest as KhachHangRow;
    } catch (error) {
      throw error;
    }
  }

  // Xem thông tin cá nhân
  static async findById(id: number): Promise<KhachHangRow | null> {
    try {
      const [rows] = await db.query<KhachHangRow[]>(
        `SELECT id, sodienthoai, hoten, email, diachi, ngaytao 
         FROM khachhang WHERE id = ?`,
        [id]
      );
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Cập nhật thông tin cá nhân
  static async capNhatThongTin(id: number, data: {
    hoten?: string;
    email?: string;
    diachi?: string;
  }): Promise<KhachHangRow | null> {
    try {
      const updates: string[] = [];
      const params: any[] = [];

      if (data.hoten)  { updates.push('hoten = ?');  params.push(data.hoten); }
      if (data.email)  { updates.push('email = ?');   params.push(data.email); }
      if (data.diachi) { updates.push('diachi = ?');  params.push(data.diachi); }

      if (updates.length === 0) return await this.findById(id);

      params.push(id);
      await db.query(
        `UPDATE khachhang SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      return await this.findById(id);
    } catch (error) {
      throw error;
    }
  }

  // Đổi mật khẩu
  static async doiMatKhau(id: number, matkhauCu: string, matkhauMoi: string): Promise<boolean> {
    try {
      const [rows] = await db.query<KhachHangRow[]>(
        `SELECT matkhau FROM khachhang WHERE id = ?`, [id]
      );
      if (rows.length === 0) return false;

      const hople = await bcrypt.compare(matkhauCu, rows[0].matkhau);
      if (!hople) throw new Error('Mật khẩu cũ không đúng');

      const matkhauHash = await bcrypt.hash(matkhauMoi, 10);
      await db.query(
        `UPDATE khachhang SET matkhau = ? WHERE id = ?`,
        [matkhauHash, id]
      );

      return true;
    } catch (error) {
      throw error;
    }
  }

  // Xem lịch sử đơn hàng
  static async lichSuDonHang(khachhangid: number): Promise<any[]> {
    try {
      const [rows] = await db.query<RowDataPacket[]>(
        `SELECT d.id, d.madon, d.tongthanhtoan, d.trangthai, 
                d.diachigiao, d.thoigiantao,
                COUNT(ct.id) as somon
         FROM donhang d
         LEFT JOIN chitietdonhang ct ON d.id = ct.donhangid
         WHERE d.khachhangid = ? AND d.loai = 'online'
         GROUP BY d.id
         ORDER BY d.thoigiantao DESC`,
        [khachhangid]
      );
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Xem chi tiết 1 đơn hàng
  static async chiTietDonHang(donhangid: number, khachhangid: number): Promise<any | null> {
    try {
      const [rows] = await db.query<RowDataPacket[]>(
        `SELECT d.*, 
                ct.id as chitietid, ct.soluong, ct.dongia, ct.thanhtien, ct.trangthai as trangthaichitiet,
                m.tenmon, m.hinhanh
         FROM donhang d
         LEFT JOIN chitietdonhang ct ON d.id = ct.donhangid
         LEFT JOIN monan m ON ct.monanid = m.id
         WHERE d.id = ? AND d.khachhangid = ?`,
        [donhangid, khachhangid]
      );

      if (rows.length === 0) return null;

      // Group chi tiết vào đơn hàng
      const donhang = { ...rows[0] };
      donhang.chitiet = rows.map(r => ({
        id: r.chitietid,
        tenmon: r.tenmon,
        hinhanh: r.hinhanh,
        soluong: r.soluong,
        dongia: r.dongia,
        thanhtien: r.thanhtien,
        trangthai: r.trangthaichitiet
      }));

      return donhang;
    } catch (error) {
      throw error;
    }
  }

  // Hủy đơn (chỉ hủy được khi còn choxacnhan)
  static async huyDonHang(donhangid: number, khachhangid: number): Promise<boolean> {
    try {
      const [result] = await db.query<ResultSetHeader>(
        `UPDATE donhang SET trangthai = 'dahuy'
         WHERE id = ? AND khachhangid = ? AND trangthai = 'dangphucvu'`,
        [donhangid, khachhangid]
      );

      if (result.affectedRows === 0) {
        throw new Error('Không thể hủy đơn hàng này');
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  // Kiểm tra số điện thoại đã tồn tại chưa
  static async exists(sodienthoai: string): Promise<boolean> {
    try {
      const [rows] = await db.query<KhachHangRow[]>(
        `SELECT id FROM khachhang WHERE sodienthoai = ?`,
        [sodienthoai]
      );
      return rows.length > 0;
    } catch (error) {
      throw error;
    }
  }
}

export default KhachHang;