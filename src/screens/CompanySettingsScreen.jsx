import React, { useEffect, useState, useContext } from 'react';
import { SafeAreaView, ScrollView, View, Text, Switch, TextInput, Image, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import { AuthContext } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import InternalHeader from '../components/InternalHeader';
import { getApiUrl } from '../utils/apiHost';

const API_URL =
  Constants.manifest?.extra?.apiUrl ||
  Constants.expoConfig?.extra?.apiUrl ||
  getApiUrl();

export default function CompanySettingsScreen({ navigation }) {
  const { userToken, user } = useContext(AuthContext);
  const { settings: contextSettings, updateSettings } = useSettings();
  const [settings, setSettings] = useState(contextSettings);
  const [saving, setSaving] = useState(false);
  const [pickingImage, setPickingImage] = useState(false);

  // Sync local state when contextSettings load
  useEffect(() => {
    if (contextSettings) setSettings(contextSettings);
  }, [contextSettings]);

  const pickLogo = async () => {
    setPickingImage(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setSettings({ ...settings, logoUrl: result.assets[0].uri });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    } finally {
      setPickingImage(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await updateSettings(settings);
      Alert.alert('Success', 'Company settings saved successfully!');
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateSettingValue = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const renderToggleCard = (title, subtitle, settingKey, icon, iconColor = '#007AFF') => (
    <View style={styles.toggleCard}>
      <View style={styles.toggleContent}>
        <View style={styles.toggleIcon}>
          <MaterialCommunityIcons name={icon} size={24} color={iconColor} />
        </View>
        <View style={styles.toggleInfo}>
          <Text style={styles.toggleTitle}>{title}</Text>
          {subtitle && <Text style={styles.toggleSubtitle}>{subtitle}</Text>}
        </View>
        <Switch
          value={settings[settingKey]}
          onValueChange={(value) => updateSettingValue(settingKey, value)}
          trackColor={{ false: '#E1E5E9', true: '#007AFF30' }}
          thumbColor={settings[settingKey] ? '#007AFF' : '#8E8E93'}
          ios_backgroundColor="#E1E5E9"
        />
      </View>
    </View>
  );

  if (!settings) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Company Settings" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading company settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Company Settings" />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.headerIcon}>
            <MaterialCommunityIcons name="office-building" size={32} color="#007AFF" />
          </View>
          <Text style={styles.headerTitle}>Company Settings</Text>
          <Text style={styles.headerSubtitle}>Configure your company profile and operational preferences</Text>
        </View>

        {/* Company Profile */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="domain" size={20} color="#007AFF" />
            <Text style={styles.cardTitle}>Company Profile</Text>
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Company Name</Text>
            <TextInput
              style={styles.input}
              value={settings.companyName || ''}
              onChangeText={(text) => updateSettingValue('companyName', text)}
              placeholder="Enter company name"
              placeholderTextColor="#8E8E93"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Company Logo</Text>
            
            <View style={styles.logoSection}>
              {settings.logoUrl ? (
                <View style={styles.logoContainer}>
                  <Image source={{ uri: settings.logoUrl }} style={styles.logo} />
                  <TouchableOpacity 
                    style={styles.logoOverlay}
                    onPress={pickLogo}
                    disabled={pickingImage}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="camera" size={24} color="white" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.logoPlaceholder}
                  onPress={pickLogo}
                  disabled={pickingImage}
                  activeOpacity={0.8}
                >
                  {pickingImage ? (
                    <ActivityIndicator size="small" color="#007AFF" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="image-plus" size={32} color="#8E8E93" />
                      <Text style={styles.logoPlaceholderText}>Add Logo</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
            
            <TouchableOpacity 
              style={styles.changeLogoButton}
              onPress={pickLogo}
              disabled={pickingImage}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="image-edit" size={16} color="#007AFF" />
              <Text style={styles.changeLogoText}>
                {pickingImage ? 'Selecting...' : 'Change Logo'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Core Features */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Core Features</Text>
          
          {renderToggleCard(
            'Warehouses',
            'Enable warehouse management features',
            'hasWarehouses',
            'warehouse',
            '#34C759'
          )}
          
          {renderToggleCard(
            'Own Transporters',
            'Manage your own fleet of vehicles',
            'ownTransporters',
            'truck',
            '#FF9500'
          )}
          
          {renderToggleCard(
            'Third-Party Carriers',
            'Use external shipping services',
            'useThirdPartyCarriers',
            'truck-delivery-outline',
            '#5856D6'
          )}
          
          {renderToggleCard(
            'Warehouse Heatmap',
            'Visual warehouse utilization tracking',
            'enableWarehouseHeatmap',
            'heat-map',
            '#FF3B30'
          )}
        </View>

        {/* Operational Features */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Operational Features</Text>
          
          {renderToggleCard(
            'Manual Tracking Entry',
            'Allow manual shipment tracking updates',
            'enableTrackingInput',
            'pencil-box',
            '#34C759'
          )}
          
          {renderToggleCard(
            'Address Validation',
            'Validate shipping addresses automatically',
            'enableAddressValidation',
            'map-marker-check',
            '#007AFF'
          )}
          
          {renderToggleCard(
            'Rate Quotes',
            'Provide shipping rate estimates',
            'enableRateQuotes',
            'calculator',
            '#FF9500'
          )}
          
          {renderToggleCard(
            'Pickup Scheduling',
            'Schedule pickup appointments',
            'enablePickups',
            'calendar-clock',
            '#5856D6'
          )}
          
          {renderToggleCard(
            'Notifications',
            'Push notifications for updates',
            'enableNotifications',
            'bell',
            '#FF3B30'
          )}
        </View>

        {/* Integration Settings */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="api" size={20} color="#5856D6" />
            <Text style={styles.cardTitle}>Integration Settings</Text>
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Google API Key</Text>
            <TextInput
              style={styles.input}
              value={settings.googleApiKey || ''}
              onChangeText={(text) => updateSettingValue('googleApiKey', text)}
              placeholder="Enter Google API Key for maps and routing"
              placeholderTextColor="#8E8E93"
              secureTextEntry
            />
            <Text style={styles.helperText}>
              Required for address validation, maps, and route optimization
            </Text>
          </View>
          
          {renderToggleCard(
            'Google Route Optimization',
            'Use Google APIs for optimal routing',
            'useGoogleRouteOptimization',
            'map-search',
            '#34C759'
          )}
        </View>

        {/* Advanced Features */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="tune" size={20} color="#5856D6" />
            <Text style={styles.cardTitle}>Advanced Configuration</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.themeButton}
            onPress={() => navigation.navigate('Feature Management')}
            activeOpacity={0.7}
          >
            <View style={styles.themeButtonContent}>
              <View style={styles.themeIcon}>
                <MaterialCommunityIcons name="cog-outline" size={24} color="#5856D6" />
              </View>
              <View style={styles.themeInfo}>
                <Text style={styles.themeTitle}>Feature Management</Text>
                <Text style={styles.themeSubtitle}>Configure platform capabilities and business features</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#C7C7CC" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Theme Customization */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="palette" size={20} color="#FF9500" />
            <Text style={styles.cardTitle}>Appearance</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.themeButton}
            onPress={() => navigation.navigate('White Label Theme')}
            activeOpacity={0.7}
          >
            <View style={styles.themeButtonContent}>
              <View style={styles.themeIcon}>
                <MaterialCommunityIcons name="brush" size={24} color="#FF9500" />
              </View>
              <View style={styles.themeInfo}>
                <Text style={styles.themeTitle}>Customize Theme</Text>
                <Text style={styles.themeSubtitle}>Personalize colors and branding</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#C7C7CC" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
            onPress={saveSettings}
            disabled={saving}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={saving ? ['#C7C7CC', '#C7C7CC'] : ['#34C759', '#30D158']}
              style={styles.saveGradient}
            >
              {saving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <MaterialCommunityIcons name="content-save" size={20} color="white" />
              )}
              <Text style={styles.saveText}>
                {saving ? 'Saving...' : 'Save Settings'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FA' 
  },
  
  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },
  
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  
  // Header Section
  headerSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  
  // Card Styles
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 8,
  },
  
  // Section Styles
  sectionContainer: {
    marginBottom: 16,
  },
  
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  
  // Form Styles
  formGroup: {
    marginBottom: 20,
  },
  
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  
  input: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E1E5E9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1C1C1E',
  },
  
  helperText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
    lineHeight: 16,
  },
  
  // Logo Section
  logoSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  
  logoContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  
  logo: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
  },
  
  logoOverlay: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E1E5E9',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  
  logoPlaceholderText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
    marginTop: 4,
  },
  
  changeLogoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E1E5E9',
  },
  
  changeLogoText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginLeft: 6,
  },
  
  // Toggle Card Styles
  toggleCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  toggleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  
  toggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  
  toggleSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 18,
  },
  
  // Theme Button
  themeButton: {
    backgroundColor: '#FFF8F0',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEDE8A',
  },
  
  themeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  
  themeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  
  themeInfo: {
    flex: 1,
  },
  
  themeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  
  themeSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  
  // Action Container
  actionContainer: {
    marginTop: 20,
  },
  
  saveButton: {
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  
  saveButtonDisabled: {
    elevation: 0,
    shadowOpacity: 0,
  },
  
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  
  saveText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});