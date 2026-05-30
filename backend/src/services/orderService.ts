import Order from '../models/Order';
import Table from '../models/Table';
import KitchenTicket from '../models/KitchenTicket';
import { TrangThaiBan, TrangThaiDonHang, TrangThaiChiTiet } from '../types';
import { emitNewTicket, emitOrderUpdated, emitTableUpdated, emitNewPendingOrder, broadcastNotification } from '../config/socket';
import db from '../config/db'; // 

class OrderService {
  static async getAllOrders(filters?: any, page: number = 1, limit: number = 10): Promise<any> {
    try {
      const orders = await Order.findAll(filters);
      const total = orders.length;
      const totalPages = Math.ceil(total / limit);
      const start = (page - 1) * limit;
      const paginatedOrders = orders.slice(start, start + limit);
      
      return {
        data: paginatedOrders,
        totalPages,
        total
      };
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
    trangthai?: TrangThaiDonHang;
    forceNew?: boolean;
  }): Promise<any> {
    try {
      if (orderData.loai === 'taiban' && !orderData.banid) {
        throw new Error('Vui lòng chọn bàn');
      }
      if (orderData.banid && !orderData.forceNew) {
        const existingOrder = await Order.findActiveByTableId(orderData.banid);
        if (existingOrder) {
          return existingOrder;
        }
      }

      const madon = await Order.generateOrderCode();
      const trangthai = orderData.trangthai || TrangThaiDonHang.DANG_PHUC_VU;

      const newOrder = await Order.create({
        ...orderData,
        madon,
        trangthai
      });

      if (orderData.banid) {
        await Table.updateStatus(orderData.banid, TrangThaiBan.CO_KHACH);
      }

      // Emit socket event cho đơn chờ xác nhận
      if (trangthai === TrangThaiDonHang.CHO_XAC_NHAN) {
        emitNewPendingOrder(newOrder);
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
    trangthai?: TrangThaiChiTiet;
  }): Promise<boolean> {
    try {
      const result = await Order.updateItem(id, itemData);

      let donhangid: number | null = null;
      if (itemData.soluong || itemData.trangthai) {
        const [rows]: any = await db.query(
          'SELECT donhangid FROM chitietdonhang WHERE id = ?',
          [id]
        );

        if (rows.length > 0 && rows[0].donhangid !== null) {
          const orderId = rows[0].donhangid;
          donhangid = orderId;
          if (itemData.soluong) {
            const totals = await Order.calculateTotal(orderId);
            await Order.update(orderId, totals);
          }
        }
      }

      if (donhangid !== null && itemData.trangthai) {
        await this.syncOrderStatusFromItems(donhangid);
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  static async syncOrderStatusFromItems(donhangid: number): Promise<any> {
    try {
      const order = await Order.findById(donhangid);
      if (!order) throw new Error('Không tìm thấy đơn hàng');
      if ([TrangThaiDonHang.DA_THANH_TOAN, TrangThaiDonHang.DA_HUY].includes(order.trangthai)) {
        return order;
      }

      const items = order.chitiet || [];
      const allServed = items.length > 0 && items.every((item: any) => item.trangthai === TrangThaiChiTiet.DA_PHUC_VU);

      if (allServed) {
        if (order.trangthai !== TrangThaiDonHang.CHO_THANH_TOAN) {
          const updatedOrder = await Order.update(donhangid, { trangthai: TrangThaiDonHang.CHO_THANH_TOAN });
          emitOrderUpdated(updatedOrder);
          return updatedOrder;
        }
      }

      return order;
    } catch (error) {
      throw error;
    }
  }

  static async deleteOrderItem(id: number): Promise<boolean> {
    try {
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

  static async cancelStaleConfirmationOrders(timeoutSeconds = 180): Promise<void> {
    try {
      const [rows]: any = await db.query(
        `SELECT id FROM donhang WHERE trangthai = ? AND thoigiantao <= DATE_SUB(NOW(), INTERVAL ? SECOND)`,
        [TrangThaiDonHang.CHO_XAC_NHAN, timeoutSeconds]
      );

      if (!rows || rows.length === 0) return;

      for (const row of rows) {
        const order = await this.getOrderById(row.id);
        await this.updateOrderStatus(row.id, TrangThaiDonHang.DA_HUY);
        
        // Emit notification để khách biết đơn bị huỷ
        emitOrderUpdated({
          ...order,
          trangthai: TrangThaiDonHang.DA_HUY,
          cancelReason: 'Đơn chưa được xác nhận, vui lòng gọi nhân viên'
        });

        broadcastNotification('Đơn chưa được xác nhận, vui lòng gọi nhân viên', 'warning');
      }
    } catch (error) {
      throw error;
    }
  }

  static schedulePendingGuestOrderCleanup(): void {
    const intervalSeconds = 60;
    setInterval(async () => {
      try {
        await this.cancelStaleConfirmationOrders();
      } catch (error) {
        console.error('Failed to cancel stale confirmation orders:', error);
      }
    }, intervalSeconds * 1000);
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

  // Lấy tất cả đơn chờ xác nhận
  static async getPendingConfirmationOrders(): Promise<any[]> {
    try {
      return await Order.findAllPendingConfirmation();
    } catch (error) {
      throw error;
    }
  }

  // Xác nhận đơn hàng (chuyển từ chờ xác nhận sang đang phục vụ)
  static async confirmOrder(id: number): Promise<any> {
    try {
      const order = await Order.findById(id);
      if (!order) {
        throw new Error('Không tìm thấy đơn hàng');
      }

      if (order.trangthai !== TrangThaiDonHang.CHO_XAC_NHAN) {
        throw new Error('Đơn hàng không ở trạng thái chờ xác nhận');
      }

      // Chuyển sang đang phục vụ
      const updatedOrder = await Order.update(id, { trangthai: TrangThaiDonHang.DANG_PHUC_VU });

      // Nếu là đơn bàn, cập nhật trạng thái bàn
      if (order.banid) {
        await Table.updateStatus(order.banid, TrangThaiBan.CO_KHACH);
        const updatedTable = await Table.findById(order.banid);
        if (updatedTable) {
          emitTableUpdated(updatedTable);
        }
      }

      // Emit socket event
      emitOrderUpdated(updatedOrder);

      return updatedOrder;
    } catch (error) {
      throw error;
    }
  }

  // Kiểm tra giới hạn số đơn chờ xác nhận
  static async checkPendingOrdersLimit(maxPending = 50): Promise<boolean> {
    try {
      const count = await Order.countPendingConfirmation();
      return count < maxPending;
    } catch (error) {
      throw error;
    }
  }
}

export default OrderService;