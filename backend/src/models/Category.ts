import { RowDataPacket, ResultSetHeader } from 'mysql2';
import db from '../config/db';
import { INhomMon } from '../types';
import { CategoryRow } from '../types/modelRows';

class Category {
  static async findAll(): Promise<INhomMon[]> {
    try {
      const [rows] = await db.query<CategoryRow[]>(
        'SELECT * FROM nhommon ORDER BY thutu, id'
      );
      return rows;
    } catch (error) {
      throw error;
    }
  }

  static async findById(id: number): Promise<INhomMon | null> {
    try {
      const [rows] = await db.query<CategoryRow[]>(
        'SELECT * FROM nhommon WHERE id = ?',
        [id]
      );
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  static async create(categoryData: {
    tennhom: string;
    mota?: string;
    thutu?: number;
  }): Promise<INhomMon | null> {
    try {
      const { tennhom, mota, thutu = 0 } = categoryData;
      
      const [result] = await db.query<ResultSetHeader>(
        'INSERT INTO nhommon (tennhom, mota, thutu) VALUES (?, ?, ?)',
        [tennhom, mota, thutu]
      );

      return await this.findById(result.insertId);
    } catch (error) {
      throw error;
    }
  }

  static async update(id: number, categoryData: {
    tennhom?: string;
    mota?: string;
    thutu?: number;
  }): Promise<INhomMon | null> {
    try {
      const { tennhom, mota, thutu } = categoryData;
      
      const updates: string[] = [];
      const params: any[] = [];

      if (tennhom) {
        updates.push('tennhom = ?');
        params.push(tennhom);
      }
      if (mota !== undefined) {
        updates.push('mota = ?');
        params.push(mota);
      }
      if (thutu !== undefined) {
        updates.push('thutu = ?');
        params.push(thutu);
      }

      if (updates.length === 0) {
        return await this.findById(id);
      }

      params.push(id);
      
      await db.query(
        `UPDATE nhommon SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      return await this.findById(id);
    } catch (error) {
      throw error;
    }
  }

  static async delete(id: number): Promise<boolean> {
    try {
      const [items] = await db.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM monan WHERE nhommonid = ?',
        [id]
      );

      if (items[0].count > 0) {
        throw new Error('Không thể xóa nhóm món đang có món ăn');
      }

      await db.query('DELETE FROM nhommon WHERE id = ?', [id]);
      return true;
    } catch (error) {
      throw error;
    }
  }

  static async exists(tennhom: string, excludeId?: number): Promise<boolean> {
    try {
      let query = 'SELECT id FROM nhommon WHERE tennhom = ?';
      const params: any[] = [tennhom];

      if (excludeId) {
        query += ' AND id != ?';
        params.push(excludeId);
      }

      const [rows] = await db.query<CategoryRow[]>(query, params);
      return rows.length > 0;
    } catch (error) {
      throw error;
    }
  }
}

export default Category;