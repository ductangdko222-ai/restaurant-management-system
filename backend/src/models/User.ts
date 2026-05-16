import { RowDataPacket,ResultSetHeader} from "mysql2";
import db from '../config/db';
import { INguoiDung, INguoiDungResponse, VaiTro, TrangThaiNguoiDung } from '../types';
import { UserRow } from '../types/modelRows';

class User{
    
    static async findByUsername (tendangnhap:string): Promise<INguoiDung | null> {
        try{
            const [rows] = await db.query<UserRow[]>(
                'SELECT * FROM nguoidung WHERE tendangnhap = ? AND trangthai = ?',
                [tendangnhap,TrangThaiNguoiDung.HOAT_DONG]
            );
            return rows[0] || null;
        }catch (error){
            throw error;
        };
    }
    // tìm theo id 0 mk
    static async findByID (id:number): Promise<INguoiDungResponse | null>{
        try {
            const [rows] = await db.query<UserRow[]>(
                'SELECT id, tendangnhap, hoten, vaitro, trangthai, ngaytao from nguoidung where id = ?',
                [id]
            );
            return rows[0] || null;
        } catch (error){
            throw error;
        }
    }

    static async findAll (filters?:{
        vaitro?:VaiTro;
        trangthai?:TrangThaiNguoiDung;
    }):Promise<INguoiDungResponse[]>{
        try {
            let query = 'SELECT id, tendangnhap, hoten, vaitro, trangthai, ngaytao FROM nguoidung WHERE 1=1';
            const params: any[] = [];
            
            if (filters?.vaitro){
                query += ' and vaitro = ?';
                params.push(filters.vaitro);
            }
            if (filters?.trangthai){
                query += ' and trangthai =?';
                params.push(filters.trangthai)
            }
            query += ' ORDER BY ngaytao DESC'
            const [rows] = await db.query<UserRow[]>(query,params);
            return rows;
        }catch (error){
            throw error;
        }
    }

    static async create(userData:{
        tendangnhap:string;
        matkhau:string;
        hoten:string;
        vaitro:VaiTro;
    }):Promise<INguoiDungResponse | null>{
        try {
            const {tendangnhap,matkhau,hoten,vaitro} = userData;
            const [result] = await db.query<ResultSetHeader>(
                'Insert into nguoidung (tendangnhap, matkhau, hoten, vaitro) values (?,?,?,?)',
                [tendangnhap,matkhau,hoten,vaitro]
            );
            return await this.findByID(result.insertId);

        }catch (error){
            throw error;
        }
    }
     static async update(id: number, userData: {
    hoten?: string;
    vaitro?: VaiTro;
    trangthai?: TrangThaiNguoiDung;
  }): Promise<INguoiDungResponse | null> {
    try {
      const { hoten, vaitro, trangthai } = userData;
      
      const updates: string[] = [];
      const params: any[] = [];

      if (hoten) {
        updates.push('hoten = ?');
        params.push(hoten);
      }
      if (vaitro) {
        updates.push('vaitro = ?');
        params.push(vaitro);
      }
      if (trangthai) {
        updates.push('trangthai = ?');
        params.push(trangthai);
      }

      if (updates.length === 0) {
        return await this.findByID(id);
      }

      params.push(id);
      
      await db.query(
        `UPDATE nguoidung SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      return await this.findByID(id);
    } catch (error) {
      throw error;
    }
  }

  // Cập nhật mật khẩu
  static async updatePassword(id: number, matkhauMoi: string): Promise<boolean> {
    try {
      await db.query(
        'UPDATE nguoidung SET matkhau = ? WHERE id = ?',
        [matkhauMoi, id]
      );
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Xóa
  static async delete(id: number): Promise<boolean> {
    try {
      await db.query(
        'UPDATE nguoidung SET trangthai = ? WHERE id = ?',
        [TrangThaiNguoiDung.NGHI_VIEC, id]
      );
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Kiểm tra user tồn tại
  static async exists(tendangnhap: string): Promise<boolean> {
    try {
      const [rows] = await db.query<UserRow[]>(
        'SELECT id FROM nguoidung WHERE tendangnhap = ?',
        [tendangnhap]
      );
      return rows.length > 0;
    } catch (error) {
      throw error;
    }
  }
}

    export default User;