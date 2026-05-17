import { Router } from 'express';
import MenuController from '../controllers/menuController';
import TableController from '../controllers/tableController';
import OrderController from '../controllers/orderController';

const router = Router();

// Public menu
router.get('/menu/by-category', MenuController.getMenuByCategory);
router.get('/menu/items/:id', MenuController.getMenuItemById);

// Public table info
router.get('/tables/:id', TableController.getTableById);

// Public order flow for QR scan
router.get('/orders/table/:banid', OrderController.getActiveOrderByTable);
router.post('/orders', OrderController.createPublicOrder);
router.post('/orders/:id/items', OrderController.addItemToPublicOrder);

export default router;
