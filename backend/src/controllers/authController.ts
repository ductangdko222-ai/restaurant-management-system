import { Request, Response } from 'express';
import AuthService from '../services/authServices';
import { LoginRequest } from '../types';

class AuthController {

  static async login(req: Request<{}, {}, LoginRequest>, res: Response): Promise<void> {
    try {
      const { tendangnhap, matkhau } = req.body;

      if (!tendangnhap || !matkhau) {
        res.status(400).json({
          success: false,
          message: 'Vui lòng nhập đầy đủ thông tin'
        });
        return;
      }
      const result = await AuthService.login(tendangnhap, matkhau);

      res.json({
        success: true,
        message: 'Đăng nhập thành công',
        token: result.token,
        user: result.user
      });
    } catch (error: any) {
      res.status(401).json({
        success: false,
        message: error.message || 'Đăng nhập thất bại'
      });
    }
  }

  // Lấy thông tin user hiện tại
  static async getMe(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Không tìm thấy thông tin user'
        });
        return;
      }

      res.json({
        success: true,
        user: req.user
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi server'
      });
    }
  }


  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Chưa đăng nhập'
        });
        return;
      }

      const { matkhaucu, matkhaumoi } = req.body;

      if (!matkhaucu || !matkhaumoi) {
        res.status(400).json({
          success: false,
          message: 'Vui lòng nhập đầy đủ thông tin'
        });
        return;
      }

      await AuthService.changePassword(req.user.id, matkhaucu, matkhaumoi);

      res.json({
        success: true,
        message: 'Đổi mật khẩu thành công'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Đổi mật khẩu thất bại'
      });
    }
  }


  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { tendangnhap, matkhau, hoten, vaitro } = req.body;

      if (!tendangnhap || !matkhau || !hoten || !vaitro) {
        res.status(400).json({
          success: false,
          message: 'Vui lòng nhập đầy đủ thông tin'
        });
        return;
      }

      const newUser = await AuthService.register({
        tendangnhap,
        matkhau,
        hoten,
        vaitro
      });

      res.status(201).json({
        success: true,
        message: 'Tạo tài khoản thành công',
        data: newUser
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Tạo tài khoản thất bại'
      });
    }
  }

  static async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const { vaitro, trangthai } = req.query;
      const filters: any = {};
      if (vaitro) filters.vaitro = vaitro;
      if (trangthai) filters.trangthai = trangthai;

      const users = await AuthService.getAllUsers(filters);
      res.json({ success: true, data: users });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = await AuthService.updateUser(Number(id), req.body);
      res.json({ success: true, message: 'Cập nhật thành công', data: user });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (Number(id) === req.user!.id) {
        res.status(400).json({ success: false, message: 'Không thể xóa tài khoản đang đăng nhập' });
        return;
      }
      await AuthService.deleteUser(Number(id));
      res.json({ success: true, message: 'Đã vô hiệu hóa tài khoản' });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

export default AuthController;