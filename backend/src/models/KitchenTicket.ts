import { RowDataPacket, ResultSetHeader } from 'mysql2';
import db from '../config/db';
import { KhuVucCheBien } from '../types';
import { KitchenTicketRow } from '../types/modelRows';

class KitchenTicket {
  static async findAll(filters?: {
    khuvucchebien?: KhuVucCheBien;
    trangthai?: string;
    tungay?: string;
  }): Promise<any[]> {
    try {
      let query = `
        SELECT 
          pb.*,
          ct.soluong,
          ct.ghichu as ghichumon,
          m.tenmon,
          m.hinhanh,
          d.madon,
          b.tenban,
          nd.hoten as tennguoinhan
        FROM phieubep pb
        LEFT JOIN chitietdonhang ct ON pb.chitietdonhangid = ct.id
        LEFT JOIN monan m ON ct.monanid = m.id
        LEFT JOIN donhang d ON ct.donhangid = d.id
        LEFT JOIN ban b ON d.banid = b.id
        LEFT JOIN nguoidung nd ON pb.nguoinhanid = nd.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (filters?.khuvucchebien) {
        query += ' AND pb.khuvucchebien = ?';
        params.push(filters.khuvucchebien);
      }
      if (filters?.trangthai) {
        query += ' AND pb.trangthai = ?';
        params.push(filters.trangthai);
      }
      if (filters?.tungay) {
        query += ' AND DATE(pb.thoigiantao) >= ?';
        params.push(filters.tungay);
      }

      query += ' ORDER BY pb.thoigiantao DESC';

      const [rows] = await db.query<KitchenTicketRow[]>(query, params);

      for (let ticket of rows) {
        const [modifiers] = await db.query<RowDataPacket[]>(
          `SELECT btc.*, bt.tenbienthe 
           FROM bienthedachon btc
           LEFT JOIN bienthe bt ON btc.bientheit = bt.id
           WHERE btc.chitietdonhangid = ?`,
          [ticket.chitietdonhangid]
        );
        (ticket as any).bienthe = modifiers;
      }

      return rows;
    } catch (error) { throw error; }
  }

  static async findById(id: number): Promise<any> {
    try {
      const [rows] = await db.query<KitchenTicketRow[]>(
        `SELECT 
          pb.*,
          ct.soluong,
          ct.monanid,
          ct.ghichu as ghichumon,
          m.tenmon,
          d.madon,
          b.tenban
        FROM phieubep pb
        LEFT JOIN chitietdonhang ct ON pb.chitietdonhangid = ct.id
        LEFT JOIN monan m ON ct.monanid = m.id
        LEFT JOIN donhang d ON ct.donhangid = d.id
        LEFT JOIN ban b ON d.banid = b.id
        WHERE pb.id = ?`,
        [id]
      );
      return rows[0] || null;
    } catch (error) { throw error; }
  }

  static async create(ticketData: {
    maphieu: string;
    chitietdonhangid: number;
    khuvucchebien: KhuVucCheBien;
  }): Promise<any> {
    try {
      const { maphieu, chitietdonhangid, khuvucchebien } = ticketData;
      const [result] = await db.query<ResultSetHeader>(
        `INSERT INTO phieubep (maphieu, chitietdonhangid, khuvucchebien) VALUES (?, ?, ?)`,
        [maphieu, chitietdonhangid, khuvucchebien]
      );
      return await this.findById(result.insertId);
    } catch (error) { throw error; }
  }

  static async updateStatus(id: number, data: {
    trangthai: string;
    nguoinhanid?: number;
  }): Promise<any> {
    try {
      const { trangthai, nguoinhanid } = data;
      let updates = 'trangthai = ?';
      const params: any[] = [trangthai];

      if (trangthai === 'danglam') {
        updates += ', thoigianbatdau = NOW()';
        if (nguoinhanid) { updates += ', nguoinhanid = ?'; params.push(nguoinhanid); }
      } else if (trangthai === 'sansang') {
        updates += ', thoigianhoanthanh = NOW()';
      }

      params.push(id);
      await db.query(`UPDATE phieubep SET ${updates} WHERE id = ?`, params);

      const ticket = await this.findById(id);
      if (ticket) {
        let chitietStatus = 'moi';
        if (trangthai === 'danglam') chitietStatus = 'danglam';
        else if (trangthai === 'sansang') chitietStatus = 'sansang';
        await db.query(
          'UPDATE chitietdonhang SET trangthai = ? WHERE id = ?',
          [chitietStatus, ticket.chitietdonhangid]
        );
      }

      return await this.findById(id);
    } catch (error) { throw error; }
  }

  static async generateTicketCode(khuvuc: KhuVucCheBien): Promise<string> {
    try {
      const prefix = khuvuc === KhuVucCheBien.BEP ? 'B' : 'BAR';
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const [rows] = await db.query<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM phieubep WHERE khuvucchebien = ? AND DATE(thoigiantao) = CURDATE()`,
        [khuvuc]
      );
      return `${prefix}${date}${String(rows[0].count + 1).padStart(4, '0')}`;
    } catch (error) { throw error; }
  }

  static async getByAreaAndStatus(khuvucchebien: KhuVucCheBien): Promise<{
    moi: any[]; danglam: any[]; sansang: any[];
  }> {
    try {
      const allTickets = await this.findAll({ khuvucchebien });
      return {
        moi:     allTickets.filter(t => t.trangthai === 'moi'),
        danglam: allTickets.filter(t => t.trangthai === 'danglam'),
        sansang: allTickets.filter(t => t.trangthai === 'sansang'),
      };
    } catch (error) { throw error; }
  }

  // Thống kê bếp hôm nay
  static async getStats(): Promise<any> {
    try {
      const [pending]   = await db.query<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM phieubep WHERE trangthai = 'moi'     AND DATE(thoigiantao) = CURDATE()`
      );
      const [cooking]   = await db.query<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM phieubep WHERE trangthai = 'danglam'  AND DATE(thoigiantao) = CURDATE()`
      );
      const [completed] = await db.query<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM phieubep WHERE trangthai = 'sansang'  AND DATE(thoigiantao) = CURDATE()`
      );
      const [avgTime]   = await db.query<RowDataPacket[]>(
        `SELECT AVG(TIMESTAMPDIFF(MINUTE, thoigianbatdau, thoigianhoanthanh)) as avgMinutes
         FROM phieubep
         WHERE trangthai = 'sansang'
           AND thoigianbatdau IS NOT NULL
           AND thoigianhoanthanh IS NOT NULL
           AND DATE(thoigiantao) = CURDATE()`
      );
      return {
        dangcho:           pending[0].count,
        danglam:           cooking[0].count,
        dahoanthanh:       completed[0].count,
        thoigiantrungbinh: Math.round(avgTime[0].avgMinutes || 0),
      };
    } catch (error) { throw error; }
  }

  // Xuất NVL theo định mức khi hoàn thành món
  static async xuatNguyenVatLieu(chitietdonhangid: number): Promise<void> {
    try {
      // Lấy monanid + soluong từ chi tiết đơn hàng
      const [chiTietRows] = await db.query<RowDataPacket[]>(
        'SELECT monanid, soluong FROM chitietdonhang WHERE id = ?',
        [chitietdonhangid]
      );
      if (!chiTietRows.length) return;

      const { monanid, soluong: soLuongMon } = chiTietRows[0];

      // Lấy định mức NVL của món
      const [dinhMucRows] = await db.query<RowDataPacket[]>(
        'SELECT nguyenvatlieuid, soluong FROM dinhmucnvl WHERE monanid = ?',
        [monanid]
      );
      if (!dinhMucRows.length) return; // Chưa có định mức → bỏ qua

      for (const dm of dinhMucRows) {
        const soLuongXuat = dm.soluong * soLuongMon;

        // Log cảnh báo nếu không đủ tồn kho (không block bếp)
        const [nvlRows] = await db.query<RowDataPacket[]>(
          'SELECT tonkho, tennvl FROM nguyenvatlieu WHERE id = ?',
          [dm.nguyenvatlieuid]
        );
        if (!nvlRows.length) continue;

        if (Number(nvlRows[0].tonkho) < soLuongXuat) {
          console.warn(
            `[NVL] Cảnh báo: ${nvlRows[0].tennvl} không đủ tồn kho. ` +
            `Cần: ${soLuongXuat}, Có: ${nvlRows[0].tonkho}`
          );
        }

        // Trừ tồn kho
        await db.query(
          'UPDATE nguyenvatlieu SET tonkho = tonkho - ? WHERE id = ?',
          [soLuongXuat, dm.nguyenvatlieuid]
        );

        // Ghi lịch sử xuất kho
        await db.query<ResultSetHeader>(
          'INSERT INTO xuatnvl (nguyenvatlieuid, chitietdonhangid, soluong) VALUES (?, ?, ?)',
          [dm.nguyenvatlieuid, chitietdonhangid, soLuongXuat]
        );
      }
    } catch (error) {
      // Không throw để không block bếp
      console.error('[NVL] Lỗi khi xuất nguyên vật liệu:', error);
    }
  }
}

export default KitchenTicket;