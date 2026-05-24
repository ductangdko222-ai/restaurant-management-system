// src/services/api.ts
import axios, { AxiosInstance } from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
console.log('API_URL:', API_URL);
class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Request interceptor - Thêm token vào header
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - Xử lý lỗi
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token hết hạn - Logout
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth
  login(data: { tendangnhap: string; matkhau: string }) {
    return this.api.post('/auth/login', data);
  }

  getMe() {
    return this.api.get('/auth/me');
  }

  changePassword(data: { matkhaucu: string; matkhaumoi: string }) {
    return this.api.post('/auth/change-password', data);
  }
  getAllUsers(params?: any) {
    return this.api.get('/auth/users', { params });
  }
  updateUser(id: number, data: any) {
    return this.api.put(`/auth/users/${id}`, data);
  }
  deleteUser(id: number) {
    return this.api.delete(`/auth/users/${id}`);
  }
  register(data: any) {
    return this.api.post('/auth/register', data);
  }
  // Khu vực
  getAreas() {
    return this.api.get('/areas');
  }

  createArea(data: any) {
    return this.api.post('/areas', data);
  }

  updateArea(id: number, data: any) {
    return this.api.put(`/areas/${id}`, data);
  }

  deleteArea(id: number) {
    return this.api.delete(`/areas/${id}`);
  }

  // Bàn
  getTableById(id: number) {
    return this.api.get(`/tables/${id}`);
  }

  getTables(params?: any) {
    return this.api.get('/tables', { params });
  }

  getTable(id: number) {
    return this.api.get(`/tables/${id}`);
  }

  createTable(data: any) {
    return this.api.post('/tables', data);
  }

  updateTable(id: number, data: any) {
    return this.api.put(`/tables/${id}`, data);
  }

  updateTableStatus(id: number, trangthai: string) {
    return this.api.patch(`/tables/${id}/status`, { trangthai });
  }

  updateTablePosition(id: number, vitrix: number, vitriy: number) {
    return this.api.patch(`/tables/${id}/position`, { vitrix, vitriy });
  }

  deleteTable(id: number) {
    return this.api.delete(`/tables/${id}`);
  }

  transferTable(fromTableId: number, toTableId: number) {
    return this.api.post('/tables/transfer', { fromTableId, toTableId });
  }

  mergeTables(targetTableId: number, sourceTableIds: number[]) {
    return this.api.post('/tables/merge', { targetTableId, sourceTableIds });
  }

  // Menu
  getCategories() {
    return this.api.get('/menu/categories');
  }

  createCategory(data: any) {
    return this.api.post('/menu/categories', data);
  }

  updateCategory(id: number, data: any) {
    return this.api.put(`/menu/categories/${id}`, data);
  }

  deleteCategory(id: number) {
    return this.api.delete(`/menu/categories/${id}`);
  }

  getMenuItems(params?: any) {
    return this.api.get('/menu/items', { params });
  }

  getMenuItem(id: number) {
    return this.api.get(`/menu/items/${id}`);
  }

  createMenuItem(data: any) {
    return this.api.post('/menu/items', data);
  }

  updateMenuItem(id: number, data: any) {
    return this.api.put(`/menu/items/${id}`, data);
  }

  deleteMenuItem(id: number) {
    return this.api.delete(`/menu/items/${id}`);
  }

  getMenuByCategory() {
    return this.api.get('/menu/by-category');
  }

  getDinhMucNVL(monanid: number) {
    return this.api.get(`/menu/items/${monanid}/dinhmuc`);
  }

  upsertDinhMucNVL(monanid: number, data: { nguyenvatlieuid: number; soluong: number; donvinhap?: string }) {
    return this.api.post(`/menu/items/${monanid}/dinhmuc`, data);
  }

  deleteDinhMucNVL(monanid: number, nguyenvatlieuid: number) {
    return this.api.delete(`/menu/items/${monanid}/dinhmuc/${nguyenvatlieuid}`);
  }

  // Đơn hàng
  getOrders(params?: any) {
    return this.api.get('/orders', { params });
  }

  getOrder(id: number) {
    return this.api.get(`/orders/${id}`);
  }

  getOrderByTable(banid: number) {
    return this.api.get(`/orders/table/${banid}`);
  }

  createOrder(data: any) {
    return this.api.post('/orders', data);
  }

  addItemToOrder(donhangid: number, data: any) {
    return this.api.post(`/orders/${donhangid}/items`, data);
  }

  // Public API (cho khách hàng)
  getPublicMenuByCategory() {
    return this.api.get('/public/menu/by-category');
  }

  getPublicMenuItem(id: number) {
    return this.api.get(`/public/menu/items/${id}`);
  }

  getPublicTableById(id: number) {
    return this.api.get(`/public/tables/${id}`);
  }

  getPublicOrderByTable(banid: number) {
    return this.api.get(`/public/orders/table/${banid}`);
  }

  createPublicOrder(data: any) {
    return this.api.post('/public/orders', data);
  }

  addItemToPublicOrder(donhangid: number, data: any) {
    return this.api.post(`/public/orders/${donhangid}/items`, data);
  }

  updateOrderItem(id: number, data: any) {
    return this.api.put(`/orders/items/${id}`, data);
  }

  deleteOrderItem(id: number) {
    return this.api.delete(`/orders/items/${id}`);
  }

  sendToKitchen(donhangid: number, chitietIds?: number[]) {
    return this.api.post(`/orders/${donhangid}/send-to-kitchen`, { chitietIds });
  }

  cancelOrder(id: number) {
    return this.api.delete(`/orders/${id}`);
  }

  updateOrderStatus(id: number, trangthai: string) {
    return this.api.patch(`/orders/${id}/status`, { trangthai });
  }

  // Bếp
  getKitchenTickets(params?: any) {
    return this.api.get('/kitchen/tickets', { params });
  }

  getKitchenByArea(khuvuc: 'bep' | 'bar') {
    return this.api.get(`/kitchen/${khuvuc}`);
  }

  startCooking(id: number) {
    return this.api.post(`/kitchen/${id}/start`);
  }

  finishCooking(id: number) {
    return this.api.post(`/kitchen/${id}/finish`);
  }

  markAsServed(id: number) {
    return this.api.post(`/kitchen/${id}/served`);
  }

  // Thanh toán
  processPayment(data: any) {
    return this.api.post('/payment/process', data);
  }

  getInvoices(params?: any) {
    return this.api.get('/payment/invoices', { params });
  }

  getInvoice(id: number) {
    return this.api.get(`/payment/invoices/${id}`);
  }

  downloadInvoicePDF(id: number) {
    return this.api.get(`/payment/invoices/${id}/pdf`, {
      responseType: 'blob'
    });
  }


  openShift(tiendauca: number) {
    return this.api.post('/payment/shifts/open', { tiendauca });
  }

  closeShift(id: number, tiencuoica: number) {
    return this.api.post(`/payment/shifts/${id}/close`, { tiencuoica });
  }
  getShifts(params?: any) {
    return this.api.get('/payment/shifts', { params });
  }

  getActiveShift() {
    return this.api.get('/payment/shifts/active');
  }

  getRevenueStats(params?: any) {
    return this.api.get('/payment/stats', { params });
  }
  getDoanhThuTheoCA(calamviecid: number) {
    return this.api.get(`/payment/doanhthu/calamviec/${calamviecid}`);
  }
  getDoanhThuTongQuan(params?: { tungay?: string; denngay?: string }) {
    return this.api.get('/payment/doanh-thu/tong-quan', { params });
  }
  getDoanhThuTungNgay(params?: { tungay?: string; denngay?: string }) {
    return this.api.get('/payment/doanh-thu/tung-ngay', { params });
  }
  getTopMon(params?: { tungay?: string; denngay?: string; limit?: number; sortBy?: string }) {
    return this.api.get('/payment/topmon', { params });
  }
  getTongQuanHomNay() {
    return this.api.get('/payment/tong-quan-hom-nay');
  }
  getCanhBao() {
    return this.api.get('/payment/canh-bao');
  }
  soSanh2Ky(ky1: { tungay: string; denngay: string }, ky2: { tungay: string; denngay: string }) {
    return this.api.post('/payment/doanh-thu/so-sanh-2-ky', { ky1, ky2 });
  }


  // Khuyến mãi
  getKhuyenMai(params?: { loai?: string; trangthai?: string }) {
    return this.api.get('/promotions', { params });
  }

  getKhuyenMaiById(id: number) {
    return this.api.get(`/promotions/${id}`);
  }

  getKhuyenMaiHieuLuc() {
    return this.api.get('/promotions/hieuluc');
  }

  createKhuyenMai(data: any) {
    return this.api.post('/promotions', data);
  }

  updateKhuyenMai(id: number, data: any) {
    return this.api.put(`/promotions/${id}`, data);
  }

  capNhatTrangThaiKhuyenMai(id: number, trangthai: string) {
    return this.api.patch(`/promotions/${id}/updatetrangthai`, { trangthai });
  }

  deleteKhuyenMai(id: number) {
    return this.api.delete(`/promotions/${id}`);
  }

  // Nguyên vật liệu
  getNguyenVatLieu() {
    return this.api.get('/materials');
  }

  getNguyenVatLieuById(id: number) {
    return this.api.get(`/materials/${id}`);
  }

  getNguyenVatLieuCanhBao() {
    return this.api.get('/materials/canhbao');
  }

  getLichSuXuatNVL(id: number) {
    return this.api.get(`/materials/${id}/lichsuxuat`);
  }

  getDungTrongMonNVL(id: number) {
    return this.api.get(`/materials/${id}/dungtrongmon`);
  }

  createNguyenVatLieu(data: any) {
    return this.api.post('/materials', data);
  }

  updateNguyenVatLieu(id: number, data: any) {
    return this.api.put(`/materials/${id}`, data);
  }

  deleteNguyenVatLieu(id: number) {
    return this.api.delete(`/materials/${id}`);
  }

  nhapKhoNVL(id: number, soluong: number) {
    return this.api.post(`/materials/${id}/nhapkho`, { soluong });
  }

  xuatKhoNVL(id: number, soluong: number) {
    return this.api.post(`/materials/${id}/xuatkho`, { soluong });
  }
}

const apiService = new ApiService();
export default apiService;