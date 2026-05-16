// controllers/paymentController.ts
import { Request, Response } from 'express';
import PaymentService from '../services/paymenService';
import { PhuongThucThanhToan } from '../types';

class PaymentController {
  //POST /api/payment/process
  static async processPayment(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Chưa đăng nhập'
        });
        return;
      }

      const paymentData = {
        ...req.body,
        nguoithunganid: req.user.id
      };

      const invoice = await PaymentService.processPayment(paymentData);

      res.json({
        success: true,
        message: 'Thanh toán thành công',
        data: invoice
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Thanh toán thất bại'
      });
    }
  }

  //    GET /api/payment/invoices
  static async getAllInvoices(req: Request, res: Response): Promise<void> {
    try {
      const { tungay, denngay, phuongthucthanhtoan, nguoithunganid } = req.query;

      const filters: any = {};

      if (tungay) filters.tungay = tungay as string;
      if (denngay) filters.denngay = denngay as string;
      if (phuongthucthanhtoan) filters.phuongthucthanhtoan = phuongthucthanhtoan as PhuongThucThanhToan;
      if (nguoithunganid) filters.nguoithunganid = Number(nguoithunganid);

      const invoices = await PaymentService.getAllInvoices(filters);

      res.json({
        success: true,
        data: invoices
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy danh sách hóa đơn'
      });
    }
  }

  //    GET /api/payment/invoices/:id
  static async getInvoiceById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const invoice = await PaymentService.getInvoiceById(Number(id));

      res.json({
        success: true,
        data: invoice
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || 'Không tìm thấy hóa đơn'
      });
    }
  }

  //    GET /api/payment/invoices/code/:mahoadon
  static async getInvoiceByCode(req: Request, res: Response): Promise<void> {
    try {
      const { mahoadon } = req.params;
      const invoice = await PaymentService.getInvoiceByCode(mahoadon);

      res.json({
        success: true,
        data: invoice
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || 'Không tìm thấy hóa đơn'
      });
    }
  }

  //    POST /api/payment/shifts/open
  static async openShift(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Chưa đăng nhập'
        });
        return;
      }

      const { tiendauca } = req.body;

      if (tiendauca === undefined) {
        res.status(400).json({
          success: false,
          message: 'Vui lòng nhập tiền đầu ca'
        });
        return;
      }

      const shift = await PaymentService.openShift(req.user.id, tiendauca);

      res.status(201).json({
        success: true,
        message: 'Mở ca thành công',
        data: shift
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Mở ca thất bại'
      });
    }
  }

  //    POST /api/payment/shifts/:id/close
  static async closeShift(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { tiencuoica } = req.body;

      if (tiencuoica === undefined) {
        res.status(400).json({
          success: false,
          message: 'Vui lòng nhập tiền cuối ca'
        });
        return;
      }

      const shift = await PaymentService.closeShift(Number(id), tiencuoica);

      res.json({
        success: true,
        message: 'Đóng ca thành công',
        data: shift
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Đóng ca thất bại'
      });
    }
  }

  //    GET /api/payment/shifts/active
  static async getActiveShift(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Chưa đăng nhập'
        });
        return;
      }

      const shift = await PaymentService.getActiveShift(req.user.id);

      res.json({
        success: true,
        data: shift
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy ca làm việc'
      });
    }
  }

  //    GET /api/payment/shifts
  static async getAllShifts(req: Request, res: Response): Promise<void> {
    try {
      const { nguoidungid, tungay, denngay, trangthai } = req.query;

      const filters: any = {};

      if (nguoidungid) filters.nguoidungid = Number(nguoidungid);
      if (tungay) filters.tungay = tungay as string;
      if (denngay) filters.denngay = denngay as string;
      if (trangthai) filters.trangthai = trangthai as string;

      const shifts = await PaymentService.getAllShifts(filters);

      res.json({
        success: true,
        data: shifts
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy danh sách ca'
      });
    }
  }

  //    GET /api/payment/stats
  static async getRevenueStats(req: Request, res: Response): Promise<void> {
    try {
      const { tungay, denngay } = req.query;

      const filters: any = {};

      if (tungay) filters.tungay = tungay as string;
      if (denngay) filters.denngay = denngay as string;

      const stats = await PaymentService.getRevenueStats(filters);

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

  static async doanhThuTheoCA(req: Request, res: Response): Promise<void> {
    try {
      const calamviecid = parseInt(req.params.calamviecid);

      const data = await PaymentService.getDoanhThuTheoCA(calamviecid);

      res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      if (error.status) {
        res.status(error.status).json({ success: false, message: error.message });
        return;
      }
      console.error('doanhThuTheoCA error:', error);
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  }


  static async topMon(req: Request, res: Response): Promise<void> {
    try {
      const { tungay, denngay, limit } = req.query;

      const data = await PaymentService.getTopMon({
        tungay: tungay as string | undefined,
        denngay: denngay as string | undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.json({
        success: true,
        total: data.length,
        data,
      });
    } catch (error: any) {
      if (error.status) {
        res.status(error.status).json({ success: false, message: error.message });
        return;
      }
      console.error('topMon error:', error);
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  }

  static async doanhThuTheoNgay(req: Request, res: Response): Promise<void> {
    try {
      const { tungay, denngay } = req.query;
      const data = await PaymentService.getDoanhThuTheoNgay({
        tungay: tungay as string | undefined,
        denngay: denngay as string | undefined,
      });
      res.json({ success: true, data });
    } catch (error: any) {
      if (error.status) {
        res.status(error.status).json({ success: false, message: error.message });
        return;
      }
      console.error('doanhThuTheoNgay error:', error);
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  }

 
  static async doanhThuTungNgay(req: Request, res: Response): Promise<void> {
    try {
      const { tungay, denngay } = req.query;
      const data = await PaymentService.getDoanhThuTungNgay({
        tungay: tungay as string | undefined,
        denngay: denngay as string | undefined,
      });
      res.json({ success: true, total: data.length, data });
    } catch (error: any) {
      if (error.status) {
        res.status(error.status).json({ success: false, message: error.message });
        return;
      }
      console.error('doanhThuTungNgay error:', error);
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  }

  
  static async tongQuanHomNay(req: Request, res: Response): Promise<void> {
    try {
      const data = await PaymentService.getTongQuanHomNay();
      res.json({ success: true, data });
    } catch (error: any) {
      console.error('tongQuanHomNay error:', error);
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  }

 
  static async canhBao(req: Request, res: Response): Promise<void> {
    try {
      const data = await PaymentService.getCanhBao();
      res.json({ success: true, data });
    } catch (error: any) {
      console.error('canhBao error:', error);
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  }

  
  static async soSanh2Ky(req: Request, res: Response): Promise<void> {
    try {
      const { ky1, ky2 } = req.body;
      if (!ky1 || !ky2) {
        res.status(400).json({ success: false, message: 'Thiếu ky1 hoặc ky2' });
        return;
      }
      const data = await PaymentService.getSoSanh2Ky(ky1, ky2);
      res.json({ success: true, data });
    } catch (error: any) {
      if (error.status) {
        res.status(error.status).json({ success: false, message: error.message });
        return;
      }
      console.error('soSanh2Ky error:', error);
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  }
}

export default PaymentController;