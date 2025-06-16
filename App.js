import 'react-native-gesture-handler';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { SettingsProvider } from './src/context/SettingsContext';
import { CompanyBrandingProvider } from './src/context/CompanyBrandingContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

export default function App() {
  return (
    <CompanyBrandingProvider>
      <AuthProvider>
        <SettingsProvider>
          <ThemeProvider>
            <AppContent />
          </ThemeProvider>
        </SettingsProvider>
      </AuthProvider>
    </CompanyBrandingProvider>
  );
}

function AppContent() {
  const theme = useTheme();
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <NavigationContainer theme={theme}>
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}