import { Router } from 'express';
import MenuController from '../controllers/menuController';
import TableController from '../controllers/tableController';
import OrderController from '../controllers/orderController';
import PaymentController from '../controllers/paymentController';

const router = Router();

// Public menu
router.get('/menu/by-category', MenuController.getMenuByCategory);
router.get('/menu/items/:id', MenuController.getMenuItemById);

// Public table
router.get('/tables/:id', TableController.getTableById);

router.get('/orders/table/:banid', OrderController.getActiveOrderByTable);
router.get('/orders/:id', OrderController.getPublicOrderById);
router.post('/orders', OrderController.createPublicOrder);
router.post('/orders/:id/items', OrderController.addItemToPublicOrder);
router.post('/orders/:id/paypal/create', PaymentController.createPublicPaypalOrder);
router.post('/orders/:id/paypal/capture', PaymentController.capturePublicPaypalOrder);
router.post('/paypal/webhook', PaymentController.paypalWebhook);
// PayPal webhook test endpoint
router.post('/paypal/webhook/test/:orderId', (req, res) => PaymentController.testPaypalWebhook(req, res));
// PayPal return redirect endpoint
router.get('/orders/paypal/return', (req, res) => PaymentController.paypalReturnHandler(req, res));

export default router;
