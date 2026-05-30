// middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import AuthService from '../services/authServices';
import User from '../models/User';
import { VaiTro } from '../types';

// Middleware xác thực token
export const auth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Lấy token từ header
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Không tìm thấy token, truy cập bị từ chối'
      });
      return;
    }

    // Verify token
    const decoded = AuthService.verifyToken(token);
    
    // Lấy thông tin user
    const user = await User.findByID(decoded.id);
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Token không hợp lệ'
      });
      return;
    }

    // Gắn thông tin user vào request
    req.user = {
      id: user.id,
      tendangnhap: user.tendangnhap,
      hoten: user.hoten,
      vaitro: user.vaitro
    };
    
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token không hợp lệ'
    });
  }
};

// Middleware 
export const authorize = (...roles: VaiTro[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Chưa đăng nhập'
      });
      return;
    }

    if (!roles.includes(req.user.vaitro)) {
      res.status(403).json({
        success: false,
        message: `Vai trò '${req.user.vaitro}' không có quyền truy cập. Yêu cầu: ${roles.join(', ')}`
      });
      return;
    }
    
    next();
  };
};