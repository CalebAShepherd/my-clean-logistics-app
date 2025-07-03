import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { CompanyBrandingProvider } from './src/context/CompanyBrandingContext';
import { SettingsProvider } from './src/context/SettingsContext';
import { BuilderProvider } from './src/context/BuilderContext';
import AppNavigator from './src/navigation/AppNavigator';
import { navigationTheme } from './src/navigation/NavigationTheme';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CompanyBrandingProvider>
          <SettingsProvider>
            <BuilderProvider>
              <NavigationContainer theme={navigationTheme}>
                <AppNavigator />
                <StatusBar style="auto" />
              </NavigationContainer>
            </BuilderProvider>
          </SettingsProvider>
        </CompanyBrandingProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}