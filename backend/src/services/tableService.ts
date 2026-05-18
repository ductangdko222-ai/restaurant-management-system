import Table from '../models/Table';
import Order from '../models/Order';
import db from '../config/db';
import { IBan, TrangThaiBan, TrangThaiDonHang } from '../types';

class TableService {
  // Lấy tất 
  static async getAllTables(filters?: {
    khuvucid?: number;
    trangthai?: TrangThaiBan;
  }): Promise<IBan[]> {
    try {
      return await Table.findAll(filters);
    } catch (error) {
      throw error;
    }
  }

  static async getTableById(id: number): Promise<IBan> {
    try {
      const table = await Table.findById(id);
      
      if (!table) {
        throw new Error('Không tìm thấy bàn');
      }

      return table;
    } catch (error) {
      throw error;
    }
  }

  // Tạo bàn mới
  static async createTable(tableData: {
    maban: string;
    tenban: string;
    khuvucid?: number;
    sochongoi: number;
    vitrix?: number;
    vitriy?: number;
  }): Promise<IBan> {
    try {
      // Validate
      if (!tableData.maban || !tableData.tenban) {
        throw new Error('Vui lòng nhập đầy đủ thông tin');
      }

      if (tableData.sochongoi < 1) {
        throw new Error('Số chỗ ngồi phải lớn hơn 0');
      }

      const exists = await Table.exists(tableData.maban);
      if (exists) {
        throw new Error('Mã bàn đã tồn tại');
      }

      const newTable = await Table.create(tableData);

      if (!newTable) {
        throw new Error('Không thể tạo bàn');
      }

      return newTable;
    } catch (error) {
      throw error;
    }
  }

  // Cập nhật bàn
  static async updateTable(id: number, tableData: {
    tenban?: string;
    khuvucid?: number;
    sochongoi?: number;
    vitrix?: number;
    vitriy?: number;
  }): Promise<IBan> {
    try {
      await this.getTableById(id);

      if (tableData.sochongoi && tableData.sochongoi < 1) {
        throw new Error('Số chỗ ngồi phải lớn hơn 0');
      }

      const updatedTable = await Table.update(id, tableData);

      if (!updatedTable) {
        throw new Error('Không thể cập nhật bàn');
      }

      return updatedTable;
    } catch (error) {
      throw error;
    }
  }

  // Cập nhật trạng thái bàn
  static async updateTableStatus(id: number, trangthai: TrangThaiBan): Promise<IBan> {
    try {
      await this.getTableById(id);
      const updatedTable = await Table.updateStatus(id, trangthai);

      if (!updatedTable) {
        throw new Error('Không thể cập nhật trạng thái bàn');
      }

      return updatedTable;
    } catch (error) {
      throw error;
    }
  }

  // Cập nhật vị trí bàn
  static async updateTablePosition(
    id: number,
    vitrix: number,
    vitriy: number
  ): Promise<boolean> {
    try {
      await this.getTableById(id);
      return await Table.updatePosition(id, vitrix, vitriy);
    } catch (error) {
      throw error;
    }
  }

  // Xóa bàn
  static async deleteTable(id: number): Promise<boolean> {
    try {
      await this.getTableById(id);
      return await Table.delete(id);
    } catch (error) {
      throw error;
    }
  }

  // Lấy bàn trống
  static async getAvailableTables(khuvucid?: number): Promise<IBan[]> {
    try {
      return await Table.getAvailableTables(khuvucid);
    } catch (error) {
      throw error;
    }
  }

  // Chuyển bàn
  static async transferTable(fromTableId: number, toTableId: number): Promise<void> {
    try {
      // Kiểm tra cả 2 bàn tồn tại
      const fromTable = await this.getTableById(fromTableId);
      const toTable = await this.getTableById(toTableId);

      if (fromTable.trangthai !== TrangThaiBan.CO_KHACH) {
        throw new Error('Bàn nguồn không có khách');
      }

      if (toTable.trangthai !== TrangThaiBan.TRONG) {
        throw new Error('Bàn đích không trống');
      }

      const order = await Order.findActiveByTableId(fromTableId);
      if (order) {
        await Order.update(order.id, { banid: toTableId });
      }

      await Table.updateStatus(fromTableId, TrangThaiBan.TRONG);
      await Table.updateStatus(toTableId, TrangThaiBan.CO_KHACH);
    } catch (error) {
      throw error;
    }
  }

  static async mergeTables(targetTableId: number, sourceTableIds: number[]): Promise<void> {
    if (!sourceTableIds || sourceTableIds.length === 0) {
      throw new Error('Vui lòng chọn bàn nguồn để ghép');
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const targetOrder = await Order.findActiveByTableId(targetTableId);
      const sourceIds = sourceTableIds.filter(id => id !== targetTableId);

      const sourceOrders = [];
      for (const sourceTableId of sourceIds) {
        const sourceOrder = await Order.findActiveByTableId(sourceTableId);
        if (!sourceOrder) {
          throw new Error(`Bàn ${sourceTableId} không có đơn để ghép`);
        }
        sourceOrders.push(sourceOrder);
      }

      if (!targetOrder && sourceOrders.length === 0) {
        throw new Error('Không có đơn hàng nào để ghép');
      }

      let finalOrder = targetOrder;
      if (!finalOrder) {
        finalOrder = sourceOrders.shift()!;
        await Order.update(finalOrder.id, { banid: targetTableId });
      }

      for (const sourceOrder of sourceOrders) {
        if (sourceOrder.id === finalOrder.id) continue;

        await connection.query(
          'UPDATE chitietdonhang SET donhangid = ? WHERE donhangid = ?',
          [finalOrder.id, sourceOrder.id]
        );

        await connection.query(
          'UPDATE donhang SET banid = NULL, trangthai = ? WHERE id = ?',
          [TrangThaiDonHang.DA_HUY, sourceOrder.id]
        );
      }

      const totals = await Order.calculateTotal(finalOrder.id);
      await Order.update(finalOrder.id, totals);

      // Cập nhật trạng thái bàn
      await Table.updateStatus(targetTableId, TrangThaiBan.CO_KHACH);
      for (const sourceTableId of sourceIds) {
        await Table.updateStatus(sourceTableId, TrangThaiBan.TRONG);
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

export default TableService;