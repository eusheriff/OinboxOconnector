import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { User } from '@shared/types';
import LoginPage from '../components/Auth/LoginPage';
import RegisterPage from '../components/Auth/RegisterPage';
import LandingPage from '../components/Landing/LandingPage';
import { apiService } from '../services/apiService';
import { authStorage } from '../lib/authStorage';

interface PublicRoutesProps {
  user: User | null;
  setUser: (u: User | null) => void;
}

const isSuperAdmin = (user: User | null): boolean => {
  if (!user || !user.role) return false;
  const role = user.role.toLowerCase();
  return role === 'superadmin' || role === 'super_admin';
};

export const PublicRoutes: React.FC<PublicRoutesProps> = ({ user, setUser }) => {
  const handleAuthLogin = async (email: string, pass: string) => {
    try {
      const data = await apiService.login(email, pass);
      if (data && typeof data === 'object') {
        const responseData = data as { user: User; token?: string; tenantId?: string };
        if (responseData.user) {
          if (responseData.token) {
            authStorage.setToken(responseData.token);
          }
          if (responseData.tenantId) {
            authStorage.setTenantId(responseData.tenantId);
          }
          setUser(responseData.user);
          authStorage.setUser(responseData.user);
        }
      }
    } catch (error) {
      throw error;
    }
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          <LandingPage
            onNavigateLogin={() => (window.location.href = '/login')}
            onNavigateRegister={(planName) => {
              const url = planName ? `/register?plan=${encodeURIComponent(planName)}` : '/register';
              window.location.href = url;
            }}
          />
        }
      />
      <Route
        path="/login"
        element={
          user ? (
            isSuperAdmin(user) ? (
              <Navigate to="/admin" />
            ) : (
              <Navigate to="/app" />
            )
          ) : (
            <LoginPage
              onLogin={handleAuthLogin}
              onBack={() => (window.location.href = '/')}
              onRegisterClick={() => (window.location.href = '/register')}
            />
          )
        }
      />
      <Route
        path="/register"
        element={
          user ? (
            <Navigate to="/app" />
          ) : (
            <RegisterPage onSwitchToLogin={() => (window.location.href = '/login')} />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};
