import React, { createContext, useContext, useMemo } from 'react';
import { DefaultTheme } from '@react-navigation/native';
import { useSettings } from './SettingsContext';

const ThemeContext = createContext(DefaultTheme);

export const ThemeProvider = ({ children }) => {
  const { settings } = useSettings();
  const theme = useMemo(() => ({
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: settings?.primaryColor || DefaultTheme.colors.primary,
      background: settings?.secondaryColor || DefaultTheme.colors.background,
      card: settings?.accentColor || DefaultTheme.colors.card,
    },
  }), [settings]);
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}; 