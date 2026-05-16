// services/kitchenService.ts
import KitchenTicket from '../models/KitchenTicket';
import db from '../config/db';
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
      return updatedTicket;
    } catch (error) { throw error; }
  }

  // Đánh dấu món đã phục vụ
  static async markAsServed(id: number): Promise<boolean> {
    try {
      const ticket = await KitchenTicket.findById(id);
      if (!ticket) throw new Error('Không tìm thấy phiếu bếp');
      await db.query(
        'UPDATE chitietdonhang SET trangthai = ? WHERE id = ?',
        ['daphucvu', ticket.chitietdonhangid]
      );
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