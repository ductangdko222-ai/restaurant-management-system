// routes/tables.ts
import { Router } from 'express';
import TableController from '../controllers/tableController';
import { auth, authorize } from '../middleware/auth';
import { VaiTro } from '../types';

const router = Router();

router.use(auth);

router.get('/', TableController.getAllTables);
router.get('/available', TableController.getAvailableTables);
router.get('/:id', TableController.getTableById);

// Phục vụ và Admin
router.patch(
  '/:id/status',
  authorize(VaiTro.PHUC_VU, VaiTro.ADMIN),
  TableController.updateTableStatus
);

router.post(
  '/transfer',
  authorize(VaiTro.PHUC_VU, VaiTro.ADMIN),
  TableController.transferTable
);

router.post(
  '/merge',
  authorize(VaiTro.PHUC_VU, VaiTro.ADMIN),
  TableController.mergeTables
);

// Chỉ Admin
router.post(
  '/',
  authorize(VaiTro.ADMIN),
  TableController.createTable
);

router.put(
  '/:id',
  authorize(VaiTro.ADMIN),
  TableController.updateTable
);

router.patch(
  '/:id/position',
  authorize(VaiTro.ADMIN),
  TableController.updateTablePosition
);

router.delete(
  '/:id',
  authorize(VaiTro.ADMIN),
  TableController.deleteTable
);

export default router;