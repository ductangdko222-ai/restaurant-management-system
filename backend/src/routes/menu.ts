import { Router } from 'express';
import MenuController from '../controllers/menuController';
import { auth, authorize } from '../middleware/auth';
import { VaiTro } from '../types';
import upload from '../config/multer';

const router = Router();

router.use(auth);

//Nhóm mónm
router.get('/categories', MenuController.getAllCategories);
router.post('/categories', authorize(VaiTro.ADMIN), MenuController.createCategory);
router.put('/categories/:id', authorize(VaiTro.ADMIN), MenuController.updateCategory);
router.delete('/categories/:id', authorize(VaiTro.ADMIN), MenuController.deleteCategory);

//Món ăn
router.get('/items', MenuController.getAllMenuItems);
router.get('/items/:id', MenuController.getMenuItemById);
router.post('/items', authorize(VaiTro.ADMIN), upload.single('hinhanh'), MenuController.createMenuItem);
router.put('/items/:id', authorize(VaiTro.ADMIN), upload.single('hinhanh'), MenuController.updateMenuItem);
router.delete('/items/:id', authorize(VaiTro.ADMIN), MenuController.deleteMenuItem);

//Biến thể
router.get('/items/:id/modifiers', MenuController.getModifiers);
router.post('/items/:id/modifiers', authorize(VaiTro.ADMIN), MenuController.addModifier);
router.delete('/modifiers/:id', authorize(VaiTro.ADMIN), MenuController.deleteModifier);

//MENU CHO POS
router.get('/by-category', MenuController.getMenuByCategory);
router.get('/items/:id/dinhmuc', auth, MenuController.getDinhMuc);
router.post('/items/:id/dinhmuc', auth, authorize(VaiTro.ADMIN, VaiTro.BEP), MenuController.upsertDinhMuc);
router.delete('/items/:id/dinhmuc/:nguyenvatlieuid', auth, authorize(VaiTro.ADMIN, VaiTro.BEP), MenuController.deleteDinhMuc);
 
export default router;