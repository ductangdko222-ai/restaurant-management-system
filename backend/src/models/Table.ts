import { RowDataPacket, ResultSetHeader } from "mysql2";
import db from '../config/db';
import { IBan, TrangThaiBan } from "../types";
import { RequestOptions } from "node:https";
import { promises } from "node:dns";
import { cachedDataVersionTag } from "node:v8";
import { randomUUID } from "crypto"; 
import { TableRow } from '../types/modelRows';

class Table {
    static async findAll(filters?: {
        khuvucid?: number;
        trangthai?: TrangThaiBan;
    }): Promise<IBan[]> {
        try {
            let query = 'SELECT b.*, k.tenkhuvuc from ban b LEFT JOIN khuvuc k on khuvucid = k.id WHERE 1=1';
            const params: any[] = [];
            if (filters?.khuvucid) {
                query += ' AND b.khuvucid = ?';
                params.push(filters.khuvucid);
            }
            if (filters?.trangthai) {
                query += ' AND b.trangthai = ?';
                params.push(filters.trangthai)
            }
            query += ' ORDER BY k.thutu,b.tenban';
            const [rows] = await db.query<TableRow[]>(query, params);
            return rows;
        } catch (error) {
            throw error;
        }
    }

    //tìm theo id
    static async findById(id: number): Promise<IBan | null> {
        try {
            const [rows] = await db.query<TableRow[]>(
                `SELECT b.*, k.tenkhuvuc, mq.maqr, mq.trangthai as qrtrangthai
                 FROM ban b
                 LEFT JOIN khuvuc k ON b.khuvucid = k.id
                 LEFT JOIN menuqr mq ON mq.banid = b.id AND mq.trangthai = 'hoatdong'
                 WHERE b.id = ?`,
                [id]
            );
            return rows[0] || null;
        } catch (error) {
            throw error;
        }
    }

    // tìm theo mã bàn 
    static async findByCode(maban: string): Promise<IBan | null> {
        try {
            const [rows] = await db.query<TableRow[]>(
                'SELECT * from ban WHERE maban = ?',
                [maban]
            );
            return rows[0] || null;
        } catch (error) {
            throw error;
        }
    }

    static async create(tableData: {
        maban: string;
        tenban: string;
        khuvucid?: number;
        sochongoi: number;
        vitrix?: number;
        vitriy?: number;
    }): Promise<IBan | null> {
        const connection = await db.getConnection(); 
        
        try {
            await connection.beginTransaction(); 

            const { maban, tenban, khuvucid, sochongoi, vitrix = 0, vitriy = 0 } = tableData;
            
            const [result] = await connection.query<ResultSetHeader>(
                'INSERT INTO ban (maban,tenban,khuvucid,sochongoi,vitrix,vitriy) VALUES (?,?,?,?,?,?)',
                [maban, tenban, khuvucid, sochongoi, vitrix, vitriy]
            );
            
            const newTableId = result.insertId;

            const qrToken = randomUUID();
            await connection.query(
                "INSERT INTO menuqr (maqr, banid, trangthai) VALUES (?, ?, 'hoatdong')",
                [qrToken, newTableId]
            );
            await connection.commit(); 
            return await this.findById(newTableId);
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Cập nhật bàn
    static async update(id: number, tableData: {
        tenban?: string;
        khuvucid?: number;
        sochongoi?: number;
        vitrix?: number;
        vitriy?: number;
    }): Promise<IBan | null> {
        try {
            const { tenban, khuvucid, sochongoi, vitrix, vitriy } = tableData;

            const updates: string[] = [];
            const params: any[] = [];

            if (tenban) {
                updates.push('tenban = ?');
                params.push(tenban);
            }
            if (khuvucid !== undefined) {
                updates.push('khuvucid = ?');
                params.push(khuvucid);
            }
            if (sochongoi) {
                updates.push('sochongoi = ?');
                params.push(sochongoi);
            }
            if (vitrix !== undefined) {
                updates.push('vitrix = ?');
                params.push(vitrix);
            }
            if (vitriy !== undefined) {
                updates.push('vitriy = ?');
                params.push(vitriy);
            }

            if (updates.length === 0) {
                return await this.findById(id);
            }

            params.push(id);

            await db.query(
                `UPDATE ban SET ${updates.join(', ')} WHERE id = ?`,
                params
            );

            return await this.findById(id);
        } catch (error) {
            throw error;
        }
    }

    // cập nhập trạng thái bàn
    static async updateStatus(id: number, trangthai: TrangThaiBan): Promise<IBan | null> {
        try {
            await db.query(
                'UPDATE ban SET trangthai = ? WHERE id = ?',
                [trangthai, id]
            );
            return await this.findById(id);
        } catch (error) {
            throw error;
        }
    }

    //cập nhập vị trí bán
    static async updatePosition(id: number, vitrix: number, vitriy: number): Promise<boolean> {
        try {
            await db.query(
                'UPDATE ban SET vitrix = ?, vitriy = ?  WHERE id = ?', [vitrix, vitriy, id]
            );
            return true;
        } catch (error) {
            throw error;
        }
    }

    //xóa bàn 
    static async delete(id: number): Promise<boolean> {
        try {
            //xem có đơn không
            const [orders] = await db.query<RowDataPacket[]>(
                `SELECT COUNT(*) as count FROM donhang 
                 WHERE banid = ? AND trangthai IN ('dangphucvu', 'chothanhtoan')`,
                [id]
            );

            if (orders[0].count > 0) {
                throw new Error('Không thể xóa bàn đang có khách');
            }

            await db.query('DELETE FROM ban WHERE id = ?', [id]);
            return true;
        } catch (error) {
            throw error;
        }
    }

    // danh sách bàn trống
    static async getAvailableTables(khuvucid?: number): Promise<IBan[]> {
        try {
            let query = 'SELECT * From ban where trangthai = ?';
            const params: any[] = [TrangThaiBan.TRONG];
            if (khuvucid) {
                query += ' AND khuvucid = ?';
                params.push(khuvucid);
            }
            const [rows] = await db.query<TableRow[]>(query, params);
            return rows;
        } catch (error) {
            throw error;
        }
    }

    // Kiểm tra mã bàn tồn tại
    static async exists(maban: string, excludeId?: number): Promise<boolean> {
        try {
            let query = 'SELECT id FROM ban WHERE maban = ?';
            const params: any[] = [maban];

            if (excludeId) {
                query += ' AND id != ?';
                params.push(excludeId);
            }

            const [rows] = await db.query<TableRow[]>(query, params);
            return rows.length > 0;
        } catch (error) {
            throw error;
        }
    }
}

export default Table;