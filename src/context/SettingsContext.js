import React, { createContext, useState, useEffect, useContext } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { AuthContext } from './AuthContext';
import { getApiUrl } from '../utils/apiHost';

const API_URL = getApiUrl();

const SettingsContext = createContext({
  settings: null,
  updateSettings: async () => {},
  reloadSettings: async () => {},
});

// Global branding refresh callback to avoid circular dependencies
let brandingRefreshCallback = null;

export const setBrandingRefreshCallback = (callback) => {
  brandingRefreshCallback = callback;
};

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
      
      // Refresh company branding when settings are updated
      // This will update login/signup screens automatically
      if (brandingRefreshCallback) {
        brandingRefreshCallback();
      }
      
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