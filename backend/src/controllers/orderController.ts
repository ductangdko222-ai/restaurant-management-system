// controllers/orderController.ts
import { Request, Response } from 'express';
import OrderService from '../services/orderService';
import { TrangThaiDonHang } from '../types';

class OrderController {
  //GET /api/orders
  static async getAllOrders(req: Request, res: Response): Promise<void> {
    try {
      const { trangthai, banid, calamviecid, tungay, denngay, page, limit } = req.query;

      const filters: any = {};
      
      if (trangthai) filters.trangthai = trangthai as TrangThaiDonHang;
      if (banid) filters.banid = Number(banid);
      if (calamviecid) filters.calamviecid = Number(calamviecid);
      if (tungay) filters.tungay = tungay as string;
      if (denngay) filters.denngay = denngay as string;
      
      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 10;

      const result = await OrderService.getAllOrders(filters, pageNum, limitNum);

      res.json({
        success: true,
        data: result.data,
        totalPages: result.totalPages,
        currentPage: pageNum
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy danh sách đơn hàng'
      });
    }
  }

  //    GET /api/orders/:id
  static async getOrderById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const order = await OrderService.getOrderById(Number(id));

      res.json({
        success: true,
        data: order
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || 'Không tìm thấy đơn hàng'
      });
    }
  }

  //  GET /api/orders/table/:banid
  static async getActiveOrderByTable(req: Request, res: Response): Promise<void> {
    try {
      const { banid } = req.params;
      const order = await OrderService.getActiveOrderByTable(Number(banid));

      res.json({
        success: true,
        data: order
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy đơn hàng'
      });
    }
  }

  //    POST /api/orders

  static async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const orderData = {
        ...req.body,
        nguoiphucvuid: req.user!.id
      };

      const newOrder = await OrderService.createOrder(orderData);

      res.status(201).json({
        success: true,
        message: 'Tạo đơn hàng thành công',
        data: newOrder
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Tạo đơn hàng thất bại'
      });
    }
  }

  // POST /api/orders/:id/items)
  static async addItemToOrder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const itemData = {
        donhangid: Number(id),
        ...req.body
      };

      const newItem = await OrderService.addItemToOrder(itemData);

      res.status(201).json({
        success: true,
        message: 'Thêm món thành công',
        data: newItem
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Thêm món thất bại'
      });
    }
  }

  // POST /api/public/orders
  static async createPublicOrder(req: Request, res: Response): Promise<void> {
    try {
      const orderPayload = {
        ...req.body,
        nguoiphucvuid: null,
        trangthai: TrangThaiDonHang.CHO_XAC_NHAN
      };
      const createdOrder = await OrderService.createOrder(orderPayload);

      if (orderPayload.chitiet && Array.isArray(orderPayload.chitiet)) {
        for (const item of orderPayload.chitiet) {
          await OrderService.addItemToOrder({
            donhangid: createdOrder.id,
            monanid: item.monanid,
            soluong: item.soluong,
            dongia: item.dongia,
            ghichu: item.ghichu,
            bienthe: item.bienthe || []
          });
        }
      }

      const order = await OrderService.getOrderById(createdOrder.id);

      res.status(201).json({
        success: true,
        message: 'Tạo đơn công khai thành công',
        data: order
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Tạo đơn công khai thất bại'
      });
    }
  }

  // POST /api/public/orders/:id/items
  static async addItemToPublicOrder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const itemData = {
        donhangid: Number(id),
        ...req.body
      };

      const newItem = await OrderService.addItemToOrder(itemData);

      res.status(201).json({
        success: true,
        message: 'Thêm món công khai thành công',
        data: newItem
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Thêm món công khai thất bại'
      });
    }
  }

  //    PUT /api/orders/items/:id
  static async updateOrderItem(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const itemData = req.body;

      await OrderService.updateOrderItem(Number(id), itemData);

      res.json({
        success: true,
        message: 'Cập nhật món thành công'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Cập nhật món thất bại'
      });
    }
  }

  //   DELETE /api/orders/items/:id
  static async deleteOrderItem(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await OrderService.deleteOrderItem(Number(id));

      res.json({
        success: true,
        message: 'Xóa món thành công'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Xóa món thất bại'
      });
    }
  }

  // POST /api/orders/:id/send-to-kitchen
  static async sendToKitchen(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { chitietIds } = req.body;

      const tickets = await OrderService.sendToKitchen(Number(id), chitietIds);

      res.json({
        success: true,
        message: 'Đã gửi món xuống bếp',
        data: tickets
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Gửi bếp thất bại'
      });
    }
  }

  // PATCH /api/orders/:id/status
  static async updateOrderStatus(req: Request, res: Response): Promise<void> {
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

      const updatedOrder = await OrderService.updateOrderStatus(
        Number(id),
        trangthai as TrangThaiDonHang
      );

      res.json({
        success: true,
        message: 'Cập nhật trạng thái thành công',
        data: updatedOrder
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Cập nhật trạng thái thất bại'
      });
    }
  }

  // DELETE /api/orders/:id
  static async cancelOrder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await OrderService.cancelOrder(Number(id));

      res.json({
        success: true,
        message: 'Hủy đơn hàng thành công'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Hủy đơn hàng thất bại'
      });
    }
  }

  // GET /api/orders/confirmation/pending
  static async getPendingConfirmationOrders(req: Request, res: Response): Promise<void> {
    try {
      const orders = await OrderService.getPendingConfirmationOrders();

      res.json({
        success: true,
        data: orders
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy danh sách đơn chờ xác nhận'
      });
    }
  }

  // POST /api/orders/:id/confirm
  static async confirmOrder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const order = await OrderService.confirmOrder(Number(id));

      res.json({
        success: true,
        message: 'Xác nhận đơn hàng thành công',
        data: order
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Xác nhận đơn hàng thất bại'
      });
    }
  }
}

export default OrderController;