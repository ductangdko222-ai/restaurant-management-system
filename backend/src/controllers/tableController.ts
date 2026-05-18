// controllers/tableController.ts
import { Request, Response } from 'express';
import TableService from '../services/tableService';
import { TrangThaiBan } from '../types';

class TableController {

  static async getAllTables(req: Request, res: Response): Promise<void> {
    try {
      const { khuvucid, trangthai } = req.query;

      const filters: any = {};
      
      if (khuvucid) filters.khuvucid = Number(khuvucid);
      if (trangthai) filters.trangthai = trangthai as TrangThaiBan;

      const tables = await TableService.getAllTables(filters);

      res.json({
        success: true,
        data: tables
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy danh sách bàn'
      });
    }
  }

  static async getTableById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const table = await TableService.getTableById(Number(id));

      res.json({
        success: true,
        data: table
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || 'Không tìm thấy bàn'
      });
    }
  }


  static async createTable(req: Request, res: Response): Promise<void> {
    try {
      const tableData = req.body;
      const newTable = await TableService.createTable(tableData);

      res.status(201).json({
        success: true,
        message: 'Tạo bàn thành công',
        data: newTable
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Tạo bàn thất bại'
      });
    }
  }


  static async updateTable(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tableData = req.body;
      
      const updatedTable = await TableService.updateTable(Number(id), tableData);

      res.json({
        success: true,
        message: 'Cập nhật bàn thành công',
        data: updatedTable
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Cập nhật bàn thất bại'
      });
    }
  }


  static async updateTableStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { trangthai } = req.body;

      if (!trangthai) {
        res.status(400).json({
          success: false,
          message: 'Vui lòng nhập trạng thái'
        });
        return;
      }

      const updatedTable = await TableService.updateTableStatus(
        Number(id),
        trangthai as TrangThaiBan
      );

      res.json({
        success: true,
        message: 'Cập nhật trạng thái thành công',
        data: updatedTable
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Cập nhật trạng thái thất bại'
      });
    }
  }

//cập nhật vị trí
  static async updateTablePosition(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { vitrix, vitriy } = req.body;

      if (vitrix === undefined || vitriy === undefined) {
        res.status(400).json({
          success: false,
          message: 'Vui lòng nhập vị trí'
        });
        return;
      }

      await TableService.updateTablePosition(Number(id), vitrix, vitriy);

      res.json({
        success: true,
        message: 'Cập nhật vị trí thành công'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Cập nhật vị trí thất bại'
      });
    }
  }

  static async deleteTable(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await TableService.deleteTable(Number(id));

      res.json({
        success: true,
        message: 'Xóa bàn thành công'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Xóa bàn thất bại'
      });
    }
  }

//danh sách bàn 0
  static async getAvailableTables(req: Request, res: Response): Promise<void> {
    try {
      const { khuvucid } = req.query;
      
      const tables = await TableService.getAvailableTables(
        khuvucid ? Number(khuvucid) : undefined
      );

      res.json({
        success: true,
        data: tables
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy danh sách bàn trống'
      });
    }
  }


  static async transferTable(req: Request, res: Response): Promise<void> {
    try {
      const { fromTableId, toTableId } = req.body;

      if (!fromTableId || !toTableId) {
        res.status(400).json({
          success: false,
          message: 'Vui lòng chọn bàn nguồn và bàn đích'
        });
        return;
      }

      await TableService.transferTable(fromTableId, toTableId);

      res.json({
        success: true,
        message: 'Chuyển bàn thành công'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Chuyển bàn thất bại'
      });
    }
  }

  static async mergeTables(req: Request, res: Response): Promise<void> {
    try {
      const { targetTableId, sourceTableIds } = req.body;

      if (!targetTableId || !Array.isArray(sourceTableIds) || sourceTableIds.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Vui lòng chọn bàn đích và bàn nguồn để ghép'
        });
        return;
      }

      await TableService.mergeTables(targetTableId, sourceTableIds);

      res.json({
        success: true,
        message: 'Ghép bàn thành công'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Ghép bàn thất bại'
      });
    }
  }
}

export default TableController;