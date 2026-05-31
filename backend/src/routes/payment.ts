// routes/payment.ts
import { Router } from 'express';
import PaymentController from '../controllers/paymentController';
import { auth, authorize } from '../middleware/auth';
import { VaiTro } from '../types';

const router = Router();

router.use(auth);


// Thanh toán đơn hàng (Thu ngân, Admin)
router.post(
  '/process',
  authorize(VaiTro.THU_NGAN, VaiTro.ADMIN),
  PaymentController.processPayment
);

// Lấy danh sách hóa đơn
router.get('/invoices', PaymentController.getAllInvoices);

// Lấy chi tiết hóa đơn
router.get('/invoices/:id', PaymentController.getInvoiceById);

// Lấy hóa đơn theo đơn hàng
router.get('/invoices/order/:donhangid', PaymentController.getInvoiceByOrderId);

// Lấy hóa đơn theo mã
router.get('/invoices/code/:mahoadon', PaymentController.getInvoiceByCode);


// Mở ca (Thu ngân)
router.post(
  '/shifts/open',
  authorize(VaiTro.THU_NGAN, VaiTro.ADMIN),
  PaymentController.openShift
);

// Đóng ca (Thu ngân)
router.post(
  '/shifts/:id/close',
  authorize(VaiTro.THU_NGAN, VaiTro.ADMIN),
  PaymentController.closeShift
);

// Lấy ca đang mở
router.get('/shifts/active', PaymentController.getActiveShift);

// Lấy danh sách ca (Admin, Thu ngân)
router.get(
  '/shifts',
  authorize(VaiTro.THU_NGAN, VaiTro.ADMIN),
  PaymentController.getAllShifts
);


// Thống kê doanh thu (Admin, Thu ngân)
router.get(
  '/stats',
  authorize(VaiTro.THU_NGAN, VaiTro.ADMIN),
  PaymentController.getRevenueStats
);
router.get(
  '/doanhthu/calamviec/:calamviecid',
  authorize(VaiTro.THU_NGAN, VaiTro.ADMIN),
  PaymentController.doanhThuTheoCA
);

router.get(
  '/topmon',
  authorize(VaiTro.THU_NGAN, VaiTro.ADMIN),
  PaymentController.topMon
);


router.get(
  '/doanh-thu/ca-lam-viec/:calamviecid',
  authorize(VaiTro.THU_NGAN, VaiTro.ADMIN),
  PaymentController.doanhThuTheoCA
);

router.get(
  '/tong-quan-hom-nay',
  authorize(VaiTro.THU_NGAN, VaiTro.ADMIN),
  PaymentController.tongQuanHomNay
);

router.get(
  '/canh-bao',
  authorize(VaiTro.THU_NGAN, VaiTro.ADMIN),
  PaymentController.canhBao
);

router.get(
  '/doanh-thu/tong-quan',
  authorize(VaiTro.THU_NGAN, VaiTro.ADMIN),
  PaymentController.doanhThuTheoNgay
);

router.get(
  '/doanh-thu/tung-ngay',
  authorize(VaiTro.THU_NGAN, VaiTro.ADMIN),
  PaymentController.doanhThuTungNgay
);

router.get(
  '/top-mon',
  authorize(VaiTro.THU_NGAN, VaiTro.ADMIN),
  PaymentController.topMon
);

router.post(
  '/doanh-thu/so-sanh-2-ky',
  authorize(VaiTro.THU_NGAN, VaiTro.ADMIN),
  PaymentController.soSanh2Ky
);
export default router;