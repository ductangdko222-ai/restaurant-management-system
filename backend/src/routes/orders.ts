import { Router } from 'express';
import OrderController from '../controllers/orderController';
import { auth, authorize } from '../middleware/auth';
import { VaiTro } from '../types';

const router = Router();

router.use(auth);

router.get('/table/:banid', OrderController.getActiveOrderByTable);

router.get('/confirmation/pending', OrderController.getPendingConfirmationOrders);

router.get('/', OrderController.getAllOrders);

router.post(
  '/',
  authorize(VaiTro.PHUC_VU, VaiTro.ADMIN),
  OrderController.createOrder
);

router.put(
  '/items/:id',
  authorize(VaiTro.PHUC_VU, VaiTro.ADMIN),
  OrderController.updateOrderItem
);

router.delete(
  '/items/:id',
  authorize(VaiTro.PHUC_VU, VaiTro.ADMIN),
  OrderController.deleteOrderItem
);

router.get('/:id', OrderController.getOrderById);

router.post(
  '/:id/items',
  authorize(VaiTro.PHUC_VU, VaiTro.ADMIN),
  OrderController.addItemToOrder
);

router.post(
  '/:id/send-to-kitchen',
  authorize(VaiTro.PHUC_VU, VaiTro.ADMIN),
  OrderController.sendToKitchen
);

router.post(
  '/:id/confirm',
  authorize(VaiTro.PHUC_VU, VaiTro.ADMIN),
  OrderController.confirmOrder
);

router.patch('/:id/status', OrderController.updateOrderStatus);

router.delete(
  '/:id',
  authorize(VaiTro.PHUC_VU, VaiTro.ADMIN),
  OrderController.cancelOrder
);

export default router;