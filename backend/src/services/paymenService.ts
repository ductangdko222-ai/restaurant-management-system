// services/paymentService.ts
import Invoice from '../models/Invoice';
import Order from '../models/Order';
import Shift from '../models/Shift';
import Table from '../models/Table';
import { PhuongThucThanhToan, TrangThaiDonHang, TrangThaiBan } from '../types';
import { emitOrderUpdated, emitTableUpdated } from '../config/socket';

class PaymentService {
  // Thanh toán đơn hàng
  static async processPayment(paymentData: {
    donhangid: number;
    nguoithunganid: number | null;
    phuongthucthanhtoan: PhuongThucThanhToan;
    tienkhacdua?: number;
    tienthua?: number;
    khuyenmaiid?: number | null;
    tiengiam?: number;
    tongthanhtoan?: number;
    ghichu?: string;
  }): Promise<any> {
    try {
      const {
        donhangid, nguoithunganid, phuongthucthanhtoan,
        tienkhacdua = 0, khuyenmaiid = null,
        tiengiam = 0, tongthanhtoan, ghichu
      } = paymentData;

      // Kiểm tra order tồn tại
      const order = await Order.findById(donhangid);
      if (!order) throw new Error('Không tìm thấy đơn hàng');

      // Kiểm tra order đã thanh toán chưa
      if (order.trangthai === 'dathanhtoan') {
        throw new Error('Đơn hàng đã được thanh toán');
      }

      // Kiểm tra tất cả món đã phục vụ chưa
      
      if (phuongthucthanhtoan !== PhuongThucThanhToan.PAYPAL) {
        const pendingItems = order.chitiet.filter((item: any) =>
          item.trangthai !== 'daphucvu'
        );
        if (pendingItems.length > 0) {
          throw new Error('Còn món chưa phục vụ, vui lòng kiểm tra lại');
        }
      }

      // Tính toán tổng tiền cuối cùng
      // Nếu frontend truyền tongthanhtoan thì dùng, không thì tự tính
      const tongTienGoc = order.tongtien;
      const tienGiamThucTe = tiengiam > 0 ? tiengiam : (order.tiengiam || 0);
      const thue = order.thue || 0;
      const tongThanhToan = tongthanhtoan ?? (tongTienGoc - tienGiamThucTe + thue);

      let tienthua = 0;
      if (phuongthucthanhtoan === PhuongThucThanhToan.TIEN_MAT) {
        if (tienkhacdua < tongThanhToan) {
          throw new Error('Tiền khách đưa không đủ');
        }
        tienthua = tienkhacdua - tongThanhToan;
      }

      // Cập nhật tiengiam vào đơn hàng nếu có khuyến mãi
      if (tienGiamThucTe > 0 || khuyenmaiid) {
        await Order.update(donhangid, {
          tiengiam: tienGiamThucTe,
          tongthanhtoan: tongThanhToan,
        });
      }

      // Tạo mã hóa đơn
      const mahoadon = await Invoice.generateInvoiceCode();

      // Tạo hóa đơn
      const invoice = await Invoice.create({
        mahoadon,
        donhangid,
        nguoithunganid,
        phuongthucthanhtoan,
        tongtien: tongThanhToan,
        tienkhacdua,
        tienthua,
        ghichu,
      });

      // Cập nhật trạng thái order
      await Order.update(donhangid, {
        trangthai: TrangThaiDonHang.DA_THANH_TOAN
      });

      // Cập nhật trạng thái bàn nếu là order tại bàn và không còn đơn đang mở khác trên bàn
      if (order.banid) {
        const remainingOrder = await Order.findActiveByTableId(order.banid);
        if (!remainingOrder) {
          await Table.updateStatus(order.banid, TrangThaiBan.TRONG);
          const updatedTable = await Table.findById(order.banid);
          if (updatedTable) emitTableUpdated(updatedTable);
        }
      }

      // Emit realtime
      const updatedOrder = await Order.findById(donhangid);
      emitOrderUpdated(updatedOrder);

      return invoice;
    } catch (error) {
      throw error;
    }
  }

  // Lấy hóa đơn theo ID
  static async getInvoiceById(id: number): Promise<any> {
    try {
      const invoice = await Invoice.findById(id);
      if (!invoice) throw new Error('Không tìm thấy hóa đơn');
      return invoice;
    } catch (error) {
      throw error;
    }
  }

  // Lấy hóa đơn theo mã
  static async getInvoiceByCode(mahoadon: string): Promise<any> {
    try {
      const invoice = await Invoice.findByCode(mahoadon);
      if (!invoice) throw new Error('Không tìm thấy hóa đơn');
      return invoice;
    } catch (error) {
      throw error;
    }
  }

  // Lấy danh sách hóa đơn
  static async getAllInvoices(filters?: any): Promise<any[]> {
    try {
      return await Invoice.findAll(filters);
    } catch (error) {
      throw error;
    }
  }

  // Mở ca làm việc
  static async openShift(nguoidungid: number, tiendauca: number): Promise<any> {
    try {
      const activeShift = await Shift.findActiveByUser(nguoidungid);
      if (activeShift) throw new Error('Bạn đang có ca làm việc chưa đóng');
      return await Shift.create({ nguoidungid, tiendauca });
    } catch (error) {
      throw error;
    }
  }

  // Đóng ca làm việc
  static async closeShift(calamviecid: number, tiencuoica: number): Promise<any> {
    try {
      const shift = await Shift.findById(calamviecid);
      if (!shift) throw new Error('Không tìm thấy ca làm việc');
      if (shift.trangthai === 'dadong') throw new Error('Ca làm việc đã được đóng');

      const revenue = await Shift.calculateRevenue(calamviecid);
      const closedShift = await Shift.close(calamviecid, tiencuoica);

      return {
        ...closedShift,
        doanhthu: revenue,
        chenlech: tiencuoica - shift.tiendauca - revenue.tienmat
      };
    } catch (error) {
      throw error;
    }
  }

  // Lấy ca đang mở
  static async getActiveShift(nguoidungid: number): Promise<any> {
    try {
      return await Shift.findActiveByUser(nguoidungid);
    } catch (error) {
      throw error;
    }
  }

  // Lấy danh sách ca
  static async getAllShifts(filters?: any): Promise<any[]> {
    try {
      return await Shift.findAll(filters);
    } catch (error) {
      throw error;
    }
  }

  // Thống kê doanh thu
  static async getRevenueStats(filters?: { tungay?: string; denngay?: string }): Promise<any> {
    try {
      return await Invoice.getRevenueStats(filters);
    } catch (error) {
      throw error;
    }
  }

  static async getDoanhThuTheoCA(calamviecid: number): Promise<any> {
    if (!calamviecid || isNaN(calamviecid)) {
      throw { status: 400, message: 'calamviecid không hợp lệ' };
    }
    const data = await Invoice.doanhThuTheoCA(calamviecid);
    return data;
  }

  static async getTopMon(filters?: {
    tungay?: string;
    denngay?: string;
    limit?: number;
  }): Promise<any[]> {
    if (filters?.limit !== undefined) {
      const limit = Number(filters.limit);
      if (isNaN(limit) || limit < 1 || limit > 100) {
        throw { status: 400, message: 'limit phải là số từ 1 đến 100' };
      }
      filters.limit = limit;
    }

    if (filters?.tungay && filters?.denngay) {
      if (new Date(filters.tungay) > new Date(filters.denngay)) {
        throw { status: 400, message: 'tungay không được lớn hơn denngay' };
      }
    }

    return await Invoice.topMon(filters);
  }
  static async getDoanhThuTheoNgay(filters?: {
    tungay?: string;
    denngay?: string;
  }): Promise<any> {
    if (filters?.tungay && filters?.denngay) {
      if (new Date(filters.tungay) > new Date(filters.denngay)) {
        throw { status: 400, message: 'tungay không được lớn hơn denngay' };
      }
    }
    return await Invoice.doanhThuTheoNgay(filters);
  }

  static async getDoanhThuTungNgay(filters?: {
    tungay?: string;
    denngay?: string;
  }): Promise<any[]> {
    if (filters?.tungay && filters?.denngay) {
      if (new Date(filters.tungay) > new Date(filters.denngay)) {
        throw { status: 400, message: 'tungay không được lớn hơn denngay' };
      }
    }
    return await Invoice.doanhThuTungNgay(filters);
  }

  static async getTongQuanHomNay(): Promise<any> {
    return await Invoice.tongQuanHomNay();
  }

  static async getCanhBao(): Promise<any> {
    return await Invoice.canhBao();
  }

  static async getSoSanh2Ky(
    ky1: { tungay: string; denngay: string },
    ky2: { tungay: string; denngay: string }
  ): Promise<any> {
    // Validate từng kỳ
    for (const [label, ky] of [['ky1', ky1], ['ky2', ky2]] as const) {
      if (!ky.tungay || !ky.denngay) {
        throw { status: 400, message: `${label}: tungay và denngay là bắt buộc` };
      }
      if (new Date(ky.tungay) > new Date(ky.denngay)) {
        throw { status: 400, message: `${label}: tungay không được lớn hơn denngay` };
      }
    }
    return await Invoice.soSanh2Ky(ky1, ky2);
  }
}

export default PaymentService;