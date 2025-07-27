// src/context/AuthContext.js
import { createContext, useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await axios.get('/api/auth/verify');
          setUser(res.data.user);
        } catch (err) {
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    verifyAuth();
  }, []);

 const login = async (token) => {
  localStorage.setItem('token', token);
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    // Fetch user details (including role) after login
  const res = await axios.get('/api/auth/verify');
  setUser(res.data.user);
};


  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};