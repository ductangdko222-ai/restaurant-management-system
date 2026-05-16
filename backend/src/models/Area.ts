import { RowDataPacket, ResultSetHeader } from "mysql2";
import db from '../config/db';
import { IKhuVuc } from "../types";
import e from "express";
import { promises } from "dns";
import { StrictEventEmitter } from "socket.io/dist/typed-events";
import { AreaRow } from '../types/modelRows';

class Area {
    static async findAll(): Promise<IKhuVuc[]>{
        try {
            const [rows] = await db.query<AreaRow[]>(
                'Select * from khuvuc ORDER BY thutu,id'
            );
            return rows;
        }catch (error){
            throw error;
        }
    }

    static async findById(id:number):Promise<IKhuVuc | null>{
        try{
            const [rows] = await db.query<AreaRow[]>(
                'SELECT * FROM khuvuc WHERE id = ?',
                [id]
            );
            return rows[0] || null;
        }catch(error){
            throw error;
        }
    }

    static async create(areaData:{
        tenkhuvuc:string;
        mota?:string;
        thutu?:number;
    }):Promise<IKhuVuc | null>{
        try {
            const {tenkhuvuc,mota,thutu = 0} = areaData;
            const [result] = await db.query<ResultSetHeader>(
                'INSERT INTO khuvuc (tenkhuvuc,mota,thutu) VALUES(?,?,?)',
                [tenkhuvuc,mota,thutu]
            );
            return await this.findById(result.insertId);
        }catch (error){
            throw error;
        }
    }

    static async update(id:number,areaData:{
        tenkhuvuc?:string;
        mota?:string;
        thutu?:number;
    }):Promise<IKhuVuc | null>{
        try{
            const {tenkhuvuc,mota,thutu} = areaData;

            const updates:string[] = [];
            const params: any[] = [];
            if(tenkhuvuc){
                updates.push('tenkhuvuc = ?');
                params.push(tenkhuvuc);
            }
            if(mota !== undefined){
                updates.push('mota = ?');
                params.push(mota);
            }
            if(thutu !== undefined){
                updates.push('thutu = ?');
                params.push(thutu);
            }
            if (updates.length === 0){
                return await this.findById(id);
            }
            params.push(id)
            await db.query(
                `UPDATE khuvuc SET ${updates.join(',')} where id = ? `,
                params
            );
            return await this.findById(id);
        }catch (error){
            throw error;
        }
    }
    static async delete(id: number): Promise<boolean> {
    try {
      // Kiểm tra có bàn không
      const [tables] = await db.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM ban WHERE khuvucid = ?',
        [id]
      );

      if (tables[0].count > 0) {
        throw new Error('Không thể xóa khu vực đang có bàn');
      }

      await db.query('DELETE FROM khuvuc WHERE id = ?', [id]);
      return true;
    } catch (error) {
      throw error;
    }
  }
  static async exists(tenkhuvuc: string, excludeId?: number): Promise<boolean> {
    try {
      let query = 'SELECT id FROM khuvuc WHERE tenkhuvuc = ?';
      const params: any[] = [tenkhuvuc];

      if (excludeId) {
        query += ' AND id != ?';
        params.push(excludeId);
      }

      const [rows] = await db.query<AreaRow[]>(query, params);
      return rows.length > 0;
    } catch (error) {
      throw error;
    }
  }
}

export default Area;