// models/Shift.ts
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import db from '../config/db';
import { ShiftRow } from '../types/modelRows';

class Shift {
  // Lấy ca đang mở của user
  static async findActiveByUser(nguoidungid: number): Promise<ShiftRow | null> {
    try {
      const [rows] = await db.query<ShiftRow[]>(
        `SELECT * FROM calamviec 
          WHERE trangthai = 'dangmo' 
          ORDER BY thoigianbatdau DESC 
          LIMIT 1;`,
        [nguoidungid]
      );
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Lấy tất cả ca làm việc
  static async findAll(filters?: {
    nguoidungid?: number;
    tungay?: string;
    denngay?: string;
    trangthai?: string;
  }): Promise<ShiftRow[]> {
    try {
      let query = `
        SELECT c.*, nd.hoten, nd.vaitro
        FROM calamviec c
        LEFT JOIN nguoidung nd ON c.nguoidungid = nd.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (filters?.nguoidungid) {
        query += ' AND c.nguoidungid = ?';
        params.push(filters.nguoidungid);
      }

      if (filters?.tungay) {
        query += ' AND DATE(c.thoigianbatdau) >= ?';
        params.push(filters.tungay);
      }

      if (filters?.denngay) {
        query += ' AND DATE(c.thoigianbatdau) <= ?';
        params.push(filters.denngay);
      }

      if (filters?.trangthai) {
        query += ' AND c.trangthai = ?';
        params.push(filters.trangthai);
      }

      query += ' ORDER BY c.thoigianbatdau DESC';

      const [rows] = await db.query<ShiftRow[]>(query, params);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Tìm ca theo ID
  static async findById(id: number): Promise<ShiftRow | null> {
    try {
      const [rows] = await db.query<ShiftRow[]>(
        `SELECT c.*, nd.hoten 
         FROM calamviec c
         LEFT JOIN nguoidung nd ON c.nguoidungid = nd.id
         WHERE c.id = ?`,
        [id]
      );
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Mở ca mới
  static async create(shiftData: {
    nguoidungid: number;
    tiendauca: number;
  }): Promise<ShiftRow | null> {
    try {
      const { nguoidungid, tiendauca } = shiftData;

      const [result] = await db.query<ResultSetHeader>(
        `INSERT INTO calamviec (nguoidungid, tiendauca) 
         VALUES (?, ?)`,
        [nguoidungid, tiendauca]
      );

      return await this.findById(result.insertId);
    } catch (error) {
      throw error;
    }
  }

  // Đóng ca
  static async close(id: number, tiencuoica: number): Promise<ShiftRow | null> {
    try {
      await db.query(
        `UPDATE calamviec 
         SET trangthai = 'dadong', 
             thoigianketthuc = NOW(), 
             tiencuoica = ?
         WHERE id = ?`,
        [tiencuoica, id]
      );

      return await this.findById(id);
    } catch (error) {
      throw error;
    }
  }

  static async calculateRevenue(calamviecid: number): Promise<{
    tongthu: number;
    sohoadon: number;
    tienmat: number;
    chuyenkhoan: number;
    vidientu: number;
    paypal: number;
  }> {
    try {
      const [rows] = await db.query<RowDataPacket[]>(
        `SELECT 
          COUNT(*) as sohoadon,
          SUM(hd.tongtien) as tongthu, -- Thêm hd. vào đây
          SUM(CASE WHEN hd.phuongthucthanhtoan = 'tienmat' THEN hd.tongtien ELSE 0 END) as tienmat, -- Thêm hd.
          SUM(CASE WHEN hd.phuongthucthanhtoan = 'chuyenkhoan' THEN hd.tongtien ELSE 0 END) as chuyenkhoan, -- Thêm hd.
          SUM(CASE WHEN hd.phuongthucthanhtoan = 'vidientu' THEN hd.tongtien ELSE 0 END) as vidientu, -- Thêm hd.
          SUM(CASE WHEN hd.phuongthucthanhtoan = 'paypal' THEN hd.tongtien ELSE 0 END) as paypal -- Thêm hd.
         FROM hoadon hd
         JOIN donhang dh ON hd.donhangid = dh.id
         WHERE dh.calamviecid = ?`,
        [calamviecid]
      );

      return {
        tongthu: Number(rows[0].tongthu) || 0,
        sohoadon: rows[0].sohoadon || 0,
        tienmat: Number(rows[0].tienmat) || 0,
          chuyenkhoan: Number(rows[0].chuyenkhoan) || 0,
          vidientu: Number(rows[0].vidientu) || 0,
          paypal: Number(rows[0].paypal) || 0
      };
    } catch (error) {
      console.error("Lỗi tại calculateRevenue:", error); // Thêm log để dễ debug
      throw error;
    }
  }
}

export default Shift;