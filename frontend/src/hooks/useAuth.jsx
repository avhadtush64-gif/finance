import React, { useState, useEffect, createContext, useContext } from 'react';
import { fetchApi } from '../utils/api.js';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const hashMatch = window.location.hash.match(/token=(.+)/);
      if (hashMatch) {
        localStorage.setItem('accessToken', hashMatch[1]);
        window.location.hash = '';
      }

      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const data = await fetchApi('/auth/me');
          setUser(data.user);
        } catch (err) {
          localStorage.removeItem('accessToken');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const data = await fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    localStorage.setItem('accessToken', data.accessToken);
    setUser(data.user);
    return data.user;
  };

  const register = async (name, email, password) => {
    const data = await fetchApi('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
    // Do NOT automatically log in after register. Force user to log in.
    return data.user;
  };

  const logout = async () => {
    try {
      await fetchApi('/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignore
    } finally {
      localStorage.removeItem('accessToken');
      setUser(null);
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
