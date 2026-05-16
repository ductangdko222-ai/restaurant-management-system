// routes/kitchen.ts
import { Router } from 'express';
import KitchenController from '../controllers/kitchenController';
import { auth, authorize } from '../middleware/auth';
import { VaiTro } from '../types';

const router = Router();

router.use(auth);

router.get(
  '/tickets',
  authorize(VaiTro.BEP, VaiTro.ADMIN),
  KitchenController.getAllTickets
);

router.get(
  '/stats',
  authorize(VaiTro.BEP, VaiTro.ADMIN),
  KitchenController.getKitchenStats
);

router.get(
  '/:khuvuc',
  authorize(VaiTro.BEP, VaiTro.ADMIN),
  KitchenController.getTicketsByArea
);

router.post(
  '/:id/start',
  authorize(VaiTro.BEP),
  KitchenController.startCooking
);

router.post(
  '/:id/finish',
  authorize(VaiTro.BEP),
  KitchenController.finishCooking
);

router.post(
  '/:id/served',
  authorize(VaiTro.PHUC_VU, VaiTro.ADMIN),
  KitchenController.markAsServed
);

export default router;