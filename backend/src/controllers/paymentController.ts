// controllers/paymentController.ts
import { Request, Response } from 'express';
import PaymentService from '../services/paymenService';
import PayPalService from '../services/paypalService';
import OrderService from '../services/orderService';
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

  // POST /api/public/orders/:id/paypal/create
  static async createPublicPaypalOrder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { description } = req.body;

      console.log('[PayPal Create] Creating PayPal order for orderId:', id);

      const order = await OrderService.getOrderById(Number(id));
      if (!order) {
        console.warn('[PayPal Create] Order not found:', id);
        res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        return;
      }

      const amount = Number(order.tongthanhtoan || order.tongtien || 0);
      if (amount <= 0) {
        console.warn('[PayPal Create] Invalid amount:', amount);
        res.status(400).json({ success: false, message: 'Số tiền thanh toán không hợp lệ' });
        return;
      }

      console.log('[PayPal Create] Creating PayPal order with amount:', amount, 'for madon:', order.madon);
      const paypalOrder = await PayPalService.createOrder(amount, description || `Thanh toán đơn ${order.madon}`, Number(id));
      const approveUrl = paypalOrder.links?.find((link: any) => link.rel === 'approve')?.href ||
        `https://${PayPalService.getMode() === 'sandbox' ? 'www.sandbox.' : 'www.'}paypal.com/checkoutnow?token=${paypalOrder.id}`;

      console.log('[PayPal Create] PayPal order created:', { paypalOrderId: paypalOrder.id, status: paypalOrder.status });

      res.json({
        success: true,
        data: {
          orderId: paypalOrder.id,
          status: paypalOrder.status,
          clientId: PayPalService.getClientId(),
          currency: PayPalService.getCurrency(),
          approveUrl
        }
      });
    } catch (error: any) {
      console.error('[PayPal Create] Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Không thể tạo PayPal order'
      });
    }
  }

  // POST /api/public/paypal/webhook
  static async paypalWebhook(req: Request, res: Response): Promise<void> {
    try {
      const event = req.body;
      console.log('[PayPal Webhook] Received webhook:', JSON.stringify(event, null, 2));
      
      const eventType = event?.event_type;
      const resource = event?.resource || {};
      const paypalOrderId = resource?.id || resource?.order_id;
      const customId = resource?.purchase_units?.[0]?.custom_id || resource?.custom_id;
      const orderId = Number(customId);

      console.log('[PayPal Webhook] Extracted data:', { eventType, paypalOrderId, customId, orderId });

      if (!paypalOrderId || !orderId || isNaN(orderId)) {
        console.warn('[PayPal Webhook] Invalid payload - missing or invalid orderId/paypalOrderId');
        res.status(400).json({ success: false, message: 'Invalid PayPal webhook payload' });
        return;
      }

      if (eventType === 'CHECKOUT.ORDER.APPROVED' || eventType === 'PAYMENT.CAPTURE.COMPLETED' || eventType === 'CHECKOUT.ORDER.COMPLETED') {
        console.log('[PayPal Webhook] Processing event type:', eventType, 'for orderId:', orderId);
        
        const order = await OrderService.getOrderById(orderId);
        if (!order) {
          console.warn('[PayPal Webhook] Order not found:', orderId);
          res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
          return;
        }

        console.log('[PayPal Webhook] Order found:', { id: order.id, madon: order.madon, trangthai: order.trangthai });

        if (order.trangthai === 'dathanhtoan') {
          console.log('[PayPal Webhook] Order already paid:', orderId);
          res.json({ success: true, message: 'Order đã được thanh toán trước đó' });
          return;
        }

        try {
          if (eventType === 'CHECKOUT.ORDER.APPROVED') {
            console.log('[PayPal Webhook] Capturing PayPal order:', paypalOrderId);
            await PayPalService.captureOrder(paypalOrderId);
            console.log('[PayPal Webhook] Capture successful');
          }
        } catch (captureError: any) {
          console.error('[PayPal Webhook] Capture failed:', captureError.message);
          // Không dừng luồng, tiếp tục xử lý payment
        }

        try {
          const amount = Number(order.tongthanhtoan || order.tongtien || 0);
          console.log('[PayPal Webhook] Processing payment with amount:', amount);
          
          const invoice = await PaymentService.processPayment({
            donhangid: order.id,
            nguoithunganid: null,
            phuongthucthanhtoan: PhuongThucThanhToan.PAYPAL,
            tienkhacdua: amount,
            tongthanhtoan: amount,
            tienthua: 0,
            ghichu: `Thanh toán PayPal: ${paypalOrderId}`
          });
          console.log('[PayPal Webhook] Payment processed successfully:', { invoiceId: invoice?.id, mahoadon: invoice?.mahoadon });
        } catch (paymentError: any) {
          console.error('[PayPal Webhook] Payment processing failed:', paymentError.message);
          throw paymentError;
        }

        console.log('[PayPal Webhook] Webhook processed successfully for orderId:', orderId);
        res.json({ success: true, message: 'Webhook PayPal đã xử lý thành công' });
        return;
      }

      console.log('[PayPal Webhook] Event type not handled:', eventType);
      res.json({ success: true, message: 'Webhook PayPal không cần xử lý event này' });
    } catch (error: any) {
      console.log('[PayPal Webhook] Unhandled error:', error);
      res.status(500).json({ success: false, message: error.message || 'Lỗi khi xử lý webhook PayPal' });
    }
  }

  // POST /api/public/paypal/webhook/test/:orderId - Test endpoint for debugging
  static async testPaypalWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      console.log('[PayPal Test Webhook] Simulating PayPal webhook for orderId:', orderId);

      if (!orderId || isNaN(Number(orderId))) {
        res.status(400).json({ success: false, message: 'Invalid orderId' });
        return;
      }

      const order = await OrderService.getOrderById(Number(orderId));
      if (!order) {
        console.warn('[PayPal Test Webhook] Order not found:', orderId);
        res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        return;
      }

      console.log('[PayPal Test Webhook] Order found:', { id: order.id, madon: order.madon, trangthai: order.trangthai });

      if (order.trangthai === 'dathanhtoan') {
        console.log('[PayPal Test Webhook] Order already paid');
        res.json({ success: true, message: 'Order đã được thanh toán trước đó' });
        return;
      }

      const amount = Number(order.tongthanhtoan || order.tongtien || 0);
      console.log('[PayPal Test Webhook] Processing payment with amount:', amount);

      const invoice = await PaymentService.processPayment({
        donhangid: order.id,
        nguoithunganid: null,
        phuongthucthanhtoan: PhuongThucThanhToan.PAYPAL,
        tienkhacdua: amount,
        tongthanhtoan: amount,
        tienthua: 0,
        ghichu: 'Test: Thanh toán PayPal (Webhook Test)'
      });

      console.log('[PayPal Test Webhook] Payment processed successfully:', { invoiceId: invoice?.id, mahoadon: invoice?.mahoadon });

      res.json({
        success: true,
        message: 'Test webhook xử lý thành công. Kiểm tra frontend để xem trạng thái cập nhật.',
        data: { invoice, order: { id: order.id, madon: order.madon } }
      });
    } catch (error: any) {
      console.error('[PayPal Test Webhook] Error:', error);
      res.status(500).json({ success: false, message: error.message || 'Lỗi khi test webhook PayPal' });
    }
  }

  // POST /api/public/orders/:id/paypal/capture
  static async capturePublicPaypalOrder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { orderId } = req.body;

      console.log('[PayPal Capture] Request params:', { id, orderId });

      if (!orderId) {
        res.status(400).json({ success: false, message: 'Thiếu orderId của PayPal' });
        return;
      }

      let paypalCapture: any = null;
      if (orderId === 'SIMULATED') {
        console.log('[PayPal Capture] Using simulated capture');
        paypalCapture = { simulated: true };
      } else {
        console.log('[PayPal Capture] Capturing real PayPal order:', orderId);
        paypalCapture = await PayPalService.captureOrder(orderId);
      }
      
      console.log('[PayPal Capture] Getting order:', id);
      const order = await OrderService.getOrderById(Number(id));
      if (!order) {
        console.warn('[PayPal Capture] Order not found:', id);
        res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        return;
      }
      
      // Khi khách thanh toán PayPal, gửi món xuống bếp trước (tạo phiếu bếp),
      // rồi tiếp tục tạo hoá đơn để ghi nhận thanh toán.
      try {
        console.log('[PayPal Capture] Sending to kitchen for order:', id);
        await OrderService.sendToKitchen(Number(id));
        console.log('[PayPal Capture] Kitchen tickets created');
      } catch (err: any) {
        // Không làm gián đoạn luồng thanh toán nếu gửi bếp thất bại; chỉ log lỗi
        console.warn('[PayPal Capture] Send to kitchen failed (non-critical):', err.message);
      }

      const amount = Number(order.tongthanhtoan || order.tongtien || 0);
      console.log('[PayPal Capture] Processing payment, amount:', amount);
      const invoice = await PaymentService.processPayment({
        donhangid: order.id,
        nguoithunganid: null,
        phuongthucthanhtoan: PhuongThucThanhToan.PAYPAL,
        tienkhacdua: amount,
        tongthanhtoan: amount,
        tienthua: 0,
        ghichu: `Thanh toán PayPal: ${orderId}`
      });

      console.log('[PayPal Capture] Payment processed successfully, invoice id:', invoice?.id);
      res.json({
        success: true,
        message: 'Thanh toán PayPal thành công',
        data: {
          invoice,
          paypalCapture
        }
      });
    } catch (error: any) {
      console.error('[PayPal Capture] Error:', error);
      const statusCode = error.status || 500;
      const message = error.message || 'Không thể xác nhận thanh toán PayPal';
      res.status(statusCode).json({
        success: false,
        message: message
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