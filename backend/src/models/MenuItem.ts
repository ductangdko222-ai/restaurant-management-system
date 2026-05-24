import { RowDataPacket, ResultSetHeader } from 'mysql2';
import db from '../config/db';
import { IMonAn, IBienThe, TrangThaiMon, KhuVucCheBien } from '../types';
import { MenuItemRow, ModifierRow } from '../types/modelRows';

class MenuItem {
  static async findAll(filters?: {
    nhommonid?: number;
    trangthai?: TrangThaiMon;
    khuvucchebien?: KhuVucCheBien;
  }): Promise<IMonAn[]> {
    try {
      let query = `
        SELECT m.*, n.tennhom 
        FROM monan m
        LEFT JOIN nhommon n ON m.nhommonid = n.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (filters?.nhommonid) {
        query += ' AND m.nhommonid = ?';
        params.push(filters.nhommonid);
      }

      if (filters?.trangthai) {
        query += ' AND m.trangthai = ?';
        params.push(filters.trangthai);
      }

      if (filters?.khuvucchebien) {
        query += ' AND m.khuvucchebien = ?';
        params.push(filters.khuvucchebien);
      }

      query += ' ORDER BY n.thutu, m.tenmon';

      const [rows] = await db.query<MenuItemRow[]>(query, params);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Tìm món ăn theo ID (kèm biến thể)
  static async findById(id: number): Promise<IMonAn | null> {
    try {
      const [rows] = await db.query<MenuItemRow[]>(
        `SELECT m.*, n.tennhom 
         FROM monan m
         LEFT JOIN nhommon n ON m.nhommonid = n.id
         WHERE m.id = ?`,
        [id]
      );

      if (rows.length === 0) return null;

      const item = rows[0];

      // Lấy biến thể
      const modifiers = await this.getModifiers(id);

      return { ...item, bienthe: modifiers } as any;
    } catch (error) {
      throw error;
    }
  }

  // Tìm món ăn theo mã món
  static async findByCode(mamon: string): Promise<IMonAn | null> {
    try {
      const [rows] = await db.query<MenuItemRow[]>(
        'SELECT * FROM monan WHERE mamon = ?',
        [mamon]
      );
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  static async create(itemData: {
    mamon: string;
    tenmon: string;
    nhommonid?: number;
    giaban: number;
    tinhthue?: boolean;
    hinhanh?: string;
    mota?: string;
    khuvucchebien?: KhuVucCheBien;
  }): Promise<IMonAn | null> {
    try {
      const {
        mamon,
        tenmon,
        nhommonid,
        giaban,
        tinhthue = true,
        hinhanh,
        mota,
        khuvucchebien = KhuVucCheBien.BEP
      } = itemData;

      const [result] = await db.query<ResultSetHeader>(
        `INSERT INTO monan 
         (mamon, tenmon, nhommonid, giaban, tinhthue, hinhanh, mota, khuvucchebien) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [mamon, tenmon, nhommonid, giaban, tinhthue, hinhanh, mota, khuvucchebien]
      );

      return await this.findById(result.insertId);
    } catch (error) {
      throw error;
    }
  }

  // Cập nhật món ăn
  static async update(id: number, itemData: Partial<IMonAn>): Promise<IMonAn | null> {
    try {
      const fields: Array<keyof IMonAn> = ['tenmon', 'nhommonid', 'giaban', 'tinhthue', 'trangthai', 'hinhanh', 'mota', 'khuvucchebien'];
      const updates: string[] = [];
      const params: any[] = [];

      fields.forEach(field => {
        const value = itemData[field];
        if (value !== undefined) {
          updates.push(`${field} = ?`);
          params.push(value);
        }
      });

      const setClause = updates.filter(Boolean).join(', ');
      if (!setClause) {
        return await this.findById(id);
      }

      params.push(id);

      await db.query(
        `UPDATE monan SET ${setClause} WHERE id = ?`,
        params
      );

      return await this.findById(id);
    } catch (error) {
      throw error;
    }
  }

  static async delete(id: number): Promise<boolean> {
    try {
      const [orders] = await db.query<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM chitietdonhang WHERE monanid = ?`,
        [id]
      );

      if (orders[0].count > 0) {
        throw new Error('Không thể xóa món đang có trong đơn hàng');
      }

      await db.query('DELETE FROM bienthe WHERE monanid = ?', [id]);

      await db.query('DELETE FROM monan WHERE id = ?', [id]);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Lấy biến thể của món
  static async getModifiers(monanid: number): Promise<IBienThe[]> {
    try {
      const [rows] = await db.query<ModifierRow[]>(
        'SELECT * FROM bienthe WHERE monanid = ? ORDER BY id',
        [monanid]
      );
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Thêm biến thể
  static async addModifier(modifierData: {
    monanid: number;
    loai: string;
    tenbienthe: string;
    giathem: number;
  }): Promise<IBienThe | null> {
    try {
      const { monanid, loai, tenbienthe, giathem } = modifierData;

      const [result] = await db.query<ResultSetHeader>(
        `INSERT INTO bienthe (monanid, loai, tenbienthe, giathem) 
         VALUES (?, ?, ?, ?)`,
        [monanid, loai, tenbienthe, giathem]
      );

      const [rows] = await db.query<ModifierRow[]>(
        'SELECT * FROM bienthe WHERE id = ?',
        [result.insertId]
      );

      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Xóa biến thể
  static async deleteModifier(id: number): Promise<boolean> {
    try {
      await db.query('DELETE FROM bienthe WHERE id = ?', [id]);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Kiểm tra mã món tồn tại
  static async exists(mamon: string, excludeId?: number): Promise<boolean> {
    try {
      let query = 'SELECT id FROM monan WHERE mamon = ?';
      const params: any[] = [mamon];

      if (excludeId) {
        query += ' AND id != ?';
        params.push(excludeId);
      }

      const [rows] = await db.query<MenuItemRow[]>(query, params);
      return rows.length > 0;
    } catch (error) {
      throw error;
    }
  }

  // Lấy món theo nhóm
  static async getByCategory(): Promise<any[]> {
    try {
      const [rows] = await db.query<RowDataPacket[]>(
        `SELECT 
          n.id as nhommonid,
          n.tennhom,
          n.thutu,
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'id', m.id,
              'mamon', m.mamon,
              'tenmon', m.tenmon,
              'giaban', m.giaban,
              'hinhanh', m.hinhanh,
              'trangthai', m.trangthai,
              'khuvucchebien', m.khuvucchebien
            )
          ) as monan
        FROM nhommon n
        LEFT JOIN monan m ON n.id = m.nhommonid AND m.trangthai = 'dangban'
        GROUP BY n.id, n.tennhom, n.thutu
        ORDER BY n.thutu, n.id`
      );
      return rows;
    } catch (error) {
      throw error;
    }
  }
  // Lấy định mức NVL của món
  static async getDinhMuc(monanid: number): Promise<any[]> {
    try {
      const [rows] = await db.query<RowDataPacket[]>(
        `SELECT dm.id, dm.monanid, dm.nguyenvatlieuid, dm.soluong,
                nvl.tennvl, nvl.donvitinh, nvl.tonkho
         FROM dinhmucnvl dm
         JOIN nguyenvatlieu nvl ON dm.nguyenvatlieuid = nvl.id
         WHERE dm.monanid = ?
         ORDER BY nvl.tennvl`,
        [monanid]
      );
      return rows;
    } catch (error) { throw error; }
  }

  // Thêm hoặc cập nhật định mức (upsert)
  static async upsertDinhMuc(
    monanid: number,
    nguyenvatlieuid: number,
    soluong: number,
    donvinhap: string
  ): Promise<any> {
    try {
      await db.query(
        `INSERT INTO dinhmucnvl (monanid, nguyenvatlieuid, soluong, donvinhap)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE soluong = ?, donvinhap = ?`,
        [monanid, nguyenvatlieuid, soluong, donvinhap, soluong, donvinhap]
      );
      const [rows] = await db.query<RowDataPacket[]>(
        `SELECT dm.*, nvl.tennvl, nvl.donvitinh, nvl.tonkho
       FROM dinhmucnvl dm
       JOIN nguyenvatlieu nvl ON dm.nguyenvatlieuid = nvl.id
       WHERE dm.monanid = ? AND dm.nguyenvatlieuid = ?`,
        [monanid, nguyenvatlieuid]
      );
      return rows[0] || null;
    } catch (error) { throw error; }
  }

  // Xóa định mức
  static async deleteDinhMuc(monanid: number, nguyenvatlieuid: number): Promise<boolean> {
    try {
      const [result] = await db.query<ResultSetHeader>(
        'DELETE FROM dinhmucnvl WHERE monanid = ? AND nguyenvatlieuid = ?',
        [monanid, nguyenvatlieuid]
      );
      return result.affectedRows > 0;
    } catch (error) { throw error; }
  }
}

export default MenuItem;