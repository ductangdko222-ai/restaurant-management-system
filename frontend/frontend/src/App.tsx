import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import MainLayout from './components/Layout/MainLayout';
import ShiftGuard from './components/ShiftGuard'; // Import ShiftGuard
import Login from './pages/Auth/Login';
import ShiftManager from './pages/Shift/Shift';
// Lazy loading các trang
const Dashboard = React.lazy(() => import('./pages/Dashboard/Dashboard'));
const TableList = React.lazy(() => import('./pages/Tables/TableList'));
const TableMap = React.lazy(() => import('./pages/Tables/TableMap'));
const MenuList = React.lazy(() => import('./pages/Menu/MenuList'));
const POS = React.lazy(() => import('./pages/Orders/POS'));
const OrderList = React.lazy(() => import('./pages/Orders/OrderList'));
const KitchenScreen = React.lazy(() => import('./pages/Kitchen/KitchenScreen'));
const PaymentScreen = React.lazy(() => import('./pages/Payment/PaymentScreen'));
const UserList = React.lazy(() => import('./pages/Users/UserList'));
const MenuPublic = React.lazy(() => import('./pages/Public/MenuPublic'));
const OrderConfirmation = React.lazy(() => import('./pages/Orders/OrderConfirmation'));
const KhuyenMaiList = React.lazy(() => import('./pages/Promotion/Promotion'));
const MaterialList = React.lazy(() => import('./pages/Material/Material'));

const Fallback = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '100vh', background: 'var(--color-deep-espresso)', color: 'var(--color-caramel)',
    fontFamily: 'monospace', fontSize: 12, letterSpacing: 2
  }}>
    ĐANG TẢI...
  </div>
);

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <React.Suspense fallback={<Fallback />}>
        <Routes>
          {/* Khách, Login*/}
          <Route path="/login" element={<Login />} />
          <Route path="/order/:token" element={<MenuPublic />} />
          <Route path="/menu/:tableId" element={<MenuPublic />} />
          <Route path="/menupublic" element={<MenuPublic />} />
          <Route path="/" element={<Navigate to="/tables" replace />} />

          {/* Nhân viên*/}
          <Route element={<PrivateRoute />}>
            <Route element={<MainLayout />}>

              {/* Quản lý ca */}
              <Route path="/shifts" element={<ShiftManager />} />
              <Route path="/dashboard" element={<Dashboard />} />

              {/* vào ca mới được dùng */}
              <Route element={<ShiftGuard><Outlet /></ShiftGuard>}>
                <Route path="/tables" element={<TableList />} />
                <Route path="/tables/map" element={<TableMap />} />
                <Route path="/pos" element={<POS />} />
                <Route path="/pos/:tableId" element={<POS />} />
                <Route path="/orders" element={<OrderList />} />
                <Route path="/orders/confirmation" element={<OrderConfirmation />} />
                <Route path="/payment" element={<PaymentScreen />} />
                
              </Route>

              {/* Phân quyền Bếp & Bar */}
              <Route element={<PrivateRoute allowedRoles={['bep', 'bar', 'admin']} />}>
              <Route path="/kitchen" element={<KitchenScreen />} />
              </Route>

              {/* Phân quyền Admin */}
              <Route element={<PrivateRoute allowedRoles={['admin']} />}>
                <Route path="/menu" element={<MenuList />} />
                <Route path="/users" element={<UserList />} />
                <Route path="/promotions" element={<KhuyenMaiList />} />
                <Route path="/materials" element={<MaterialList />} />
              </Route>

            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/tables" replace />} />
        </Routes>
      </React.Suspense>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
