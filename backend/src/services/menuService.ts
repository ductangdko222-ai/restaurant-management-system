import Category from '../models/Category';
import MenuItem from '../models/MenuItem';
import { INhomMon, IMonAn, IBienThe, TrangThaiMon, KhuVucCheBien } from '../types';

class MenuService {
  // NHÓM MÓN
  
  static async getAllCategories(): Promise<INhomMon[]> {
    try {
      return await Category.findAll();
    } catch (error) {
      throw error;
    }
  }

  static async createCategory(categoryData: {
    tennhom: string;
    mota?: string;
    thutu?: number;
  }): Promise<INhomMon> {
    try {
      if (!categoryData.tennhom) {
        throw new Error('Vui lòng nhập tên nhóm món');
      }

      const exists = await Category.exists(categoryData.tennhom);
      if (exists) {
        throw new Error('Tên nhóm món đã tồn tại');
      }

      const newCategory = await Category.create(categoryData);
      if (!newCategory) {
        throw new Error('Không thể tạo nhóm món');
      }

      return newCategory;
    } catch (error) {
      throw error;
    }
  }

  static async updateCategory(id: number, categoryData: Partial<INhomMon>): Promise<INhomMon> {
    try {
      const category = await Category.findById(id);
      if (!category) {
        throw new Error('Không tìm thấy nhóm món');
      }

      if (categoryData.tennhom) {
        const exists = await Category.exists(categoryData.tennhom, id);
        if (exists) {
          throw new Error('Tên nhóm món đã tồn tại');
        }
      }

      const updated = await Category.update(id, categoryData);
      if (!updated) {
        throw new Error('Không thể cập nhật nhóm món');
      }

      return updated;
    } catch (error) {
      throw error;
    }
  }

  static async deleteCategory(id: number): Promise<boolean> {
    try {
      const category = await Category.findById(id);
      if (!category) {
        throw new Error('Không tìm thấy nhóm món');
      }

      return await Category.delete(id);
    } catch (error) {
      throw error;
    }
  }

  //MÓN ĂN

  static async getAllMenuItems(filters?: {
    nhommonid?: number;
    trangthai?: TrangThaiMon;
    khuvucchebien?: KhuVucCheBien;
  }): Promise<IMonAn[]> {
    try {
      return await MenuItem.findAll(filters);
    } catch (error) {
      throw error;
    }
  }

  static async getMenuItemById(id: number): Promise<IMonAn> {
    try {
      const item = await MenuItem.findById(id);
      if (!item) {
        throw new Error('Không tìm thấy món ăn');
      }
      return item;
    } catch (error) {
      throw error;
    }
  }

  static async createMenuItem(itemData: {
    mamon: string;
    tenmon: string;
    nhommonid?: number;
    giaban: number;
    tinhthue?: boolean;
    hinhanh?: string;
    mota?: string;
    khuvucchebien?: KhuVucCheBien;
  }): Promise<IMonAn> {
    try {
      if (!itemData.mamon || !itemData.tenmon) {
        throw new Error('Vui lòng nhập đầy đủ thông tin');
      }

      if (itemData.giaban <= 0) {
        throw new Error('Giá bán phải lớn hơn 0');
      }

      const exists = await MenuItem.exists(itemData.mamon);
      if (exists) {
        throw new Error('Mã món đã tồn tại');
      }

      const newItem = await MenuItem.create(itemData);
      if (!newItem) {
        throw new Error('Không thể tạo món ăn');
      }

      return newItem;
    } catch (error) {
      throw error;
    }
  }

  // Cập nhật món ăn
  static async updateMenuItem(id: number, itemData: Partial<IMonAn>): Promise<IMonAn> {
    try {
      const item = await MenuItem.findById(id);
      if (!item) {
        throw new Error('Không tìm thấy món ăn');
      }

      if (itemData.giaban && itemData.giaban <= 0) {
        throw new Error('Giá bán phải lớn hơn 0');
      }

      const updated = await MenuItem.update(id, itemData);
      if (!updated) {
        throw new Error('Không thể cập nhật món ăn');
      }

      return updated;
    } catch (error) {
      throw error;
    }
  }

  // Xóa món ăn
  static async deleteMenuItem(id: number): Promise<boolean> {
    try {
      const item = await MenuItem.findById(id);
      if (!item) {
        throw new Error('Không tìm thấy món ăn');
      }

      return await MenuItem.delete(id);
    } catch (error) {
      throw error;
    }
  }

  //BIẾN THỂ

  static async getModifiers(monanid: number): Promise<IBienThe[]> {
    try {
      return await MenuItem.getModifiers(monanid);
    } catch (error) {
      throw error;
    }
  }

  static async addModifier(modifierData: {
    monanid: number;
    loai: string;
    tenbienthe: string;
    giathem: number;
  }): Promise<IBienThe> {
    try {
      if (!modifierData.tenbienthe) {
        throw new Error('Vui lòng nhập tên biến thể');
      }
      const item = await MenuItem.findById(modifierData.monanid);
      if (!item) {
        throw new Error('Không tìm thấy món ăn');
      }

      const newModifier = await MenuItem.addModifier(modifierData);
      if (!newModifier) {
        throw new Error('Không thể thêm biến thể');
      }

      return newModifier;
    } catch (error) {
      throw error;
    }
  }

  static async deleteModifier(id: number): Promise<boolean> {
    try {
      return await MenuItem.deleteModifier(id);
    } catch (error) {
      throw error;
    }
  }

  // Lấy menu theo nhóm
  static async getMenuByCategory(): Promise<any[]> {
    try {
      return await MenuItem.getByCategory();
    } catch (error) {
      throw error;
    }
  }
}

export default MenuService;