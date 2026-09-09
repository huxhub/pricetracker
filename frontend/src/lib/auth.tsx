'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('pt_token');
    const storedUser = localStorage.getItem('pt_user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('pt_user');
      }
    }

    // Verify token with backend
    if (storedToken) {
      api.auth
        .me()
        .then((res) => {
          if (res.user) {
            setUser(res.user);
            localStorage.setItem('pt_user', JSON.stringify(res.user));
          }
        })
        .catch(() => {
          localStorage.removeItem('pt_token');
          localStorage.removeItem('pt_user');
          setUser(null);
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await api.auth.login({ email, password: pass });
    if (res.token && res.user) {
      localStorage.setItem('pt_token', res.token);
      localStorage.setItem('pt_user', JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);
    }
  };

  const register = async (name: string, email: string, pass: string) => {
    const res = await api.auth.register({ name, email, password: pass });
    if (res.token && res.user) {
      localStorage.setItem('pt_token', res.token);
      localStorage.setItem('pt_user', JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);
    }
  };

  const logout = () => {
    localStorage.removeItem('pt_token');
    localStorage.removeItem('pt_user');
    setUser(null);
    setToken(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
