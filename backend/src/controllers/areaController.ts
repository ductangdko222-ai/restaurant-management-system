import { Request, Response } from 'express';
import AreaService from '../services/areaServices';

class AreaController {
  // GET /api/areas
  static async getAllAreas(req: Request, res: Response): Promise<void> {
    try {
      const areas = await AreaService.getAllAreas();

      res.json({
        success: true,
        data: areas
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy danh sách khu vực'
      });
    }
  }

  // GET /api/areas/:id
  static async getAreaById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const area = await AreaService.getAreaById(Number(id));

      res.json({
        success: true,
        data: area
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || 'Không tìm thấy khu vực'
      });
    }
  }

  // POST /api/areas
  static async createArea(req: Request, res: Response): Promise<void> {
    try {
      const areaData = req.body;
      const newArea = await AreaService.createArea(areaData);

      res.status(201).json({
        success: true,
        message: 'Tạo khu vực thành công',
        data: newArea
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Tạo khu vực thất bại'
      });
    }
  }

  //PUT /api/areas/:id
  static async updateArea(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const areaData = req.body;
      
      const updatedArea = await AreaService.updateArea(Number(id), areaData);

      res.json({
        success: true,
        message: 'Cập nhật khu vực thành công',
        data: updatedArea
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Cập nhật khu vực thất bại'
      });
    }
  }

  // DELETE /api/areas/:id

  static async deleteArea(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await AreaService.deleteArea(Number(id));

      res.json({
        success: true,
        message: 'Xóa khu vực thành công'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Xóa khu vực thất bại'
      });
    }
  }
}

export default AreaController;