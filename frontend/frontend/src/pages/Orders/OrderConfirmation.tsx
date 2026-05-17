import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAuthToken } from '../../services/authService';

interface PendingOrder {
  id: number;
  madon: string;
  loai: string;
  tenban?: string;
  tongtien: number;
  chitiet: any[];
  thoigiantao: string;
}

const OrderConfirmation: React.FC = () => {
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const notificationPlayedRef = useRef<Set<number>>(new Set());

  // Fetch pending orders
  const fetchPendingOrders = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/orders/confirmation/pending`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Lỗi khi lấy danh sách đơn');
      }

      const data = await response.json();
      setOrders(data.data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching pending orders:', err);
    } finally {
      setLoading(false);
    }
  };

  // Play notification sound - use a simpler approach
  const playNotificationSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  // Confirm order
  const confirmOrder = async (orderId: number) => {
    try {
      const token = getAuthToken();
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/orders/${orderId}/confirm`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Lỗi khi xác nhận đơn');
      }

      setOrders(orders.filter(o => o.id !== orderId));
      notificationPlayedRef.current.delete(orderId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Cancel order
  const cancelOrder = async (orderId: number) => {
    if (!window.confirm('Bạn chắc chắn muốn huỷ đơn này?')) {
      return;
    }

    try {
      const token = getAuthToken();
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/orders/${orderId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Lỗi khi huỷ đơn');
      }

      setOrders(orders.filter(o => o.id !== orderId));
      notificationPlayedRef.current.delete(orderId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Connect to Socket.io
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setError('Không có token xác thực');
      return;
    }

    socketRef.current = io(
      process.env.REACT_APP_API_URL || 'http://localhost:5000',
      {
        auth: { token },
        transports: ['websocket']
      }
    );

    socketRef.current.on('connect', () => {
      console.log('✅ Connected to socket');
      socketRef.current?.emit('join:waiter', 0); // Join waiter room
    });

    // Listen for new pending orders
    socketRef.current.on('order:pending-confirmation', (data) => {
      console.log('📢 New pending order received:', data);
      const newOrder = data.data;
      
      setOrders(prev => {
        const exists = prev.some(o => o.id === newOrder.id);
        if (!exists) {
          return [...prev, newOrder];
        }
        return prev;
      });

      // Play notification only once per order
      if (!notificationPlayedRef.current.has(newOrder.id)) {
        playNotificationSound();
        notificationPlayedRef.current.add(newOrder.id);
        
        // Trigger browser notification
        if (Notification.permission === 'granted') {
          new Notification('📢 Đơn mới chờ xác nhận!', {
            body: `Đơn ${newOrder.madon} - ${newOrder.tenban || 'Đơn hàng'} vừa được tạo`,
            tag: `order-${newOrder.id}`,
            badge: '🔔'
          });
        }
      }
    });

    // Listen for order updates (when order is cancelled by timeout or other reason)
    socketRef.current.on('order:updated', (data) => {
      console.log('Order updated:', data);
      const updatedOrder = data.data;
      
      // Remove if order is no longer pending
      if (updatedOrder.trangthai !== 'choxacnhan') {
        setOrders(prev => prev.filter(o => o.id !== updatedOrder.id));
        notificationPlayedRef.current.delete(updatedOrder.id);
      }
    });

    socketRef.current.on('disconnect', () => {
      console.log('❌ Disconnected from socket');
    });

    // Fetch initial orders
    fetchPendingOrders();

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  // Request notification permission
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <h1 className="text-4xl font-bold text-gray-800 flex items-center gap-3">
          <span className="text-3xl">🔔</span>
          Xác Nhận Đơn Hàng
        </h1>
        <p className="text-gray-600 mt-2">
          {orders.length} đơn chờ xác nhận
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="max-w-6xl mx-auto mb-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      )}

      {/* Empty state */}
      {orders.length === 0 && !loading && (
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Không có đơn chờ xác nhận</h2>
            <p className="text-gray-600">Tất cả đơn hàng đã được xác nhận</p>
          </div>
        </div>
      )}

      {/* Orders grid */}
      {orders.length > 0 && (
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map(order => (
            <div
              key={order.id}
              className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow overflow-hidden"
            >
              {/* Order header with animated background */}
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-sm font-semibold opacity-90">Mã đơn</p>
                    <p className="text-2xl font-bold">{order.madon}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold opacity-90">Loại</p>
                    <p className="text-lg font-bold">
                      {order.loai === 'taiban' ? '🪑 Tại bàn' : '🛵 Mang đi'}
                    </p>
                  </div>
                </div>

                {/* Table number - LARGE AND BOLD */}
                {order.tenban && (
                  <div className="bg-white bg-opacity-20 rounded-lg p-3 text-center">
                    <p className="text-xs font-semibold opacity-75 uppercase tracking-wider">Bàn</p>
                    <p className="text-5xl font-black mt-1">{order.tenban}</p>
                  </div>
                )}
              </div>

              {/* Order details */}
              <div className="p-6">
                {/* Items */}
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">
                    Các món ăn ({order.chitiet?.length || 0})
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {order.chitiet?.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                        <span className="text-gray-700 font-medium">{item.tenmon}</span>
                        <span className="text-gray-500">x{item.soluong}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 mb-4 text-center">
                  <p className="text-xs text-gray-600 font-semibold uppercase">Tổng tiền</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {(order.tongtien || 0).toLocaleString('vi-VN')}₫
                  </p>
                </div>

                {/* Time */}
                <p className="text-xs text-gray-500 text-center mb-4">
                  {new Date(order.thoigiantao).toLocaleTimeString('vi-VN')}
                </p>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => confirmOrder(order.id)}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition-all"
                  >
                    ✅ Xác Nhận
                  </button>
                  <button
                    onClick={() => cancelOrder(order.id)}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg transition-all"
                  >
                    ❌ Huỷ
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating action button for refresh */}
      <button
        onClick={fetchPendingOrders}
        className="fixed bottom-6 right-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-4 shadow-lg transition-all"
        title="Làm mới"
      >
        <span className="text-2xl">🔄</span>
      </button>
    </div>
  );
};

export default OrderConfirmation;
