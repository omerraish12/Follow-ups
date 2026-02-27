import api from './api';
import { normalizeRole } from '@/lib/roles';

export const authService = {
  // Login
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
      if (response.data.user) {
        const normalizedUser = {
          ...response.data.user,
          role: normalizeRole(response.data.user.role),
        };
        localStorage.setItem('user', JSON.stringify(normalizedUser));
        response.data.user = normalizedUser;
      }
    }
    return response.data;
  },

  // Signup
  signup: async (userData) => {
    const response = await api.post('/auth/signup', userData);
    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
      if (response.data.user) {
        const normalizedUser = {
          ...response.data.user,
          role: normalizeRole(response.data.user.role),
        };
        localStorage.setItem('user', JSON.stringify(normalizedUser));
        response.data.user = normalizedUser;
      }
    }
    return response.data;
  },

  // Logout
  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  },

  // Get current user
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Forgot password
  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  // Reset password
  resetPassword: async (token, password) => {
    const response = await api.post('/auth/reset-password', { token, password });
    return response.data;
  }
};
