import { RowDataPacket, ResultSetHeader } from 'mysql2';
import db from '../config/db';
import { IKhuyenMai, LoaiKhuyenMai, TrangThaiKhuyenMai } from '../types';
import { KhuyenMaiRow } from '../types/modelRows';

class KhuyenMai {
  
  private static mapRow(row: KhuyenMaiRow): IKhuyenMai {
    return {
      ...row,
      giatri: Number(row.giatri), // Ép kiểu tiền/phần trăm về số
    };
  }

  // Lấy danh sách
  static async findAll(filters?: {
    loai?: LoaiKhuyenMai;
    trangthai?: TrangThaiKhuyenMai;
  }): Promise<IKhuyenMai[]> {
    try {
      let query = 'SELECT * FROM khuyenmai WHERE 1=1';
      const params: any[] = [];

      if (filters?.loai) {
        query += ' AND loai = ?';
        params.push(filters.loai);
      }
      if (filters?.trangthai) {
        query += ' AND trangthai = ?';
        params.push(filters.trangthai);
      }

      query += ' ORDER BY id DESC';
      const [rows] = await db.query<KhuyenMaiRow[]>(query, params);
      return rows.map(this.mapRow);
    } catch (error) {
      throw error;
    }
  }

  // Tìm theo ID
  static async findById(id: number): Promise<IKhuyenMai | null> {
    try {
      const [rows] = await db.query<KhuyenMaiRow[]>(
        'SELECT * FROM khuyenmai WHERE id = ?',
        [id]
      );
      return rows[0] ? this.mapRow(rows[0]) : null;
    } catch (error) {
      throw error;
    }
  }

  // Tìm theo mã (Dùng để kiểm tra khi áp dụng mã KM)
  static async findByMa(makm: string): Promise<IKhuyenMai | null> {
    try {
      const [rows] = await db.query<KhuyenMaiRow[]>(
        'SELECT * FROM khuyenmai WHERE makm = ?',
        [makm]
      );
      return rows[0] ? this.mapRow(rows[0]) : null;
    } catch (error) {
      throw error;
    }
  }

  // Tạo khuyến mãi mới
  static async create(data: Omit<IKhuyenMai, 'id'>): Promise<IKhuyenMai | null> {
    try {
      const [result] = await db.query<ResultSetHeader>(
        `INSERT INTO khuyenmai 
        (makm, tenkm, loai, giatri, ngaybatdau, ngayketthuc, giobatdau, gioketthuc, trangthai)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.makm,
          data.tenkm,
          data.loai,
          data.giatri,
          data.ngaybatdau || null,
          data.ngayketthuc || null,
          data.giobatdau || null,
          data.gioketthuc || null,
          data.trangthai || TrangThaiKhuyenMai.HOAT_DONG,
        ]
      );
      return await this.findById(result.insertId);
    } catch (error) {
      throw error;
    }
  }

  // Cập nhật khuyến mãi (Dynamic Update)
  static async update(id: number, data: Partial<Omit<IKhuyenMai, 'id'>>): Promise<IKhuyenMai | null> {
    try {
      const updates: string[] = [];
      const params: any[] = [];

      // Tự động quét các trường có dữ liệu để build query
      const allowedFields = [
        'tenkm', 'loai', 'giatri', 'ngaybatdau', 
        'ngayketthuc', 'giobatdau', 'gioketthuc', 'trangthai'
      ];

      allowedFields.forEach((field) => {
        if (data[field as keyof typeof data] !== undefined) {
          updates.push(`${field} = ?`);
          params.push(data[field as keyof typeof data]);
        }
      });

      if (updates.length === 0) return await this.findById(id);

      params.push(id);
      await db.query(`UPDATE khuyenmai SET ${updates.join(', ')} WHERE id = ?`, params);
      return await this.findById(id);
    } catch (error) {
      throw error;
    }
  }

  // Xóa khuyến mãi
  static async delete(id: number): Promise<boolean> {
    try {
      const [result] = await db.query<ResultSetHeader>(
        'DELETE FROM khuyenmai WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  // Kiểm tra trùng mã (trừ chính nó khi edit)
  static async existsByMa(makm: string, excludeId?: number): Promise<boolean> {
    try {
      let query = 'SELECT id FROM khuyenmai WHERE makm = ?';
      const params: any[] = [makm];
      if (excludeId) {
        query += ' AND id != ?';
        params.push(excludeId);
      }
      const [rows] = await db.query<KhuyenMaiRow[]>(query, params);
      return rows.length > 0;
    } catch (error) {
      throw error;
    }
  }


  static async findDangHoatDong(): Promise<IKhuyenMai[]> {
  try {
    const [rows] = await db.query<KhuyenMaiRow[]>(
      `SELECT * FROM khuyenmai
       WHERE trangthai = ?
         AND (ngaybatdau IS NULL OR ngaybatdau <= CURDATE())
         AND (ngayketthuc IS NULL OR ngayketthuc >= CURDATE())
         AND (
           giobatdau IS NULL 
           OR gioketthuc IS NULL
           OR (
             ngaybatdau = ngayketthuc 
               AND giobatdau <= CURTIME() 
               AND gioketthuc >= CURTIME()
           )
           OR (
             ngaybatdau != ngayketthuc
             AND (
               (CURDATE() = ngaybatdau AND CURTIME() >= giobatdau)
               OR (CURDATE() = ngayketthuc AND CURTIME() <= gioketthuc)
               OR (CURDATE() > ngaybatdau AND CURDATE() < ngayketthuc)
             )
           )
         )`,
      [TrangThaiKhuyenMai.HOAT_DONG]
    );
    return rows.map(this.mapRow);
  } catch (error) {
    throw error;
  }
}
}

export default KhuyenMai;