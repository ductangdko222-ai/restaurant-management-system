import NguyenVatLieu from '../models/Material';
import { INguyenVatLieu, ILichSuXuatNVL, IDungTrongMon } from '../types';

class NguyenVatLieuService {
  static async getAll(filters?: { caohangton?: boolean }): Promise<INguyenVatLieu[]> {
    return await NguyenVatLieu.findAll(filters);
  }

  static async getById(id: number): Promise<INguyenVatLieu> {
    const nvl = await NguyenVatLieu.findById(id);
    if (!nvl) throw new Error('Không tìm thấy nguyên vật liệu');
    return nvl;
  }

  static async create(data: Omit<INguyenVatLieu, 'id'>): Promise<INguyenVatLieu> {
    if (!data.manvl || !data.tennvl || !data.donvitinh)
      throw new Error('Vui lòng nhập đầy đủ thông tin bắt buộc');
    if ((data.tonkho ?? 0) < 0) throw new Error('Tồn kho không được âm');
    if ((data.tontoithieu ?? 0) < 0) throw new Error('Tồn tối thiểu không được âm');
    if (await NguyenVatLieu.existsByMa(data.manvl))
      throw new Error('Mã nguyên vật liệu đã tồn tại');
    const result = await NguyenVatLieu.create(data);
    if (!result) throw new Error('Không thể tạo nguyên vật liệu');
    return result;
  }

  static async update(id: number, data: Partial<Omit<INguyenVatLieu, 'id'>>): Promise<INguyenVatLieu> {
    if (!await NguyenVatLieu.findById(id)) throw new Error('Không tìm thấy nguyên vật liệu');
    if (data.tontoithieu !== undefined && data.tontoithieu < 0)
      throw new Error('Tồn tối thiểu không được âm');
    const result = await NguyenVatLieu.update(id, data);
    if (!result) throw new Error('Cập nhật thất bại');
    return result;
  }

  static async nhapKho(id: number, soluong: number): Promise<INguyenVatLieu> {
    if (!soluong || soluong <= 0) throw new Error('Số lượng nhập phải lớn hơn 0');
    if (!await NguyenVatLieu.findById(id)) throw new Error('Không tìm thấy nguyên vật liệu');
    const result = await NguyenVatLieu.nhapKho(id, soluong);
    if (!result) throw new Error('Nhập kho thất bại');
    return result;
  }

  static async xuatKho(id: number, soluong: number): Promise<INguyenVatLieu> {
    if (!soluong || soluong <= 0) throw new Error('Số lượng xuất phải lớn hơn 0');
    const result = await NguyenVatLieu.xuatKho(id, soluong);
    if (!result) throw new Error('Xuất kho thất bại');
    return result;
  }

  static async delete(id: number): Promise<void> {
    if (!await NguyenVatLieu.findById(id)) throw new Error('Không tìm thấy nguyên vật liệu');
    const monDung = await NguyenVatLieu.dungTrongMon(id);
    if (monDung.length > 0)
      throw new Error(`Không thể xóa. Nguyên vật liệu đang được dùng trong ${monDung.length} món ăn`);
    if (!await NguyenVatLieu.delete(id)) throw new Error('Xóa thất bại');
  }

  static async getLichSuXuat(id: number): Promise<ILichSuXuatNVL[]> {
    if (!await NguyenVatLieu.findById(id)) throw new Error('Không tìm thấy nguyên vật liệu');
    return await NguyenVatLieu.lichSuXuat(id);
  }

  static async getDungTrongMon(id: number): Promise<IDungTrongMon[]> {
    if (!await NguyenVatLieu.findById(id)) throw new Error('Không tìm thấy nguyên vật liệu');
    return await NguyenVatLieu.dungTrongMon(id);
  }

  static async getCanhBaoHetHang(): Promise<INguyenVatLieu[]> {
    return await NguyenVatLieu.findAll({ caohangton: true });
  }
}

export default NguyenVatLieuService;