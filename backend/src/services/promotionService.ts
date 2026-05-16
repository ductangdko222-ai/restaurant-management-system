import KhuyenMai from '../models/Promotion';
import { IKhuyenMai, LoaiKhuyenMai, TrangThaiKhuyenMai } from '../types';

class KhuyenMaiService {
  static async getAll(filters?: {
    loai?: LoaiKhuyenMai;
    trangthai?: TrangThaiKhuyenMai;
  }): Promise<IKhuyenMai[]> {
    return await KhuyenMai.findAll(filters);
  }

  static async getById(id: number): Promise<IKhuyenMai> {
    const km = await KhuyenMai.findById(id);
    if (!km) throw new Error('Không tìm thấy khuyến mãi');
    return km;
  }

  static async create(data: Omit<IKhuyenMai, 'id'>): Promise<IKhuyenMai> {
    if (!data.makm || !data.tenkm || !data.loai || data.giatri === undefined)
      throw new Error('Vui lòng nhập đầy đủ thông tin bắt buộc');
    if (data.giatri <= 0)
      throw new Error('Giá trị khuyến mãi phải lớn hơn 0');
    if (data.loai === LoaiKhuyenMai.GIAM_PHAN_TRAM && data.giatri > 50)
      throw new Error('Giảm phần trăm không được vượt quá 50%');
    if (await KhuyenMai.existsByMa(data.makm))
      throw new Error('Mã khuyến mãi đã tồn tại');
    if (data.ngaybatdau && data.ngayketthuc && new Date(data.ngaybatdau) > new Date(data.ngayketthuc))
      throw new Error('Ngày bắt đầu không được sau ngày kết thúc');
    const result = await KhuyenMai.create(data);
    if (!result) throw new Error('Không thể tạo khuyến mãi');
    return result;
  }

  static async update(id: number, data: Partial<Omit<IKhuyenMai, 'id'>>): Promise<IKhuyenMai> {
    const km = await KhuyenMai.findById(id);
    if (!km) throw new Error('Không tìm thấy khuyến mãi');
    if (data.giatri !== undefined && data.giatri <= 0)
      throw new Error('Giá trị khuyến mãi phải lớn hơn 0');
    const loaiCheck = data.loai || km.loai;
    const giatriCheck = data.giatri !== undefined ? data.giatri : km.giatri;
    if (loaiCheck === LoaiKhuyenMai.GIAM_PHAN_TRAM && giatriCheck > 50)
      throw new Error('Giảm phần trăm không được vượt quá 50%');
    const ngayBD = data.ngaybatdau !== undefined ? data.ngaybatdau : km.ngaybatdau;
    const ngayKT = data.ngayketthuc !== undefined ? data.ngayketthuc : km.ngayketthuc;
    if (ngayBD && ngayKT && new Date(ngayBD) > new Date(ngayKT))
      throw new Error('Ngày bắt đầu không được sau ngày kết thúc');
    const result = await KhuyenMai.update(id, data);
    if (!result) throw new Error('Cập nhật thất bại');
    return result;
  }

  static async delete(id: number): Promise<void> {
    if (!await KhuyenMai.findById(id)) throw new Error('Không tìm thấy khuyến mãi');
    await KhuyenMai.delete(id);
  }

  static async updateTrangThai(id: number): Promise<IKhuyenMai> {
    const km = await KhuyenMai.findById(id);
    if (!km) throw new Error('Không tìm thấy khuyến mãi');
    const trangThaiMoi = km.trangthai === TrangThaiKhuyenMai.HOAT_DONG
      ? TrangThaiKhuyenMai.NGUNG
      : TrangThaiKhuyenMai.HOAT_DONG;
    const result = await KhuyenMai.update(id, { trangthai: trangThaiMoi });
    if (!result) throw new Error('Cập nhật trạng thái thất bại');
    return result;
  }

  static async getDangHoatDong(): Promise<IKhuyenMai[]> {
    return await KhuyenMai.findDangHoatDong();
  }

  static tinhTienGiam(km: IKhuyenMai, tongTien: number): number {
    if (km.loai === LoaiKhuyenMai.GIAM_PHAN_TRAM)
      return Math.round((tongTien * km.giatri) / 100);
    if (km.loai === LoaiKhuyenMai.GIAM_TIEN)
      return Math.min(km.giatri, tongTien);
    return km.giatri;
  }
}

export default KhuyenMaiService;