// src/components/ShiftGuard.tsx
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const ShiftGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [checking, setChecking]   = useState(true);
  const [coDangMo, setCoDangMo]   = useState(false);

  useEffect(() => {
    if (user?.vaitro !== 'thungan') {
      setChecking(false);
      setCoDangMo(true);
      return;
    }
    checkCa();
  }, [user]);

  const checkCa = async () => {
    try {
      const res = await api.getActiveShift();
      setCoDangMo(!!res.data.data);
    } catch {
      setCoDangMo(false);
    } finally { setChecking(false); }
  };

  if (checking) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--color-caramel)', fontSize: 12, letterSpacing: 2 }}>
      ĐANG KIỂM TRA CA...
    </div>
  );

  // Thu ngân chưa mở ca
  if (user?.vaitro === 'thungan' && !coDangMo) {
    return <Navigate to="/shifts" replace />;
  }

  return <>{children}</>;
};

export default ShiftGuard;
