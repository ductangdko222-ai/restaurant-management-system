// services/kitchenService.ts
import KitchenTicket from '../models/KitchenTicket';
import db from '../config/db';
import OrderService from './orderService';
import { KhuVucCheBien } from '../types';
import { emitTicketUpdated, notifyWaiter } from '../config/socket';

class KitchenService {
  static async getAllTickets(filters?: {
    khuvucchebien?: KhuVucCheBien;
    trangthai?: string;
  }): Promise<any[]> {
    try {
      return await KitchenTicket.findAll(filters);
    } catch (error) { throw error; }
  }

  static async getTicketsByArea(khuvucchebien: KhuVucCheBien): Promise<{
    moi: any[]; danglam: any[]; sansang: any[];
  }> {
    try {
      return await KitchenTicket.getByAreaAndStatus(khuvucchebien);
    } catch (error) { throw error; }
  }

  // Bắt đầu làm món
  static async startCooking(id: number, nguoinhanid: number): Promise<any> {
    try {
      const ticket = await KitchenTicket.findById(id);
      if (!ticket) throw new Error('Không tìm thấy phiếu bếp');
      if (ticket.trangthai !== 'moi') throw new Error('Món đã được xử lý');

      const updatedTicket = await KitchenTicket.updateStatus(id, { trangthai: 'danglam', nguoinhanid });
      emitTicketUpdated(updatedTicket);
      return updatedTicket;
    } catch (error) { throw error; }
  }

  // Hoàn thành món → tự động trừ NVL
  static async finishCooking(id: number): Promise<any> {
    try {
      const ticket = await KitchenTicket.findById(id);
      if (!ticket) throw new Error('Không tìm thấy phiếu bếp');
      if (ticket.trangthai !== 'danglam') throw new Error('Món chưa bắt đầu làm');

      const updatedTicket = await KitchenTicket.updateStatus(id, { trangthai: 'sansang' });
      await KitchenTicket.xuatNguyenVatLieu(ticket.chitietdonhangid);

      emitTicketUpdated(updatedTicket);
      if (updatedTicket.nguoiphucvuid) {
        notifyWaiter(
          updatedTicket.nguoiphucvuid,
          `Món ${updatedTicket.tenmon} - ${updatedTicket.tenban} đã sẵn sàng!`,
          updatedTicket
        );
      }

      const [orderRows]: any = await db.query(
        'SELECT donhangid FROM chitietdonhang WHERE id = ?',
        [ticket.chitietdonhangid]
      );
      if (orderRows.length > 0 && orderRows[0].donhangid !== null) {
        await OrderService.syncOrderStatusFromItems(orderRows[0].donhangid);
      }

      return updatedTicket;
    } catch (error) { throw error; }
  }

  // Đánh dấu món đã phục vụ
  static async markAsServed(id: number): Promise<boolean> {
    try {
      const ticket = await KitchenTicket.findById(id);
      if (!ticket) throw new Error('Không tìm thấy phiếu bếp');
      // Cập nhật trạng thái chi tiết đơn -> đã phục vụ
      await db.query(
        'UPDATE chitietdonhang SET trangthai = ? WHERE id = ?',
        ['daphucvu', ticket.chitietdonhangid]
      );

      // Cập nhật phiếu bếp để bếp không còn hiển thị (đánh dấu là đã phục vụ)
      await db.query(
        `UPDATE phieubep SET trangthai = ? WHERE id = ?`,
        ['daphucvu', id]
      );

      // Lấy lại phiếu bếp đã cập nhật và emit sự kiện realtime
      const updatedTicket = await KitchenTicket.findById(id);
      if (updatedTicket) emitTicketUpdated(updatedTicket);

      const [orderRows]: any = await db.query(
        'SELECT donhangid FROM chitietdonhang WHERE id = ?',
        [ticket.chitietdonhangid]
      );
      if (orderRows.length > 0 && orderRows[0].donhangid !== null) {
        await OrderService.syncOrderStatusFromItems(orderRows[0].donhangid);
      }

      return true;
    } catch (error) { throw error; }
  }

  // Thống kê bếp
  static async getKitchenStats(): Promise<any> {
    try {
      return await KitchenTicket.getStats();
    } catch (error) { throw error; }
  }
}

export default KitchenService;