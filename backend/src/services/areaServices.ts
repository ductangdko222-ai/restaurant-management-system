import Area from '../models/Area';
import { IKhuVuc } from '../types';

class AreaService {
  static async getAllAreas(): Promise<IKhuVuc[]> {
    try {
      return await Area.findAll();
    } catch (error) {
      throw error;
    }
  }

  static async getAreaById(id: number): Promise<IKhuVuc> {
    try {
      const area = await Area.findById(id);
      
      if (!area) {
        throw new Error('Không tìm thấy khu vực');
      }

      return area;
    } catch (error) {
      throw error;
    }
  }

  static async createArea(areaData: {
    tenkhuvuc: string;
    mota?: string;
    thutu?: number;
  }): Promise<IKhuVuc> {
    try {
      if (!areaData.tenkhuvuc) {
        throw new Error('Vui lòng nhập tên khu vực');
      }

      const exists = await Area.exists(areaData.tenkhuvuc);
      if (exists) {
        throw new Error('Tên khu vực đã tồn tại');
      }

      const newArea = await Area.create(areaData);
      if (!newArea) {
        throw new Error('Không thể tạo khu vực');
      }

      return newArea;
    } catch (error) {
      throw error;
    }
  }

  static async updateArea(id: number, areaData: {
    tenkhuvuc?: string;
    mota?: string;
    thutu?: number;
  }): Promise<IKhuVuc> {
    try {
      // Kiểm tra khu vực tồn tại
      await this.getAreaById(id);
      if (areaData.tenkhuvuc) {
        const exists = await Area.exists(areaData.tenkhuvuc, id);
        
        if (exists) {
          throw new Error('Tên khu vực đã tồn tại');
        }
      }
      const updatedArea = await Area.update(id, areaData);
      if (!updatedArea) {
        throw new Error('Không thể cập nhật khu vực');
      }

      return updatedArea;
    } catch (error) {
      throw error;
    }
  }

  static async deleteArea(id: number): Promise<boolean> {
    try {
      await this.getAreaById(id);
      return await Area.delete(id);
    } catch (error) {
      throw error;
    }
  }
}

export default AreaService;