import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';
import socketService from '../services/socketService';

// Simple JWT payload parser
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// Helper to check if JWT is expired
function isTokenExpired(token) {
  const decoded = parseJwt(token);
  if (!decoded || !decoded.exp) return true;
  // exp is in seconds since epoch
  return Date.now() >= decoded.exp * 1000;
}

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [userToken, setUserToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = async (token) => {
    setLoading(true);
    try {
      await AsyncStorage.setItem('userToken', token);
      setUserToken(token);
      const decoded = parseJwt(token);
      setUser({ id: decoded.userId, role: decoded.role });
      console.log('AuthContext: connecting WebSocket with token:', token.substring(0, 20) + '...');
      console.log('AuthContext: decoded token payload:', decoded);
      socketService.connect(token);
    } catch (e) {
      console.error('Failed to save token', e);
    }
    setLoading(false);
  };

  const logout = async () => {
    setLoading(true);
    try {
      await AsyncStorage.removeItem('userToken');
      setUserToken(null);
      setUser(null);
      socketService.disconnect();
    } catch (e) {
      console.error('Failed to remove token', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    const loadToken = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token && isTokenExpired(token)) {
          // Token expired, remove it
          await AsyncStorage.removeItem('userToken');
          setUserToken(null);
          setUser(null);
          socketService.disconnect();
        } else if (token) {
          setUserToken(token);
          const decoded = parseJwt(token);
          setUser({ id: decoded.userId, role: decoded.role });
          console.log('AuthContext: loaded token from storage:', token.substring(0, 20) + '...');
          console.log('AuthContext: decoded stored token payload:', decoded);
          socketService.connect(token);
        }
      } catch (e) {
        console.error('Failed to load token', e);
      }
      setLoading(false);
    };
    loadToken();
  }, []);

  return (
    <AuthContext.Provider value={{ userToken, user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
