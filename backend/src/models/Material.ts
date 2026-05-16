import { RowDataPacket, ResultSetHeader } from 'mysql2';
import db from '../config/db';
import { INguyenVatLieu, ILichSuXuatNVL, IDungTrongMon } from '../types';
import { NVLRow } from '../types/modelRows';

class NguyenVatLieu {
  static async findAll(filters?: { caohangton?: boolean }): Promise<INguyenVatLieu[]> {
    try {
      let query = 'SELECT * FROM nguyenvatlieu WHERE 1=1';
      if (filters?.caohangton) query += ' AND tonkho <= tontoithieu';
      query += ' ORDER BY tennvl ASC';
      const [rows] = await db.query<NVLRow[]>(query);
      return rows;
    } catch (error) { throw error; }
  }

  static async findById(id: number): Promise<INguyenVatLieu | null> {
    try {
      const [rows] = await db.query<NVLRow[]>(
        'SELECT * FROM nguyenvatlieu WHERE id = ?', [id]
      );
      return rows[0] || null;
    } catch (error) { throw error; }
  }

  static async findByMa(manvl: string): Promise<INguyenVatLieu | null> {
    try {
      const [rows] = await db.query<NVLRow[]>(
        'SELECT * FROM nguyenvatlieu WHERE manvl = ?', [manvl]
      );
      return rows[0] || null;
    } catch (error) { throw error; }
  }

  static async create(data: Omit<INguyenVatLieu, 'id'>): Promise<INguyenVatLieu | null> {
    try {
      const [result] = await db.query<ResultSetHeader>(
        `INSERT INTO nguyenvatlieu (manvl, tennvl, donvitinh, tonkho, tontoithieu)
         VALUES (?, ?, ?, ?, ?)`,
        [data.manvl, data.tennvl, data.donvitinh, data.tonkho ?? 0, data.tontoithieu ?? 0]
      );
      return await this.findById(result.insertId);
    } catch (error) { throw error; }
  }

  static async update(id: number, data: Partial<Omit<INguyenVatLieu, 'id'>>): Promise<INguyenVatLieu | null> {
    try {
      const updates: string[] = [];
      const params: any[] = [];
      if (data.tennvl !== undefined) { updates.push('tennvl = ?'); params.push(data.tennvl); }
      if (data.donvitinh !== undefined) { updates.push('donvitinh = ?'); params.push(data.donvitinh); }
      if (data.tontoithieu !== undefined) { updates.push('tontoithieu = ?'); params.push(data.tontoithieu); }
      if (updates.length === 0) return await this.findById(id);
      params.push(id);
      await db.query(`UPDATE nguyenvatlieu SET ${updates.join(', ')} WHERE id = ?`, params);
      return await this.findById(id);
    } catch (error) { throw error; }
  }

  static async nhapKho(id: number, soluong: number): Promise<INguyenVatLieu | null> {
    try {
      await db.query(
        'UPDATE nguyenvatlieu SET tonkho = tonkho + ? WHERE id = ?', [soluong, id]
      );
      return await this.findById(id);
    } catch (error) { throw error; }
  }

  static async xuatKho(id: number, soluong: number): Promise<INguyenVatLieu | null> {
    try {
      const nvl = await this.findById(id);
      if (!nvl) throw new Error('Không tìm thấy nguyên vật liệu');
      if (nvl.tonkho < soluong)
        throw new Error(`Tồn kho không đủ. Hiện có: ${nvl.tonkho} ${nvl.donvitinh}`);
      await db.query(
        'UPDATE nguyenvatlieu SET tonkho = tonkho - ? WHERE id = ?', [soluong, id]
      );
      return await this.findById(id);
    } catch (error) { throw error; }
  }

  static async delete(id: number): Promise<boolean> {
    try {
      const [result] = await db.query<ResultSetHeader>(
        'DELETE FROM nguyenvatlieu WHERE id = ?', [id]
      );
      return result.affectedRows > 0;
    } catch (error) { throw error; }
  }

  static async existsByMa(manvl: string, excludeId?: number): Promise<boolean> {
    try {
      let query = 'SELECT id FROM nguyenvatlieu WHERE manvl = ?';
      const params: any[] = [manvl];
      if (excludeId) { query += ' AND id != ?'; params.push(excludeId); }
      const [rows] = await db.query<NVLRow[]>(query, params);
      return rows.length > 0;
    } catch (error) { throw error; }
  }

  static async lichSuXuat(id: number): Promise<ILichSuXuatNVL[]> {
    try {
      const [rows] = await db.query<RowDataPacket[]>(
        `SELECT x.id, x.soluong, x.thoigianxuat,
                cd.id AS chitietdonhangid,
                dh.madon, mn.tenmon
         FROM xuatnvl x
         JOIN chitietdonhang cd ON x.chitietdonhangid = cd.id
         JOIN donhang dh ON cd.donhangid = dh.id
         JOIN monan mn ON cd.monanid = mn.id
         WHERE x.nguyenvatlieuid = ?
         ORDER BY x.thoigianxuat DESC
         LIMIT 100`,
        [id]
      );
      return rows as ILichSuXuatNVL[];
    } catch (error) { throw error; }
  }

  static async dungTrongMon(id: number): Promise<IDungTrongMon[]> {
    try {
      const [rows] = await db.query<RowDataPacket[]>(
        `SELECT mn.id AS monanid, mn.mamon, mn.tenmon, dm.soluong, mn.trangthai
         FROM dinhmucnvl dm
         JOIN monan mn ON dm.monanid = mn.id
         WHERE dm.nguyenvatlieuid = ?`,
        [id]
      );
      return rows as IDungTrongMon[];
    } catch (error) { throw error; }
  }
}

export default NguyenVatLieu;