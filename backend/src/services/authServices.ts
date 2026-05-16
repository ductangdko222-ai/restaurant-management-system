import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { INguoiDungResponse, JWTPayload, VaiTro } from '../types';

class AuthService {
  // Đăng nhập
  static async login(tendangnhap: string, matkhau: string): Promise<{
    token: string;
    user: INguoiDungResponse;
  }> {
    try {
      // Tìm
      const user = await User.findByUsername(tendangnhap);

      if (!user) {
        throw new Error('Tên đăng nhập hoặc mật khẩu không đúng');
      }
      const isMatch = await bcrypt.compare(matkhau, user.matkhau);

      if (!isMatch) {
        throw new Error('Tên đăng nhập hoặc mật khẩu không đúng');
      }

      // Tạo JWT token
      const token = this.generateToken({
        id: user.id,
        tendangnhap: user.tendangnhap,
        hoten: user.hoten,
        vaitro: user.vaitro
      });

      const userResponse = await User.findByID(user.id);

      if (!userResponse) {
        throw new Error('Lỗi hệ thống');
      }

      return {
        token,
        user: userResponse
      };
    } catch (error) {
      throw error;
    }
  }
  // tạo token
  static generateToken(payload: JWTPayload): string {
    return jwt.sign(
      payload,
      process.env.JWT_SECRET || 'secret',
      { expiresIn: (process.env.JWT_EXPIRE || '7d') as jwt.SignOptions['expiresIn'] }
    );
  }

  // Verify token
  static verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, process.env.JWT_SECRET || 'secret') as JWTPayload;
    } catch (error) {
      throw new Error('Token không hợp lệ');
    }
  }

  // Lấy thông tin user từ token
  static async getUserFromToken(token: string): Promise<INguoiDungResponse> {
    try {
      const decoded = this.verifyToken(token);
      const user = await User.findByID(decoded.id);

      if (!user) {
        throw new Error('Người dùng không tồn tại');
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  // Đổi mật khẩu
  static async changePassword(
    userId: number,
    matkhauCu: string,
    matkhauMoi: string
  ): Promise<boolean> {
    try {
      if (matkhauMoi.length < 6) {
        throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự');
      }

      const user = await User.findByUsername(
        (await User.findByID(userId))?.tendangnhap || ''
      );
      if (!user) {
        throw new Error('Người dùng không tồn tại');
      }
      const isMatch = await bcrypt.compare(matkhauCu, user.matkhau);

      if (!isMatch) {
        throw new Error('Mật khẩu cũ không đúng');
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(matkhauMoi, salt);

      await User.updatePassword(userId, hashedPassword);

      return true;
    } catch (error) {
      throw error;
    }
  }

  // Tạo use
  static async register(userData: {
    tendangnhap: string;
    matkhau: string;
    hoten: string;
    vaitro: VaiTro;
  }): Promise<INguoiDungResponse> {
    try {
      const { tendangnhap, matkhau, hoten, vaitro } = userData;
      if (!tendangnhap || !matkhau || !hoten || !vaitro) {
        throw new Error('Vui lòng nhập đầy đủ thông tin');
      }

      if (matkhau.length < 6) {
        throw new Error('Mật khẩu phải có ít nhất 6 ký tự');
      }

      const exists = await User.exists(tendangnhap);
      if (exists) {
        throw new Error('Tên đăng nhập đã tồn tại');
      }

      // Hash mật khẩu
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(matkhau, salt);
      const newUser = await User.create({
        tendangnhap,
        matkhau: hashedPassword,
        hoten,
        vaitro
      });

      if (!newUser) {
        throw new Error('Không thể tạo user');
      }

      return newUser;
    } catch (error) {
      throw error;
    }
  }
  static async getAllUsers(filters?: { vaitro?: string; trangthai?: string }) {
    return await User.findAll(filters as any);
  }

  static async updateUser(id: number, userData: {
    hoten?: string;
    vaitro?: string;
    trangthai?: string;
  }) {
    const user = await User.findByID(id);
    if (!user) throw new Error('Không tìm thấy nhân viên');
    return await User.update(id, userData as any);
  }

  static async deleteUser(id: number) {
    const user = await User.findByID(id);
    if (!user) throw new Error('Không tìm thấy nhân viên');
    return await User.delete(id);
  }

}

export default AuthService;