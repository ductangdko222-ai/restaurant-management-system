// config/socket.ts
import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import AuthService from '../services/authServices';
import { KhuVucCheBien } from '../types';

// Lưu socket instances theo user ID
const userSockets = new Map<number, string>();

// Lưu socket instances theo khu vực bếp
const kitchenSockets = new Map<KhuVucCheBien, Set<string>>();

let io: Server;

export const initSocket = (httpServer: HTTPServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Middleware xác thực
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      // Verify token
      const decoded = AuthService.verifyToken(token);
      
      // Gắn user info vào socket
      socket.data.user = decoded;
      
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  // Khi client kết nối
  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;
    
    console.log(` User connected: ${user.hoten} (${user.vaitro}) - Socket ID: ${socket.id}`);

    // Lưu socket ID của user
    userSockets.set(user.id, socket.id);


    // Phục vụ/Thu ngân join room riêng
    socket.on('join:waiter', (nguoidungid: number) => {
      socket.join(`waiter-${nguoidungid}`);
      console.log(` Waiter ${user.hoten} joined room: waiter-${nguoidungid}`);
    });

    // Bếp join room theo khu vực
    socket.on('join:kitchen', (khuvuc: KhuVucCheBien) => {
      socket.join(`kitchen-${khuvuc}`);
      
      // Lưu vào map
      if (!kitchenSockets.has(khuvuc)) {
        kitchenSockets.set(khuvuc, new Set());
      }
      kitchenSockets.get(khuvuc)!.add(socket.id);
      
      console.log(` ${user.hoten} joined kitchen: ${khuvuc}`);
    });

    // Admin join tất cả rooms
    if (user.vaitro === 'admin') {
      socket.join('admin');
      socket.join('kitchen-bep');
      socket.join('kitchen-bar');
      console.log(` Admin ${user.hoten} joined all rooms`);
    }

    socket.on('disconnect', () => {
      console.log(` User disconnected: ${user.hoten}`);
      
      // Xóa khỏi userSockets
      userSockets.delete(user.id);
      
      // Xóa khỏi kitchenSockets
      kitchenSockets.forEach((sockets, khuvuc) => {
        if (sockets.has(socket.id)) {
          sockets.delete(socket.id);
        }
      });
    });
  });

  return io;
};

// Gửi món mới xuống bếp
export const emitNewTicket = (ticket: any) => {
  if (!io) return;
  
  const room = `kitchen-${ticket.khuvucchebien}`;
  
  io.to(room).emit('ticket:new', {
    type: 'NEW_TICKET',
    data: ticket,
    timestamp: new Date()
  });
  
  console.log(` Emitted NEW_TICKET to ${room}:`, ticket.maphieu);
};

// Cập nhật trạng thái phiếu bếp
export const emitTicketUpdated = (ticket: any) => {
  if (!io) return;
  
  const room = `kitchen-${ticket.khuvucchebien}`;
  
  io.to(room).emit('ticket:updated', {
    type: 'TICKET_UPDATED',
    data: ticket,
    timestamp: new Date()
  });
  
  // Gửi cho phục vụ của bàn đó
  if (ticket.nguoiphucvuid) {
    io.to(`waiter-${ticket.nguoiphucvuid}`).emit('ticket:updated', {
      type: 'TICKET_UPDATED',
      data: ticket,
      timestamp: new Date()
    });
  }
  
  console.log(` Emitted TICKET_UPDATED to ${room}:`, ticket.maphieu);
};

// Cập nhật trạng thái order
export const emitOrderUpdated = (order: any) => {
  if (!io) return;
  
  // Gửi cho phục vụ
  if (order.nguoiphucvuid) {
    io.to(`waiter-${order.nguoiphucvuid}`).emit('order:updated', {
      type: 'ORDER_UPDATED',
      data: order,
      timestamp: new Date()
    });
  }
  
  // Gửi cho admin
  io.to('admin').emit('order:updated', {
    type: 'ORDER_UPDATED',
    data: order,
    timestamp: new Date()
  });
  
  console.log(` Emitted ORDER_UPDATED:`, order.madon);
};

// Cập nhật trạng thái bàn
export const emitTableUpdated = (table: any) => {
  if (!io) return;
  
  // Broadcast cho tất cả clients
  io.emit('table:updated', {
    type: 'TABLE_UPDATED',
    data: table,
    timestamp: new Date()
  });
  
  console.log(` Emitted TABLE_UPDATED:`, table.tenban);
};

// Thông báo cho phục vụ (món đã xong)
export const notifyWaiter = (nguoiphucvuid: number, message: string, data?: any) => {
  if (!io) return;
  
  io.to(`waiter-${nguoiphucvuid}`).emit('notification', {
    type: 'INFO',
    message,
    data,
    timestamp: new Date()
  });
  
  console.log(`Notification sent to waiter ${nguoiphucvuid}: ${message}`);
};

// Gửi thông báo tới tất cả
export const broadcastNotification = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
  if (!io) return;
  
  io.emit('notification', {
    type: type.toUpperCase(),
    message,
    timestamp: new Date()
  });
  
  console.log(` Broadcast notification: ${message}`);
};

export const getIO = () => io;

export default {
  initSocket,
  emitNewTicket,
  emitTicketUpdated,
  emitOrderUpdated,
  emitTableUpdated,
  notifyWaiter,
  broadcastNotification,
  getIO
};