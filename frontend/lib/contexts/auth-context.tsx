"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '@/lib/api/auth';
import { initSocket, disconnectSocket } from '@/lib/socket';

interface User {
  id: string;
  username: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: { username: string; password: string }) => Promise<void>;
  register: (data: { username: string; password: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setIsAuthenticated(true);
      // Inicializar socket cuando hay usuario autenticado
      const token = localStorage.getItem('auth_token');
      if (token) {
        initSocket(token);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async ({ username, password }: { username: string; password: string }) => {
    setIsLoading(true);
    try {
      const loggedUser = await authService.login({ username, password });
      setUser(loggedUser);
      setIsAuthenticated(true);
      // Inicializar socket después del login
      const token = localStorage.getItem('auth_token');
      if (token) {
        initSocket(token);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async ({ username, password }: { username: string; password: string }) => {
    setIsLoading(true);
    try {
      const registeredUser = await authService.register({ username, password });
      setUser(registeredUser);
      setIsAuthenticated(true);
      // Inicializar socket después del registro
      const token = localStorage.getItem('auth_token');
      if (token) {
        initSocket(token);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    disconnectSocket();
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
