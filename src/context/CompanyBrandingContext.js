import React, { createContext, useState, useEffect, useContext } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { setBrandingRefreshCallback } from './SettingsContext';

// Determine correct host for Android emulator vs. network development
const fallbackUrl = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://192.168.0.73:3000';
const API_URL =
  Constants.manifest?.extra?.apiUrl ||
  Constants.expoConfig?.extra?.apiUrl ||
  fallbackUrl;

const CompanyBrandingContext = createContext({
  branding: null,
  loading: false,
  error: null,
  refreshBranding: async () => {},
});

export const CompanyBrandingProvider = ({ children }) => {
  const [branding, setBranding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBranding = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch(`${API_URL}/company-settings/branding`);
      if (!res.ok) {
        throw new Error('Failed to load company branding');
      }
      
      const data = await res.json();
      setBranding(data);
    } catch (e) {
      console.error('Company branding fetch error:', e);
      setError(e.message);
      // Set default branding on error
      setBranding({
        companyName: 'Clean Logistics',
        logoUrl: null,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranding();
    
    // Register the refresh callback with SettingsContext
    setBrandingRefreshCallback(fetchBranding);
    
    // Cleanup
    return () => {
      setBrandingRefreshCallback(null);
    };
  }, []);

  const refreshBranding = () => {
    return fetchBranding();
  };

  return (
    <CompanyBrandingContext.Provider 
      value={{ 
        branding, 
        loading, 
        error, 
        refreshBranding 
      }}
    >
      {children}
    </CompanyBrandingContext.Provider>
  );
};

export const useCompanyBranding = () => {
  const context = useContext(CompanyBrandingContext);
  if (!context) {
    throw new Error('useCompanyBranding must be used within CompanyBrandingProvider');
  }
  return context;
}; 