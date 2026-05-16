import Order from '../models/Order';
import Table from '../models/Table';
import KitchenTicket from '../models/KitchenTicket';
import { TrangThaiBan, TrangThaiDonHang, TrangThaiChiTiet } from '../types';
import { emitNewTicket, emitOrderUpdated, emitTableUpdated } from '../config/socket';
import db from '../config/db'; // ✅ import đúng cách

class OrderService {
  static async getAllOrders(filters?: any): Promise<any[]> {
    try {
      return await Order.findAll(filters);
    } catch (error) {
      throw error;
    }
  }

  static async getOrderById(id: number): Promise<any> {
    try {
      const order = await Order.findById(id);
      if (!order) {
        throw new Error('Không tìm thấy đơn hàng');
      }
      return order;
    } catch (error) {
      throw error;
    }
  }

  static async getActiveOrderByTable(banid: number): Promise<any> {
    try {
      return await Order.findActiveByTableId(banid);
    } catch (error) {
      throw error;
    }
  }

  static async createOrder(orderData: {
    loai: 'taiban' | 'mangdi';
    banid?: number;
    nguoiphucvuid?: number | null;
    khachhangid?: number | null;
    tenkhachhang?: string;
    sodienthoai?: string;
    diachi?: string;
    calamviecid?: number;
    ghichu?: string;
  }): Promise<any> {
    try {
      if (orderData.loai === 'taiban' && !orderData.banid) {
        throw new Error('Vui lòng chọn bàn');
      }
      if (orderData.banid) {
        const existingOrder = await Order.findActiveByTableId(orderData.banid);
        if (existingOrder) {
          throw new Error('Bàn đã có đơn hàng đang mở');
        }
      }
      const madon = await Order.generateOrderCode();

      const newOrder = await Order.create({
        ...orderData,
        madon
      });

      if (orderData.banid) {
        await Table.updateStatus(orderData.banid, TrangThaiBan.CO_KHACH);
      }

      return newOrder;
    } catch (error) {
      throw error;
    }
  }

  // Thêm món vào order
  static async addItemToOrder(orderData: {
    donhangid: number;
    monanid: number;
    soluong: number;
    dongia: number;
    ghichu?: string;
    bienthe?: number[];
  }): Promise<any> {
    try {
      const order = await Order.findById(orderData.donhangid);
      if (!order) {
        throw new Error('Không tìm thấy đơn hàng');
      }
      if (order.trangthai === 'dathanhtoan' || order.trangthai === 'dahuy') {
        throw new Error('Đơn hàng đã đóng, không thể thêm món');
      }
      const newItem = await Order.addItem(orderData);

      const totals = await Order.calculateTotal(orderData.donhangid);
      await Order.update(orderData.donhangid, totals);

      return newItem;
    } catch (error) {
      throw error;
    }
  }

  static async updateOrderItem(id: number, itemData: {
    soluong?: number;
    ghichu?: string;
  }): Promise<boolean> {
    try {
      const result = await Order.updateItem(id, itemData);

      if (itemData.soluong) {
        const [rows]: any = await db.query(
          'SELECT donhangid FROM chitietdonhang WHERE id = ?',
          [id]
        );

        if (rows.length > 0) {
          const totals = await Order.calculateTotal(rows[0].donhangid);
          await Order.update(rows[0].donhangid, totals);
        }
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  static async deleteOrderItem(id: number): Promise<boolean> {
    try {
      // ✅ Dùng db.query thay vì require(...).query
      const [rows]: any = await db.query(
        'SELECT donhangid FROM chitietdonhang WHERE id = ?',
        [id]
      );

      if (rows.length === 0) {
        throw new Error('Không tìm thấy món');
      }

      const donhangid = rows[0].donhangid;
      await Order.deleteItem(id);

      const totals = await Order.calculateTotal(donhangid);
      await Order.update(donhangid, totals);

      return true;
    } catch (error) {
      throw error;
    }
  }

  // Gửi món xuống bếp
  static async sendToKitchen(donhangid: number, chitietIds?: number[]): Promise<any[]> {
    try {
      const order = await Order.findById(donhangid);
      if (!order) {
        throw new Error('Không tìm thấy đơn hàng');
      }
      let items = order.chitiet;

      if (chitietIds && chitietIds.length > 0) {
        items = items.filter((item: any) => chitietIds.includes(item.id));
      } else {
        items = items.filter((item: any) => item.trangthai === 'moi');
      }

      if (items.length === 0) {
        throw new Error('Không có món nào để gửi bếp');
      }

      const tickets: any[] = [];

      for (let item of items) {
        const maphieu = await KitchenTicket.generateTicketCode(item.khuvucchebien);

        const ticket = await KitchenTicket.create({
          maphieu,
          chitietdonhangid: item.id,
          khuvucchebien: item.khuvucchebien
        });

        const fullTicket = await KitchenTicket.findById(ticket.id);
        tickets.push(fullTicket);

        await Order.updateItem(item.id, { trangthai: TrangThaiChiTiet.DANG_LAM });

        emitNewTicket(fullTicket);
      }

      // REALTIME cập nhật order
      const updatedOrder = await Order.findById(donhangid);
      emitOrderUpdated(updatedOrder);

      return tickets;
    } catch (error) {
      throw error;
    }
  }

  // Cập nhật trạng thái order
  static async updateOrderStatus(id: number, trangthai: TrangThaiDonHang): Promise<any> {
    try {
      const order = await Order.findById(id);
      if (!order) {
        throw new Error('Không tìm thấy đơn hàng');
      }
      const updatedOrder = await Order.update(id, { trangthai });

      if (trangthai === 'dathanhtoan' || trangthai === 'dahuy') {
        if (order.banid) {
          await Table.updateStatus(order.banid, TrangThaiBan.TRONG);

          // REALTIME Cập nhật trạng thái bàn
          const updatedTable = await Table.findById(order.banid);
          if (updatedTable) {
            emitTableUpdated(updatedTable);
          }
        }
      }

      // REALTIME cập nhật order
      emitOrderUpdated(updatedOrder);

      return updatedOrder;
    } catch (error) {
      throw error;
    }
  }

  // Hủy order
  static async cancelOrder(id: number): Promise<boolean> {
    try {
      await this.updateOrderStatus(id, TrangThaiDonHang.DA_HUY);
      return true;
    } catch (error) {
      throw error;
    }
  }
}

export default OrderService;