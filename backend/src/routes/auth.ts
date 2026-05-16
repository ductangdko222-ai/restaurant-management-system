// routes/auth.ts
import { Router } from 'express';
import AuthController from '../controllers/authController';
import { auth, authorize } from '../middleware/auth';
import { VaiTro } from '../types';

const router = Router();

router.post('/login', AuthController.login);

// Private routes
router.get('/me', auth, AuthController.getMe);
router.post('/change-password', auth, AuthController.changePassword);

// Chỉ Admin
router.post('/register', auth, authorize(VaiTro.ADMIN), AuthController.register);

// Quản lý nhân viên - Chỉ Admin
router.get('/users', auth, authorize(VaiTro.ADMIN), AuthController.getAllUsers);
router.put('/users/:id', auth, authorize(VaiTro.ADMIN), AuthController.updateUser);
router.delete('/users/:id', auth, authorize(VaiTro.ADMIN), AuthController.deleteUser);

export default router;