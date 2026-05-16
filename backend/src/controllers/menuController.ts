// controllers/menuController.ts
import { Request, Response } from 'express';
import MenuService from '../services/menuService';
import { TrangThaiMon, KhuVucCheBien } from '../types';
import MenuItem from '../models/MenuItem';
import upload from '../config/multer';

class MenuController {
  //NHÓM MÓN

  //GET /api/menu/categories
  static async getAllCategories(req: Request, res: Response): Promise<void> {
    try {
      const categories = await MenuService.getAllCategories();

      res.json({
        success: true,
        data: categories
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy danh sách nhóm món'
      });
    }
  }

  //POST /api/menu/categories
  static async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const categoryData = req.body;
      const newCategory = await MenuService.createCategory(categoryData);

      res.status(201).json({
        success: true,
        message: 'Tạo nhóm món thành công',
        data: newCategory
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Tạo nhóm món thất bại'
      });
    }
  }

  //PUT /api/menu/categories/:id
  static async updateCategory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const categoryData = req.body;
      
      const updatedCategory = await MenuService.updateCategory(Number(id), categoryData);

      res.json({
        success: true,
        message: 'Cập nhật nhóm món thành công',
        data: updatedCategory
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Cập nhật nhóm món thất bại'
      });
    }
  }

  //DELETE /api/menu/categories/:id
  static async deleteCategory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await MenuService.deleteCategory(Number(id));

      res.json({
        success: true,
        message: 'Xóa nhóm món thành công'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Xóa nhóm món thất bại'
      });
    }
  }

  //MÓN ĂN

  // GET /api/menu/items
  static async getAllMenuItems(req: Request, res: Response): Promise<void> {
    try {
      const { nhommonid, trangthai, khuvucchebien } = req.query;

      const filters: any = {};
      
      if (nhommonid) filters.nhommonid = Number(nhommonid);
      if (trangthai) filters.trangthai = trangthai as TrangThaiMon;
      if (khuvucchebien) filters.khuvucchebien = khuvucchebien as KhuVucCheBien;

      const items = await MenuService.getAllMenuItems(filters);

      res.json({
        success: true,
        data: items
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy danh sách món ăn'
      });
    }
  }

  // GET /api/menu/items/:id
  static async getMenuItemById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const item = await MenuService.getMenuItemById(Number(id));

      res.json({
        success: true,
        data: item
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || 'Không tìm thấy món ăn'
      });
    }
  }

  // POST /api/menu/items
  static async createMenuItem(req: Request, res: Response): Promise<void> {
    try {
      const itemData = req.body;

      // Xử lý file upload
      if (req.file) {
        itemData.hinhanh = `/uploads/images/${req.file.filename}`;
      }

      const newItem = await MenuService.createMenuItem(itemData);

      res.status(201).json({
        success: true,
        message: 'Tạo món ăn thành công',
        data: newItem
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Tạo món ăn thất bại'
      });
    }
  }

  // PUT /api/menu/items/:id
  static async updateMenuItem(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const itemData = req.body;

      // Xử lý file upload
      if (req.file) {
        itemData.hinhanh = `/uploads/images/${req.file.filename}`;
      }
      
      const updatedItem = await MenuService.updateMenuItem(Number(id), itemData);

      res.json({
        success: true,
        message: 'Cập nhật món ăn thành công',
        data: updatedItem
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Cập nhật món ăn thất bại'
      });
    }
  }

  // DELETE /api/menu/items/:id
  static async deleteMenuItem(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await MenuService.deleteMenuItem(Number(id));

      res.json({
        success: true,
        message: 'Xóa món ăn thành công'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Xóa món ăn thất bại'
      });
    }
  }

  //  BIẾN THỂ

  //  GET /api/menu/items/:id/modifiers
  static async getModifiers(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const modifiers = await MenuService.getModifiers(Number(id));

      res.json({
        success: true,
        data: modifiers
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy biến thể'
      });
    }
  }

  //POST /api/menu/items/:id/modifiers
  static async addModifier(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const modifierData = { ...req.body, monanid: Number(id) };
      
      const newModifier = await MenuService.addModifier(modifierData);

      res.status(201).json({
        success: true,
        message: 'Thêm biến thể thành công',
        data: newModifier
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Thêm biến thể thất bại'
      });
    }
  }

  // DELETE /api/menu/modifiers/:id
  static async deleteModifier(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await MenuService.deleteModifier(Number(id));

      res.json({
        success: true,
        message: 'Xóa biến thể thành công'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Xóa biến thể thất bại'
      });
    }
  }

  // GET /api/menu/by-category

  static async getMenuByCategory(req: Request, res: Response): Promise<void> {
    try {
      const menu = await MenuService.getMenuByCategory();

      res.json({
        success: true,
        data: menu
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy menu'
      });
    }
  }
  // GET /api/menu/items/:id/dinhmuc
  static async getDinhMuc(req: Request, res: Response): Promise<void> {
    try {
      const data = await MenuItem.getDinhMuc(Number(req.params.id));
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
 
  // POST /api/menu/items/:id/dinhmuc
 static async upsertDinhMuc(req: Request, res: Response): Promise<void> {
  try {
    const { nguyenvatlieuid, soluong, donvinhap } = req.body;
    if (!nguyenvatlieuid || !soluong || soluong <= 0) {
      res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
      return;
    }
    const data = await MenuItem.upsertDinhMuc(Number(req.params.id), nguyenvatlieuid, soluong, donvinhap || '');
    res.json({ success: true, message: 'Đã cập nhật định mức', data });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
}
 
  // DELETE /api/menu/items/:id/dinhmuc/:nguyenvatlieuid
  static async deleteDinhMuc(req: Request, res: Response): Promise<void> {
    try {
      await MenuItem.deleteDinhMuc(Number(req.params.id), Number(req.params.nguyenvatlieuid));
      res.json({ success: true, message: 'Đã xóa định mức' });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
 
}

export default MenuController;