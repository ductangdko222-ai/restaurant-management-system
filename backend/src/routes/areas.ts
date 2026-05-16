import { Router } from 'express';
import AreaController from '../controllers/areaController';
import { auth, authorize } from '../middleware/auth';
import { VaiTro } from '../types';

const router = Router();

router.use(auth);

router.get('/', AreaController.getAllAreas);
router.get('/:id', AreaController.getAreaById);

router.post('/', authorize(VaiTro.ADMIN), AreaController.createArea);
router.put('/:id', authorize(VaiTro.ADMIN), AreaController.updateArea);
router.delete('/:id', authorize(VaiTro.ADMIN), AreaController.deleteArea);

export default router;