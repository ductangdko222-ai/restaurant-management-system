// controllers/kitchenController.ts
import { Request, Response } from 'express';
import KitchenService from '../services/kitchenService';
import { KhuVucCheBien } from '../types';

class KitchenController {
  // GET /api/kitchen/tickets
  static async getAllTickets(req: Request, res: Response): Promise<void> {
    try {
      const { khuvucchebien, trangthai } = req.query;

      const filters: any = {};
      
      if (khuvucchebien) filters.khuvucchebien = khuvucchebien as KhuVucCheBien;
      if (trangthai) filters.trangthai = trangthai as string;

      const tickets = await KitchenService.getAllTickets(filters);

      res.json({
        success: true,
        data: tickets
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy danh sách phiếu bếp'
      });
    }
  }

  //   GET /api/kitchen/:khuvuc
  static async getTicketsByArea(req: Request, res: Response): Promise<void> {
    try {
      const { khuvuc } = req.params;
      
      const tickets = await KitchenService.getTicketsByArea(khuvuc as KhuVucCheBien);

      res.json({
        success: true,
        data: tickets
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy phiếu bếp'
      });
    }
  }

  //  POST /api/kitchen/:id/start
  static async startCooking(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Chưa đăng nhập'
        });
        return;
      }

      const ticket = await KitchenService.startCooking(Number(id), req.user.id);

      res.json({
        success: true,
        message: 'Đã bắt đầu làm món',
        data: ticket
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Bắt đầu làm món thất bại'
      });
    }
  }

  //   POST /api/kitchen/:id/finish
  static async finishCooking(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const ticket = await KitchenService.finishCooking(Number(id));

      res.json({
        success: true,
        message: 'Món đã sẵn sàng',
        data: ticket
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Hoàn thành món thất bại'
      });
    }
  }

  //  POST /api/kitchen/:id/served
  static async markAsServed(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      await KitchenService.markAsServed(Number(id));

      res.json({
        success: true,
        message: 'Đã đánh dấu món đã phục vụ'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Đánh dấu thất bại'
      });
    }
  }

  //  GET /api/kitchen/stats
  static async getKitchenStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await KitchenService.getKitchenStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy thống kê'
      });
    }
  }
}

export default KitchenController;