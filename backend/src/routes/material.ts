import { Router } from 'express';
import NguyenVatLieuController from '../controllers/materialController';
import { auth, authorize } from '../middleware/auth';
import { VaiTro } from '../types';

const router = Router();

router.use(auth);

router.get('/', authorize(VaiTro.ADMIN, VaiTro.BEP), NguyenVatLieuController.getAll);
router.get('/canhbao', authorize(VaiTro.ADMIN, VaiTro.BEP), NguyenVatLieuController.getCanhBao);
router.get('/:id', authorize(VaiTro.ADMIN, VaiTro.BEP), NguyenVatLieuController.getById);
router.get('/:id/lichsuxuat', authorize(VaiTro.ADMIN, VaiTro.BEP), NguyenVatLieuController.getLichSuXuat);
router.get('/:id/dungtrongmon', authorize(VaiTro.ADMIN, VaiTro.BEP), NguyenVatLieuController.getDungTrongMon);

router.post('/', authorize(VaiTro.ADMIN), NguyenVatLieuController.create);
router.put('/:id', authorize(VaiTro.ADMIN), NguyenVatLieuController.update);
router.delete('/:id', authorize(VaiTro.ADMIN), NguyenVatLieuController.delete);

router.post('/:id/nhapkho', authorize(VaiTro.ADMIN, VaiTro.BEP), NguyenVatLieuController.nhapKho);
router.post('/:id/xuatkho', authorize(VaiTro.ADMIN, VaiTro.BEP), NguyenVatLieuController.xuatKho);

export default router;