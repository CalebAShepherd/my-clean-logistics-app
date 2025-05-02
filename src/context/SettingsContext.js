import React, { createContext, useState, useEffect, useContext } from 'react';
import Constants from 'expo-constants';
import { AuthContext } from './AuthContext';

const API_URL =
  Constants.manifest?.extra?.apiUrl ||
  Constants.expoConfig?.extra?.apiUrl ||
  'http://192.168.0.73:3000';

const SettingsContext = createContext({
  settings: null,
  updateSettings: async () => {},
  reloadSettings: async () => {},
});

export const SettingsProvider = ({ children }) => {
  const { userToken } = useContext(AuthContext);
  const [settings, setSettings] = useState(null);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/company-settings`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (!res.ok) throw new Error('Failed to load settings');
      const data = await res.json();
      setSettings(data);
    } catch (e) {
      console.error('Settings fetch error:', e);
    }
  };

  const updateSettings = async (newSettings) => {
    try {
      const res = await fetch(`${API_URL}/company-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify(newSettings),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error('Settings update server response:', res.status, text);
        throw new Error(`Failed to save settings: ${text || res.status}`);
      }
      const data = await res.json();
      setSettings(data);
      return data;
    } catch (e) {
      console.error('Settings update error:', e);
      throw e;
    }
  };

  useEffect(() => {
    if (userToken) {
      fetchSettings();
    }
  }, [userToken]);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, reloadSettings: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
};