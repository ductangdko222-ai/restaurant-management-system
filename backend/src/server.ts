// server.ts
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import http from 'http';
import { config } from 'dotenv';
import { initSocket } from './config/socket';

config();

// Import routes
import authRoutes from './routes/auth';
import tableRoutes from './routes/tables';
import areaRoutes from './routes/areas';
import menuRoutes from './routes/menu';
import orderRoutes from './routes/orders';
import publicRoutes from './routes/public';
import kitchenRoutes from './routes/kitchen';
import paymentRoutes from './routes/payment';
import promotion from './routes/promotion';
import material from './routes/material';
import OrderService from './services/orderService';
const app: Express = express();

// Tạo HTTP server
const httpServer = http.createServer(app);

// Khởi tạo Socket.io
const io = initSocket(httpServer);
console.log('Socket.io tạo');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/uploads', express.static('uploads'));

// Gắn io vào app để sử dụng trong routes
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/areas', areaRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/kitchen', kitchenRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/promotions', promotion);
app.use('/api/materials', material);  
// Health check
app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Restaurant API Server đang chạy!',
    version: '1.0.0',
    features: {
      realtime: true,
      socketio: true
    },
    timestamp: new Date().toISOString()
  });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route không tồn tại'
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Có lỗi xảy ra!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Server đang chạy tại port ${PORT}`);
  console.log(`API: http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/`);
  console.log(`Socket.io: ws://localhost:${PORT}`);

  // Start stale guest order cleanup job
  OrderService.schedulePendingGuestOrderCleanup();
});