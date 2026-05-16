import { Router } from 'express';
import KhuyenMaiController from '../controllers/promotionController';
import { auth, authorize } from '../middleware/auth';
import { VaiTro } from '../types';

const router = Router();

router.use(auth);

router.get('/', authorize(VaiTro.ADMIN, VaiTro.THU_NGAN), KhuyenMaiController.getAll);
router.get('/hieuluc', authorize(VaiTro.ADMIN, VaiTro.THU_NGAN), KhuyenMaiController.getDangHoatDong);
router.get('/:id', authorize(VaiTro.ADMIN, VaiTro.THU_NGAN), KhuyenMaiController.getById);

router.post('/', authorize(VaiTro.ADMIN), KhuyenMaiController.create);
router.put('/:id', authorize(VaiTro.ADMIN), KhuyenMaiController.update);
router.patch('/:id/updatetrangthai', authorize(VaiTro.ADMIN), KhuyenMaiController.updateTrangThai);
router.delete('/:id', authorize(VaiTro.ADMIN), KhuyenMaiController.delete);

export default router;