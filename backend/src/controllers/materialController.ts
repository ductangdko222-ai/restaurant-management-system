import { Request, Response } from 'express';
import NguyenVatLieuService from '../services/materialService';

class NguyenVatLieuController {
  // GET /api/nguyen-vat-lieu
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const caohangton = req.query.caohangton === 'true';
      const data = await NguyenVatLieuService.getAll(caohangton ? { caohangton: true } : undefined);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /api/nguyen-vat-lieu/canh-bao - NVL sắp hết hàng
  static async getCanhBao(req: Request, res: Response): Promise<void> {
    try {
      const data = await NguyenVatLieuService.getCanhBaoHetHang();
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /api/nguyen-vat-lieu/:id
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const data = await NguyenVatLieuService.getById(Number(req.params.id));
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  // GET /api/nguyen-vat-lieu/:id/lich-su-xuat
  static async getLichSuXuat(req: Request, res: Response): Promise<void> {
    try {
      const data = await NguyenVatLieuService.getLichSuXuat(Number(req.params.id));
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  // GET /api/nguyen-vat-lieu/:id/dung-trong-mon
  static async getDungTrongMon(req: Request, res: Response): Promise<void> {
    try {
      const data = await NguyenVatLieuService.getDungTrongMon(Number(req.params.id));
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  // POST /api/nguyen-vat-lieu
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const data = await NguyenVatLieuService.create(req.body);
      res.status(201).json({ success: true, message: 'Tạo nguyên vật liệu thành công', data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // PUT /api/nguyen-vat-lieu/:id
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const data = await NguyenVatLieuService.update(Number(req.params.id), req.body);
      res.json({ success: true, message: 'Cập nhật thành công', data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // POST /api/nguyen-vat-lieu/:id/nhap-kho
  static async nhapKho(req: Request, res: Response): Promise<void> {
    try {
      const { soluong } = req.body;
      if (!soluong) {
        res.status(400).json({ success: false, message: 'Vui lòng nhập số lượng' });
        return;
      }
      const data = await NguyenVatLieuService.nhapKho(Number(req.params.id), Number(soluong));
      res.json({ success: true, message: 'Nhập kho thành công', data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // POST /api/nguyen-vat-lieu/:id/xuat-kho
  static async xuatKho(req: Request, res: Response): Promise<void> {
    try {
      const { soluong } = req.body;
      if (!soluong) {
        res.status(400).json({ success: false, message: 'Vui lòng nhập số lượng' });
        return;
      }
      const data = await NguyenVatLieuService.xuatKho(Number(req.params.id), Number(soluong));
      res.json({ success: true, message: 'Xuất kho thành công', data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // DELETE /api/nguyen-vat-lieu/:id
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      await NguyenVatLieuService.delete(Number(req.params.id));
      res.json({ success: true, message: 'Xóa nguyên vật liệu thành công' });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

export default NguyenVatLieuController;