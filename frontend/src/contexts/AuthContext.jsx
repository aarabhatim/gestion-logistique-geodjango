import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // loading while checking stored token

  // Inject JWT token — skip auth endpoints to avoid sending an expired token
  // to the login/register route (which would trigger a 401 from JWTAuthentication
  // before AllowAny even runs).
  useEffect(() => {
    const NO_AUTH_URLS = ['auth/login/', 'auth/register/', 'auth/token/refresh/'];
    const interceptor = api.interceptors.request.use((config) => {
      const isAuthEndpoint = NO_AUTH_URLS.some(u => config.url?.includes(u));
      if (!isAuthEndpoint) {
        const token = localStorage.getItem('access_token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
    return () => api.interceptors.request.eject(interceptor);
  }, []);

  // Auto-refresh on 401 errors
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const original = error.config;
        if (error.response?.status === 401 && !original._retry) {
          original._retry = true;
          try {
            const refresh = localStorage.getItem('refresh_token');
            const res = await api.post('auth/token/refresh/', { refresh });
            localStorage.setItem('access_token', res.data.access);
            original.headers.Authorization = `Bearer ${res.data.access}`;
            return api(original);
          } catch {
            logout();
          }
        }
        return Promise.reject(error);
      }
    );
    return () => api.interceptors.response.eject(interceptor);
  }, []);

  const fetchMe = useCallback(async () => {
    try {
      const res = await api.get('auth/me/');
      setUser(res.data);
    } catch {
      setUser(null);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    } finally {
      setLoading(false);
    }
  }, []);

  // On mount, check if there's a stored token
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      fetchMe();
    } else {
      setLoading(false);
    }
  }, [fetchMe]);

  const login = async (username, password) => {
    const res = await api.post('auth/login/', { username, password });
    localStorage.setItem('access_token', res.data.access);
    localStorage.setItem('refresh_token', res.data.refresh);
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (data) => {
    const res = await api.post('auth/register/', data);
    localStorage.setItem('access_token', res.data.access);
    localStorage.setItem('refresh_token', res.data.refresh);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = async () => {
    try {
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) await api.post('auth/logout/', { refresh });
    } catch { /* ignore */ }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  const isAdmin = () => user?.role === 'ADMIN';
  const isClient = () => user?.role === 'CLIENT';
  const isChauffeur = () => user?.role === 'TRANSPORTEUR';

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAdmin, isClient, isChauffeur }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export default AuthContext;
