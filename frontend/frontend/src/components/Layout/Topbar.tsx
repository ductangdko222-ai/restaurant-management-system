// src/components/Layout/Topbar.tsx
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from 'react-router-dom';

const pageTitles: Record<string, string> = {
  '/dashboard':        'Dashboard',
  '/tables':           'Danh sách bàn',
  '/tables/map':       'Sơ đồ bàn',
  '/pos':              'Đặt món',
  '/orders':           'Đơn hàng',
  '/kitchen':          'Màn hình bếp',
  '/payment':          'Thanh toán',
  '/menu':             'Thực đơn',
  '/menu/categories':  'Danh mục món',
};

const Topbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const title = pageTitles[location.pathname] || 'Restaurant POS';

  return (
    <div style={{
      height: 52,
      background: 'var(--color-dark-bg)',
      borderBottom: '1px solid var(--color-dark-gray)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      flexShrink: 0,
    }}>
      {/* Title */}
      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', letterSpacing: 1 }}>
        {title}
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Tên user */}
        <div style={{ fontSize: 12, color: 'var(--color-dark-gray)' }}>
          <span style={{ color: 'var(--color-caramel)' }}>{user?.hoten}</span>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          style={{
            background: 'transparent',
            border: '1px solid var(--color-dark-gray)',
            color: 'var(--color-dark-gray)',
            padding: '5px 12px',
            fontSize: 11,
            cursor: 'pointer',
            letterSpacing: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-caramel)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-caramel)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-dark-gray)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-dark-gray)';
          }}
        >
          <i className="pi pi-sign-out" style={{ fontSize: 11 }} />
          Đăng xuất
        </button>
      </div>
    </div>
  );
};

export default Topbar;
