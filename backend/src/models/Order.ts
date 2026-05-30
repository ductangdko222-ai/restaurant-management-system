import { RowDataPacket, ResultSetHeader } from 'mysql2';
import db from '../config/db';
import { IDonHang, IChiTietDonHang, TrangThaiDonHang, TrangThaiChiTiet } from '../types';
import { OrderRow, OrderItemRow } from '../types/modelRows';

class Order {
  // Tìm order theo ID (kèm chi tiết)
  static async findById(id: number): Promise<any> {
    try {
      const [rows] = await db.query<OrderRow[]>(
        `SELECT d.*, b.tenban, b.khuvucid, k.tenkhuvuc, 
                nd.hoten as tenphucvu
         FROM donhang d
         LEFT JOIN ban b ON d.banid = b.id
         LEFT JOIN khuvuc k ON b.khuvucid = k.id
         LEFT JOIN nguoidung nd ON d.nguoiphucvuid = nd.id
         WHERE d.id = ?`,
        [id]
      );

      if (rows.length === 0) return null;

      const order = rows[0];

      // Lấy chi tiết món
      const items = await this.getOrderItems(id);

      return { ...order, chitiet: items };
    } catch (error) {
      throw error;
    }
  }

  // Tìm order đang mở của bàn
  static async findActiveByTableId(banid: number): Promise<any> {
    try {
      const [rows] = await db.query<OrderRow[]>(
        `SELECT d.*, b.tenban 
         FROM donhang d
         LEFT JOIN ban b ON d.banid = b.id
         WHERE d.banid = ? AND d.trangthai IN ('choxacnhan', 'dangphucvu', 'chothanhtoan')
         ORDER BY d.thoigiantao DESC
         LIMIT 1`,
        [banid]
      );

      if (rows.length === 0) return null;

      const order = rows[0];
      const items = await this.getOrderItems(order.id);

      return { ...order, chitiet: items };
    } catch (error) {
      throw error;
    }
  }

  // Lấy tất cả orders
  static async findAll(filters?: {
    trangthai?: TrangThaiDonHang;
    banid?: number;
    calamviecid?: number;
    tungay?: string;
    denngay?: string;
  }): Promise<IDonHang[]> {
    try {
      let query = `
        SELECT d.*, b.tenban, nd.hoten as tenphucvu
        FROM donhang d
        LEFT JOIN ban b ON d.banid = b.id
        LEFT JOIN nguoidung nd ON d.nguoiphucvuid = nd.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (filters?.trangthai) {
        if (filters.trangthai === 'choxacnhan') {
          query += ` AND (
            d.trangthai = ?
            OR (d.trangthai = ? AND EXISTS (
              SELECT 1 FROM chitietdonhang ct WHERE ct.donhangid = d.id AND ct.trangthai != 'daphucvu'
            ))
          )`;
          params.push(filters.trangthai, 'dangphucvu');
        } else {
          query += ' AND d.trangthai = ?';
          params.push(filters.trangthai);
        }
      }

      if (filters?.banid) {
        query += ' AND d.banid = ?';
        params.push(filters.banid);
      }

      if (filters?.calamviecid) {
        query += ' AND d.calamviecid = ?';
        params.push(filters.calamviecid);
      }

      if (filters?.tungay) {
        query += ' AND DATE(d.thoigiantao) >= ?';
        params.push(filters.tungay);
      }

      if (filters?.denngay) {
        query += ' AND DATE(d.thoigiantao) <= ?';
        params.push(filters.denngay);
      }

      query += ' ORDER BY d.thoigiantao DESC';

      const [rows] = await db.query<OrderRow[]>(query, params);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Tạo order mới
  static async create(orderData: {
    madon: string;
    loai: 'taiban' | 'mangdi';
    banid?: number;
    nguoiphucvuid?: number | null;
    calamviecid?: number;
    ghichu?: string;
    trangthai?: TrangThaiDonHang;
  }): Promise<any> {
    try {
      const {
        madon,
        loai,
        banid,
        nguoiphucvuid = null,
        calamviecid,
        ghichu,
        trangthai = 'dangphucvu'
      } = orderData;

      const [result] = await db.query<ResultSetHeader>(
        `INSERT INTO donhang 
         (madon, loai, banid, nguoiphucvuid, calamviecid, ghichu, trangthai) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [madon, loai, banid, nguoiphucvuid, calamviecid, ghichu, trangthai]
      );

      return await this.findById(result.insertId);
    } catch (error) {
      throw error;
    }
  }

  // Cập nhật order
  static async update(id: number, orderData: Partial<IDonHang>): Promise<any> {
    try {
      const updates: string[] = [];
      const params: any[] = [];

      const fields = [
        'banid',
        'tongtien',
        'tiengiam',
        'thue',
        'tongthanhtoan',
        'trangthai',
        'ghichu',
      ];

      fields.forEach(field => {
        if (orderData[field as keyof IDonHang] !== undefined) {
          updates.push(`${field} = ?`);
          params.push(orderData[field as keyof IDonHang]);
        }
      });

      if (updates.length === 0) {
        return await this.findById(id);
      }

      params.push(id);

      await db.query(
        `UPDATE donhang SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      return await this.findById(id);
    } catch (error) {
      throw error;
    }
  }

  // Lấy chi tiết món của order
  static async getOrderItems(donhangid: number): Promise<IChiTietDonHang[]> {
    try {
      const [rows] = await db.query<OrderItemRow[]>(
        `SELECT ct.*, m.tenmon, m.hinhanh, m.khuvucchebien
         FROM chitietdonhang ct
         LEFT JOIN monan m ON ct.monanid = m.id
         WHERE ct.donhangid = ?
         ORDER BY ct.thoigiantao DESC`,
        [donhangid]
      );

      // Lấy biến thể đã chọn cho từng món
      for (let item of rows) {
        const [modifiers] = await db.query<RowDataPacket[]>(
          `SELECT btc.*, bt.tenbienthe, bt.loai
           FROM bienthedachon btc
           LEFT JOIN bienthe bt ON btc.bientheit = bt.id
           WHERE btc.chitietdonhangid = ?`,
          [item.id]
        );
        (item as any).bienthe = modifiers;
      }

      return rows;
    } catch (error) {
      throw error;
    }
  }

  static async addItem(itemData: {
    donhangid: number;
    monanid: number;
    soluong: number;
    dongia: number;
    ghichu?: string;
    bienthe?: number[];
  }): Promise<IChiTietDonHang | null> {
    try {
      const { donhangid, monanid, soluong, dongia, ghichu, bienthe = [] } = itemData;

      let tongGiathem = 0;
      const modifierData: { id: number; giathem: number }[] = [];

      if (bienthe.length > 0) {
        for (let modifierId of bienthe) {
          const [modifierRows] = await db.query<RowDataPacket[]>(
            'SELECT giathem FROM bienthe WHERE id = ?',
            [modifierId]
          );
          if (modifierRows.length > 0) {
            const gia = Number(modifierRows[0].giathem);
            tongGiathem += gia;
            modifierData.push({ id: modifierId, giathem: gia });
          }
        }
      }

      const thanhtien = (Number(dongia) + tongGiathem) * Number(soluong);

      const [result] = await db.query<ResultSetHeader>(
        `INSERT INTO chitietdonhang 
       (donhangid, monanid, soluong, dongia, thanhtien, ghichu) 
       VALUES (?, ?, ?, ?, ?, ?)`,
        [donhangid, monanid, soluong, dongia, thanhtien, ghichu]
      );


      const chitietId = result.insertId;

      for (let mod of modifierData) {
        await db.query(
          `INSERT INTO bienthedachon (chitietdonhangid, bientheit, giathem) 
         VALUES (?, ?, ?)`,
          [chitietId, mod.id, mod.giathem]
        );
      }

      const [items] = await db.query<OrderItemRow[]>(
        `SELECT ct.*, m.tenmon, m.hinhanh 
       FROM chitietdonhang ct
       LEFT JOIN monan m ON ct.monanid = m.id
       WHERE ct.id = ?`,
        [chitietId]
      );

      return items[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Cập nhật chi tiết món
  static async updateItem(id: number, itemData: {
    soluong?: number;
    ghichu?: string;
    trangthai?: TrangThaiChiTiet;
  }): Promise<boolean> {
    try {
      const updates: string[] = [];
      const params: any[] = [];

      if (itemData.soluong !== undefined && itemData.soluong > 0) {
        updates.push('soluong = ?');
        params.push(itemData.soluong);

        const [rows] = await db.query<RowDataPacket[]>(
          `SELECT ct.dongia, COALESCE(SUM(btc.giathem), 0) as tongGiathem
     FROM chitietdonhang ct
     LEFT JOIN bienthedachon btc ON btc.chitietdonhangid = ct.id
     WHERE ct.id = ?
     GROUP BY ct.id`,
          [id]
        );

        if (rows.length > 0) {
          const donGiaThucTe = Number(rows[0].dongia) + Number(rows[0].tongGiathem); 
          updates.push('thanhtien = ?');
          params.push(donGiaThucTe * itemData.soluong);
        }
      }
      if (itemData.ghichu !== undefined) {
        updates.push('ghichu = ?');
        params.push(itemData.ghichu);
      }

      if (itemData.trangthai) {
        updates.push('trangthai = ?');
        params.push(itemData.trangthai);
      }

      if (updates.length === 0) return true;

      params.push(id);

      await db.query(
        `UPDATE chitietdonhang SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      return true;
    } catch (error) {
      throw error;
    }
  }

  // Xóa món khỏi order
  static async deleteItem(id: number): Promise<boolean> {
    try {
      // Xóa biến thể đã chọn trước
      await db.query('DELETE FROM bienthedachon WHERE chitietdonhangid = ?', [id]);

      // Xóa chi tiết
      await db.query('DELETE FROM chitietdonhang WHERE id = ?', [id]);

      return true;
    } catch (error) {
      throw error;
    }
  }

  // Tính tổng tiền 
  static async calculateTotal(donhangid: number): Promise<{
    tongtien: number;
    tiengiam: number;
    thue: number;
    tongthanhtoan: number;
  }> {
    try {
      const [rows] = await db.query<RowDataPacket[]>(
        `SELECT SUM(thanhtien) as tongtien 
       FROM chitietdonhang 
       WHERE donhangid = ?`,
        [donhangid]
      );

      const tongtien = Number(rows[0].tongtien) || 0;

      const [orderRows] = await db.query<RowDataPacket[]>(
        'SELECT tiengiam FROM donhang WHERE id = ?',
        [donhangid]
      );

      const tiengiam = Number(orderRows[0]?.tiengiam) || 0;
      const thue = Math.round((tongtien - tiengiam) * 0.1);
      const tongthanhtoan = tongtien - tiengiam + thue;

      return { tongtien, tiengiam, thue, tongthanhtoan };
    } catch (error) {
      throw error;
    }
  }

  // Tạo mã đơn tự động
  static async generateOrderCode(): Promise<string> {
    try {
      const now = new Date();
      const date = now.toISOString().slice(0, 10).replace(/-/g, '');

      const [rows] = await db.query<RowDataPacket[]>(
        `SELECT COUNT(*) as count 
         FROM donhang 
         WHERE DATE(thoigiantao) = CURDATE()`
      );

      const count = rows[0].count + 1;
      return `DH${date}${String(count).padStart(4, '0')}`;
    } catch (error) {
      throw error;
    }
  }

  // Lấy tất cả đơn chờ xác nhận
  static async findAllPendingConfirmation(): Promise<any[]> {
    try {
      const [rows] = await db.query<OrderRow[]>(
        `SELECT d.*, b.tenban, nd.hoten as tenphucvu
         FROM donhang d
         LEFT JOIN ban b ON d.banid = b.id
         LEFT JOIN nguoidung nd ON d.nguoiphucvuid = nd.id
         WHERE d.trangthai = 'choxacnhan'
         ORDER BY d.thoigiantao ASC`
      );

      // Lấy chi tiết cho từng đơn
      for (let order of rows) {
        const items = await this.getOrderItems(order.id);
        (order as any).chitiet = items;
      }

      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Đếm số đơn chờ xác nhận
  static async countPendingConfirmation(): Promise<number> {
    try {
      const [rows] = await db.query<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM donhang WHERE trangthai = 'choxacnhan'`
      );

      return rows[0].count || 0;
    } catch (error) {
      throw error;
    }
  }
}

export default Order;