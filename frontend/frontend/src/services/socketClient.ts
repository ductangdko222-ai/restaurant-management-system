// src/services/socketClient.ts
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3000';

let socket: Socket | null = null;

// Kết nối Socket.io
export const connectSocket = (token?: string): Socket => {
  if (socket?.connected) {
    return socket;
  }

  const options: any = {
    transports: ['websocket', 'polling']
  };
  if (token) {
    options.auth = { token };
  }

  socket = io(SOCKET_URL, options);

  socket.on('connect', () => {
    console.log('Da ket noi Socket:', socket?.id);
  });

  socket.on('connect_error', (error) => {
    console.error('Loi ket noi Socket:', error.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('Da ngat ket noi Socket:', reason);
  });

  return socket;
};

// Ngắt kết nối
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('Da ngat ket noi Socket');
  }
};

// Lấy socket instance
export const getSocket = (): Socket | null => {
  return socket;
};


export const joinWaiterRoom = (nguoidungid: number) => {
  if (socket) {
    socket.emit('join:waiter', nguoidungid);
    console.log(`Da tham gia phong phuc vu: ${nguoidungid}`);
  }
};

// mon da xong
export const onTicketUpdated = (callback: (data: any) => void) => {
  if (socket) {
    socket.on('ticket:updated', callback);
  }
};

//don hang cap nhat
export const onOrderUpdated = (callback: (data: any) => void) => {
  if (socket) {
    socket.on('order:updated', callback);
  }
};

// ban cap nhat
export const onTableUpdated = (callback: (data: any) => void) => {
  if (socket) {
    socket.on('table:updated', callback);
  }
};

//  thong bao
export const onNotification = (callback: (data: any) => void) => {
  if (socket) {
    socket.on('notification', callback);
  }
};

// BEP
// Tham gia phong bep
export const joinKitchenRoom = (khuvuc: 'bep' | 'bar') => {
  if (socket) {
    socket.emit('join:kitchen', khuvuc);
    console.log(`Da tham gia phong bep: ${khuvuc}`);
  }
};

//  mon moi
export const onNewTicket = (callback: (data: any) => void) => {
  if (socket) {
    socket.on('ticket:new', callback);
  }
};


export const removeAllListeners = () => {
  if (socket) {
    socket.removeAllListeners();
    console.log('Da go bo tat ca cac lang nghe socket');
  }
};

export default {
  connectSocket,
  disconnectSocket,
  getSocket,
  joinWaiterRoom,
  joinKitchenRoom,
  onNewTicket,
  onTicketUpdated,
  onOrderUpdated,
  onTableUpdated,
  onNotification,
  removeAllListeners
};