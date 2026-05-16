import { Request, Response } from 'express';
import KhuyenMaiService from '../services/promotionService';

class KhuyenMaiController {
  // GET /api/khuyenmai
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { loai, trangthai } = req.query;
      const filters: any = {};
      if (loai) filters.loai = loai;
      if (trangthai) filters.trangthai = trangthai;

      const data = await KhuyenMaiService.getAll(filters);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /api/khuyenmai/hieuluc   
  static async getDangHoatDong(req: Request, res: Response): Promise<void> {
    try {
      const data = await KhuyenMaiService.getDangHoatDong();
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /api/khuyenmai/:id
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const data = await KhuyenMaiService.getById(Number(req.params.id));
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  // POST /api/khuyenmai
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const data = await KhuyenMaiService.create(req.body);
      res.status(201).json({ success: true, message: 'Tạo khuyến mãi thành công', data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // PUT /api/khuyenmai/:id
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const data = await KhuyenMaiService.update(Number(req.params.id), req.body);
      res.json({ success: true, message: 'Cập nhật thành công', data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // PATCH /api/khuyenmai/:id/updatetrangthai  
  static async updateTrangThai(req: Request, res: Response): Promise<void> {
    try {
      const data = await KhuyenMaiService.updateTrangThai(Number(req.params.id));
      res.json({ success: true, message: 'Cập nhật trạng thái thành công', data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // DELETE /api/khuyenmai/:id
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      await KhuyenMaiService.delete(Number(req.params.id));
      res.json({ success: true, message: 'Xóa khuyến mãi thành công' });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

export default KhuyenMaiController;