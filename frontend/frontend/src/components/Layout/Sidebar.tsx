// src/components/Layout/Sidebar.tsx
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface MenuItem {
  label: string;
  icon: string;
  path: string;
  roles?: string[];
}

const menuItems: MenuItem[] = [
  { label: 'Dashboard', icon: 'pi-chart-bar', path: '/dashboard', roles: ['admin', 'thungan'] },
  { label: 'Đặt món (POS)', icon: 'pi-shopping-cart', path: '/pos', roles: ['phucvu', 'admin'] },
  { label: 'Danh sách đơn hàng', icon: 'pi pi-box', path: '/orders' },
  { label: 'Bếp', icon: 'pi pi-hourglass', path: '/kitchen', roles: ['bep', 'bar', 'admin'] },
  { label: 'Thanh toán', icon: 'pi-credit-card', path: '/payment', roles: ['thungan', 'admin'] },
  { label: 'Sơ đồ bàn', icon: 'pi-th-large', path: '/tables/map' },
  { label: 'Danh sách bàn', icon: 'pi-list', path: '/tables' },
  { label: 'Thực đơn', icon: 'pi-book', path: '/menu', roles: ['admin'] },
  { label: 'Khuyến mãi', icon: 'pi-tags', path: '/promotions', roles: ['admin'] },
  { label: 'Nguyên liệu', icon: 'pi-box', path: '/materials', roles: ['admin'] },
  { label: 'Ca Làm việc', icon: 'pi-clock', path: '/shifts', roles: ['thungan', 'admin'] },
  { label: 'Nhân viên', icon: 'pi-users', path: '/users', roles: ['admin'] },
  { label: 'MenuPublic', icon: 'pi-menu', path: '/menupublic' },
];

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(true);

  const filtered = menuItems.filter(item =>
    !item.roles || item.roles.includes(user?.vaitro || '')
  );

  const width = collapsed ? 72 : 220;

  return (
    <div style={{
      width,
      minHeight: '100vh',
      background: 'var(--color-dark-bg)',
      borderRight: '1px solid var(--color-dark-gray)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      transition: 'width 0.2s ease',
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div
        onClick={() => setCollapsed(prev => !prev)}
        style={{
          padding: collapsed ? '20px 12px' : '24px 20px',
          borderBottom: '1px solid var(--color-dark-gray)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: 10,
          cursor: 'pointer',
        }}
        title={collapsed ? 'Mở sidebar' : 'Thu gọn sidebar'}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: collapsed ? 0 : 10,
        }}>
          <div style={{
            width: 32, height: 32,
            border: '1px solid var(--color-caramel)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="pi pi-home" style={{ color: 'var(--color-caramel)', fontSize: 14 }} />
          </div>
          {!collapsed && (
            <div>
              <div style={{ fontSize: 13, color: 'var(--color-off-white)', letterSpacing: 2, fontFamily: 'Georgia, serif' }}>
                RESTAURANT
              </div>
              <div style={{ fontSize: 9, color: 'var(--color-text-secondary)', letterSpacing: 2 }}>POS SYSTEM</div>
            </div>
          )}
        </div>
      </div>

      {/* Menu */}
      <nav style={{ flex: 1, padding: '12px 0' }}>
        {filtered.map(item => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          return (
            <div
              key={item.path}
              title={collapsed ? item.label : undefined}
              onClick={() => navigate(item.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: collapsed ? 0 : 10,
                padding: collapsed ? '10px 12px' : '10px 20px',
                cursor: 'pointer',
                background: isActive ? 'rgba(201,151,58,0.1)' : 'transparent',
                borderLeft: isActive ? '2px solid var(--color-caramel)' : '2px solid transparent',
                color: isActive ? 'var(--color-caramel)' : 'var(--color-dark-gray)',
                fontSize: 13,
                transition: 'all 0.15s',
                justifyContent: collapsed ? 'center' : 'flex-start',
              }}
              onMouseEnter={e => {
                if (!isActive) (e.currentTarget as HTMLDivElement).style.color = 'var(--color-text-secondary)';
              }}
              onMouseLeave={e => {
                if (!isActive) (e.currentTarget as HTMLDivElement).style.color = 'var(--color-dark-gray)';
              }}
            >
              <i className={`pi ${item.icon}`} style={{ fontSize: 14, width: 16 }} />
              {!collapsed && <span>{item.label}</span>}
            </div>
          );
        })}
      </nav>

      {/* User info */}
      <div style={{
        padding: collapsed ? '16px 12px' : '16px 20px',
        borderTop: '1px solid var(--color-dark-gray)',
        fontSize: 12,
        color: '#444',
        display: 'flex',
        flexDirection: collapsed ? 'column' : 'row',
        alignItems: collapsed ? 'center' : 'flex-start',
        gap: collapsed ? 4 : 0,
        textAlign: collapsed ? 'center' : 'left',
      }}>
        <div style={{
          width: 32, height: 32,
          borderRadius: 8,
          background: 'var(--color-dark-gray)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-caramel)',
          fontWeight: 700,
          fontSize: 12,
        }}>
          {collapsed ? user?.hoten?.charAt(0).toUpperCase() || 'U' : user?.hoten?.charAt(0).toUpperCase() || 'U'}
        </div>
        {!collapsed && (
          <div>
            <div style={{ color: 'var(--color-text-secondary)', marginBottom: 2 }}>{user?.hoten}</div>
            <div style={{ fontSize: 10, color: 'var(--color-dark-gray)', letterSpacing: 1, textTransform: 'uppercase' }}>
              {user?.vaitro}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;

