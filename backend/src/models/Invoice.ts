// models/Invoice.ts
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import db from '../config/db';
import { PhuongThucThanhToan } from '../types';

import { InvoiceRow, RevenueStatsRow, TopMonRow, RevenueByShiftRow, RevenueByDayRow, OrderStatsRow, TableStatsRow, QuarterComparisonRow } from '../types';
class Invoice {
  // Tìm hóa đơn theo ID
  static async findById(id: number): Promise<any> {
    try {
      const [rows] = await db.query<InvoiceRow[]>(
        `SELECT 
          hd.*,
          nd.hoten as tenthungan,
          dh.madon,
          dh.loai,
          b.tenban,
          dh.tongtien as tongtienhang,
          dh.tiengiam,
          dh.thue
         FROM hoadon hd
         LEFT JOIN nguoidung nd ON hd.nguoithunganid = nd.id
         LEFT JOIN donhang dh ON hd.donhangid = dh.id
         LEFT JOIN ban b ON dh.banid = b.id
         WHERE hd.id = ?`,
        [id]
      );

      if (rows.length === 0) return null;

      // Lấy chi tiết món
      const [items] = await db.query<RowDataPacket[]>(
        `SELECT 
          ct.*,
          m.tenmon,
          m.hinhanh
         FROM chitietdonhang ct
         LEFT JOIN monan m ON ct.monanid = m.id
         WHERE ct.donhangid = ?`,
        [rows[0].donhangid]
      );

      return { ...rows[0], chitiet: items };
    } catch (error) {
      throw error;
    }
  }

  // Tìm hóa đơn theo mã
  static async findByCode(mahoadon: string): Promise<any> {
    try {
      const [rows] = await db.query<InvoiceRow[]>(
        'SELECT * FROM hoadon WHERE mahoadon = ?',
        [mahoadon]
      );

      if (rows.length === 0) return null;

      return await this.findById(rows[0].id);
    } catch (error) {
      throw error;
    }
  }

  // Tìm hóa đơn theo order
  static async findByOrderId(donhangid: number): Promise<InvoiceRow | null> {
    try {
      const [rows] = await db.query<InvoiceRow[]>(
        'SELECT * FROM hoadon WHERE donhangid = ?',
        [donhangid]
      );
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Lấy tất cả hóa đơn
  static async findAll(filters?: {
    tungay?: string;
    denngay?: string;
    phuongthucthanhtoan?: PhuongThucThanhToan;
    nguoithunganid?: number;
  }): Promise<InvoiceRow[]> {
    try {
      let query = `
        SELECT 
          hd.*,
          nd.hoten as tenthungan,
          dh.madon,
          b.tenban
        FROM hoadon hd
        LEFT JOIN nguoidung nd ON hd.nguoithunganid = nd.id
        LEFT JOIN donhang dh ON hd.donhangid = dh.id
        LEFT JOIN ban b ON dh.banid = b.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (filters?.tungay) {
        query += ' AND DATE(hd.thoigianthanhtoan) >= ?';
        params.push(filters.tungay);
      }

      if (filters?.denngay) {
        query += ' AND DATE(hd.thoigianthanhtoan) <= ?';
        params.push(filters.denngay);
      }

      if (filters?.phuongthucthanhtoan) {
        query += ' AND hd.phuongthucthanhtoan = ?';
        params.push(filters.phuongthucthanhtoan);
      }

      if (filters?.nguoithunganid) {
        query += ' AND hd.nguoithunganid = ?';
        params.push(filters.nguoithunganid);
      }

      query += ' ORDER BY hd.thoigianthanhtoan DESC';

      const [rows] = await db.query<InvoiceRow[]>(query, params);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Tạo hóa đơn và cập nhật trạng thái đơn hàng + ca làm việc
  static async create(invoiceData: {
    mahoadon: string;
    donhangid: number;
    nguoithunganid: number | null;
    phuongthucthanhtoan: PhuongThucThanhToan;
    tongtien: number;
    tienkhacdua: number;
    tienthua: number;
    ghichu?: string;
  }): Promise<any> {
    const connection = await db.getConnection(); // Sử dụng connection để dùng Transaction
    try {
      await connection.beginTransaction();

      const {
        mahoadon,
        donhangid,
        nguoithunganid,
        phuongthucthanhtoan,
        tongtien,
        tienkhacdua,
        tienthua,
        ghichu
      } = invoiceData;
      const [shifts]: any = await connection.query(
        'SELECT id FROM calamviec WHERE trangthai = "dangmo" ORDER BY id DESC LIMIT 1'
      );

      if (shifts.length === 0) {
        throw new Error("Không tìm thấy ca làm việc nào đang mở. Vui lòng mở ca trước!");
      }
      const calamviecid = shifts[0].id;
      await connection.query(
        'UPDATE donhang SET trangthai = "dathanhtoan", calamviecid = ? WHERE id = ?',
        [calamviecid, donhangid]
      );

      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO hoadon 
          (mahoadon, donhangid, nguoithunganid, phuongthucthanhtoan, 
           tongtien, tienkhacdua, tienthua, ghichu) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [mahoadon, donhangid, nguoithunganid, phuongthucthanhtoan,
          tongtien, tienkhacdua, tienthua, ghichu]
      );

      await connection.commit();
      return await this.findById(result.insertId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Tạo mã hóa đơn tự động
  static async generateInvoiceCode(): Promise<string> {
    try {
      const now = new Date();
      const date = now.toISOString().slice(0, 10).replace(/-/g, '');

      const [rows] = await db.query<RowDataPacket[]>(
        `SELECT COUNT(*) as count 
         FROM hoadon 
         WHERE DATE(thoigianthanhtoan) = CURDATE()`
      );

      const count = rows[0].count + 1;
      return `HD${date}${String(count).padStart(4, '0')}`;
    } catch (error) {
      throw error;
    }
  }


  // Thống kê doanh thu
  static async getRevenueStats(filters?: {
    tungay?: string;
    denngay?: string;
  }): Promise<any> {
    try {
      let query = `
        SELECT 
          COUNT(*) as sohoadon,
          SUM(tongtien) as tongthu,
          AVG(tongtien) as giatrithbinh,
          SUM(CASE WHEN phuongthucthanhtoan = 'tienmat' THEN tongtien ELSE 0 END) as tienmat,
          SUM(CASE WHEN phuongthucthanhtoan = 'chuyenkhoan' THEN tongtien ELSE 0 END) as chuyenkhoan,
          SUM(CASE WHEN phuongthucthanhtoan = 'vidientu' THEN tongtien ELSE 0 END) as vidientu,
          SUM(CASE WHEN phuongthucthanhtoan = 'paypal' THEN tongtien ELSE 0 END) as paypal
        FROM hoadon
        WHERE 1=1
      `;
      const params: any[] = [];

      if (filters?.tungay) {
        query += ' AND DATE(thoigianthanhtoan) >= ?';
        params.push(filters.tungay);
      }

      if (filters?.denngay) {
        query += ' AND DATE(thoigianthanhtoan) <= ?';
        params.push(filters.denngay);
      }

      const [rows] = await db.query<RowDataPacket[]>(query, params);
      return rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async topMon(filters?: {
    tungay?: string;
    denngay?: string;
    limit?: number;
  }): Promise<any[]> {
    try {
      let query = `
        SELECT
          m.id, m.mamon, m.tenmon, m.giaban,
          SUM(ct.soluong) AS tongban,
          SUM(ct.thanhtien) AS doanhthu
        FROM chitietdonhang ct
        JOIN monan m ON ct.monanid = m.id
        JOIN donhang dh ON ct.donhangid = dh.id
        WHERE dh.trangthai = 'dathanhtoan'
      `;
      const params: any[] = [];
      if (filters?.tungay) { query += ' AND DATE(dh.thoigiantao) >= ?'; params.push(filters.tungay); }
      if (filters?.denngay) { query += ' AND DATE(dh.thoigiantao) <= ?'; params.push(filters.denngay); }
      query += ` GROUP BY m.id, m.mamon, m.tenmon, m.giaban ORDER BY tongban DESC LIMIT ?`;
      params.push(filters?.limit || 10);

      const [rows] = await db.query<RowDataPacket[]>(query, params);
      return rows;
    } catch (error) { throw error; }
  }
  static async doanhThuTheoCA(calamviecid: number): Promise<any> {
    try {
      const [rows] = await db.query<RevenueByShiftRow[]>(
        `SELECT
          COUNT(hd.id)                                                                                   AS sohoadon,
          COALESCE(SUM(hd.tongtien), 0)                                                                  AS tongthu,
          COALESCE(SUM(CASE WHEN hd.phuongthucthanhtoan = 'tienmat'  THEN hd.tongtien ELSE 0 END), 0) AS tienmat,
          COALESCE(SUM(CASE WHEN hd.phuongthucthanhtoan = 'chuyenkhoan' THEN hd.tongtien ELSE 0 END), 0) AS chuyenkhoan,
          COALESCE(SUM(CASE WHEN hd.phuongthucthanhtoan = 'vidientu' THEN hd.tongtien ELSE 0 END), 0) AS vidientu,
          COALESCE(SUM(CASE WHEN hd.phuongthucthanhtoan = 'paypal' THEN hd.tongtien ELSE 0 END), 0) AS paypal
         FROM hoadon hd
         JOIN donhang dh ON hd.donhangid = dh.id
         WHERE dh.calamviecid = ?`,
        [calamviecid]
      );
      return rows[0];
    } catch (error) { throw error; }
  }

  // Doanh thu theo khoảng ngày
  static async doanhThuTheoNgay(filters?: { tungay?: string; denngay?: string }): Promise<any> {
    try {
      let query = `
        SELECT
          COUNT(id) AS sohoadon,
          COALESCE(SUM(tongtien), 0) AS tongthu,
          COALESCE(AVG(tongtien), 0) AS trungbinh,
          COALESCE(SUM(CASE WHEN phuongthucthanhtoan = 'tienmat' THEN tongtien ELSE 0 END), 0) AS tienmat,
          COALESCE(SUM(CASE WHEN phuongthucthanhtoan = 'chuyenkhoan' THEN tongtien ELSE 0 END), 0) AS chuyenkhoan,
          COALESCE(SUM(CASE WHEN phuongthucthanhtoan = 'vidientu' THEN tongtien ELSE 0 END), 0) AS vidientu,
          COALESCE(SUM(CASE WHEN phuongthucthanhtoan = 'paypal' THEN tongtien ELSE 0 END), 0) AS paypal
        FROM hoadon WHERE 1=1
      `;
      const params: any[] = [];
      if (filters?.tungay) { query += ' AND DATE(thoigianthanhtoan) >= ?'; params.push(filters.tungay); }
      if (filters?.denngay) { query += ' AND DATE(thoigianthanhtoan) <= ?'; params.push(filters.denngay); }
      const [rows] = await db.query<RevenueByShiftRow[]>(query, params);
      return rows[0];
    } catch (error) { throw error; }
  }

  // Doanh thu từng ngày (cho biểu đồ)
  static async doanhThuTungNgay(filters?: { tungay?: string; denngay?: string }): Promise<any[]> {
    try {
      let query = `
        SELECT DATE(thoigianthanhtoan) AS ngay, COUNT(id) AS sohoadon, COALESCE(SUM(tongtien), 0) AS tongthu
        FROM hoadon WHERE 1=1
      `;
      const params: any[] = [];
      if (filters?.tungay) { query += ' AND DATE(thoigianthanhtoan) >= ?'; params.push(filters.tungay); }
      if (filters?.denngay) { query += ' AND DATE(thoigianthanhtoan) <= ?'; params.push(filters.denngay); }
      query += ' GROUP BY DATE(thoigianthanhtoan) ORDER BY ngay ASC';
      const [rows] = await db.query<RevenueByDayRow[]>(query, params);
      return rows;
    } catch (error) { throw error; }
  }

  // Tổng quan hôm nay + so sánh hôm qua
  static async tongQuanHomNay(): Promise<any> {
    try {
      const [homNay] = await db.query<RevenueByShiftRow[]>(
        `SELECT COUNT(id) AS sohoadon, COALESCE(SUM(tongtien), 0) AS tongthu
         FROM hoadon WHERE DATE(thoigianthanhtoan) = CURDATE()`
      );
      const [homQua] = await db.query<RevenueByShiftRow[]>(
        `SELECT COUNT(id) AS sohoadon, COALESCE(SUM(tongtien), 0) AS tongthu
         FROM hoadon WHERE DATE(thoigianthanhtoan) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)`
      );
      const [donHang] = await db.query<OrderStatsRow[]>(
        `SELECT
          COUNT(*) AS tong,
          SUM(CASE WHEN trangthai = 'dangphucvu'   THEN 1 ELSE 0 END) AS dangphucvu,
          SUM(CASE WHEN trangthai = 'chothanhtoan' THEN 1 ELSE 0 END) AS chothanhtoan,
          SUM(CASE WHEN trangthai = 'dathanhtoan'  THEN 1 ELSE 0 END) AS dathanhtoan
         FROM donhang WHERE DATE(thoigiantao) = CURDATE()`
      );
      const [ban] = await db.query<TableStatsRow[]>(
        `SELECT COUNT(*) AS tong,
          SUM(CASE WHEN trangthai = 'cokhach'  THEN 1 ELSE 0 END) AS cokhach,
          SUM(CASE WHEN trangthai = 'trong'    THEN 1 ELSE 0 END) AS trong,
          SUM(CASE WHEN trangthai = 'dattruoc' THEN 1 ELSE 0 END) AS dattruoc
         FROM ban`
      );
      return {
        homNay: homNay[0],
        homQua: homQua[0],
        donHang: donHang[0],
        ban: ban[0],
      };
    } catch (error) { throw error; }
  }

  // Cảnh báo: NVL sắp hết, bàn chờ lâu, order pending
  static async canhBao(): Promise<any> {
    try {
      // NVL sắp hết
      const [nvlSapHet] = await db.query<RowDataPacket[]>(
        `SELECT id, tennvl, tonkho, tontoithieu, donvitinh
         FROM nguyenvatlieu WHERE tonkho <= tontoithieu ORDER BY tonkho ASC LIMIT 10`
      );

      // Bàn chờ 
      const [banChoLau] = await db.query<RowDataPacket[]>(
        `SELECT b.tenban, dh.madon, MIN(pb.thoigiantao) AS thoigiantao,
                TIMESTAMPDIFF(MINUTE, MIN(pb.thoigiantao), NOW()) AS phutcho
         FROM phieubep pb
         JOIN chitietdonhang ct ON pb.chitietdonhangid = ct.id
         JOIN donhang dh ON ct.donhangid = dh.id
         JOIN ban b ON dh.banid = b.id
         WHERE pb.trangthai = 'moi'
           AND TIMESTAMPDIFF(MINUTE, pb.thoigiantao, NOW()) > 30
         GROUP BY b.id, b.tenban, dh.id, dh.madon
         ORDER BY phutcho DESC`
      );

      // có món mới chưa gửi bế
      const [orderPending] = await db.query<RowDataPacket[]>(
        `SELECT dh.id, dh.madon, b.tenban, COUNT(ct.id) AS somon
         FROM donhang dh
         JOIN chitietdonhang ct ON ct.donhangid = dh.id
         LEFT JOIN ban b ON dh.banid = b.id
         WHERE ct.trangthai = 'moi' AND dh.trangthai = 'dangphucvu'
         GROUP BY dh.id, dh.madon, b.tenban`
      );

      return {
        nvlSapHet,
        banChoLau,
        orderPending,
      };
    } catch (error) { throw error; }
  }

  // So sánh 2 kỳ
  static async soSanh2Ky(ky1: { tungay: string; denngay: string }, ky2: { tungay: string; denngay: string }): Promise<any> {
    try {
      const queryKy = async (tungay: string, denngay: string): Promise<any> => {
        const [rows] = await db.query<RevenueByShiftRow[]>(
          `SELECT COUNT(id) AS sohoadon, COALESCE(SUM(tongtien), 0) AS tongthu, COALESCE(AVG(tongtien), 0) AS trungbinh
           FROM hoadon WHERE DATE(thoigianthanhtoan) BETWEEN ? AND ?`,
          [tungay, denngay]
        );
        const [byNgay] = await db.query<RevenueByDayRow[]>(
          `SELECT DATE(thoigianthanhtoan) AS ngay, COALESCE(SUM(tongtien), 0) AS tongthu, COUNT(id) AS sohoadon
           FROM hoadon WHERE DATE(thoigianthanhtoan) BETWEEN ? AND ?
           GROUP BY DATE(thoigianthanhtoan) ORDER BY ngay ASC`,
          [tungay, denngay]
        );
        return { ...rows[0], byNgay };
      };

      const ketQuaKy1: any = await queryKy(ky1.tungay, ky1.denngay);
      const ketQuaKy2: any = await queryKy(ky2.tungay, ky2.denngay);

      const tangTruongDT = ketQuaKy2.tongthu > 0
        ? ((Number(ketQuaKy1.tongthu) - Number(ketQuaKy2.tongthu)) / Number(ketQuaKy2.tongthu) * 100).toFixed(1)
        : null;
      const tangTruongDon = ketQuaKy2.sohoadon > 0
        ? ((Number(ketQuaKy1.sohoadon) - Number(ketQuaKy2.sohoadon)) / Number(ketQuaKy2.sohoadon) * 100).toFixed(1)
        : null;

      return {
        ky1: { ...ky1, ...ketQuaKy1 },
        ky2: { ...ky2, ...ketQuaKy2 },
        tangTruong: { doanhThu: tangTruongDT, soHoaDon: tangTruongDon },
      };
    } catch (error) { throw error; }
  }
}


export default Invoice;