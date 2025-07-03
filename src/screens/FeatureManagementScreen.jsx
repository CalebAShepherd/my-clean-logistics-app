import React, { useState, useEffect, useContext } from 'react';
import { 
  SafeAreaView, 
  ScrollView, 
  View, 
  Text, 
  StyleSheet, 
  Alert, 
  TouchableOpacity, 
  ActivityIndicator,
  Switch,
  Modal
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import { AuthContext } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import InternalHeader from '../components/InternalHeader';
import { getApiUrl } from '../utils/apiHost';

const API_URL =
  Constants.manifest?.extra?.apiUrl ||
  Constants.expoConfig?.extra?.apiUrl ||
  getApiUrl();

// Company type preset configurations
const COMPANY_PRESETS = {
  SIMPLE_3PL: {
    name: '3PL Companies',
    description: 'Third-party logistics with storage & distribution',
    icon: 'warehouse',
    color: '#34C759',
    features: {
      hasWarehouses: true,
      is3PL: true,
      // Core 3PL Operations
      enableMultiClientInventory: true,
      enableReceivingWorkflows: true,
      enablePickPackOperations: true,
      enableCrossDocking: true,
      enableYardManagement: true,
      enableWaveManagement: true,
      enableLaborManagement: true,
      enableValueAddedServices: true,
      enableReturnsManagement: true,
      // Client Services
      enableClientPortals: true,
      enableClientDashboards: true,
      enableClientReporting: true,
      enableClientOrderPortal: true,
      enableClientInventoryView: true,
      enableClientBilling: true,
      // Billing & Pricing
      enableStorageBilling: true,
      enableHandlingCharges: true,
      enableTransportationBilling: true,
      enableAccessorialCharges: true,
      enableServiceLevelBilling: true,
      enableSLATracking: true,
      // Technology & Integration
      enableBarcodeScanning: true,
      enableMobileScanning: true,
      enableAPIAccess: true,
      enableAdvancedAnalytics: true,
      enableAuditTrail: true,
      // Transportation
      useThirdPartyCarriers: true,
      enableRateQuotes: true,
      enablePickups: true,
      // Disable conflicting features
      isEcommerceFulfillment: false,
      isManufacturerWarehouse: false,
      isDistributionCenter: false,
      isRetailWarehouse: false,
      ownTransporters: false,
    }
  },
  ECOMMERCE_FULFILLMENT: {
    name: 'E-commerce Fulfillment',
    description: 'Order fulfillment with returns management',
    icon: 'cart',
    color: '#FF9500',
    features: {
      hasWarehouses: true,
      isEcommerceFulfillment: true,
      // Core E-commerce Operations
      enableReceivingWorkflows: true,
      enablePickPackOperations: true,
      enableReturnsManagement: true,
      enableWaveManagement: true,
      enableCycleCountingAdvanced: true,
      enableSlottingOptimization: true,
      enableQualityControl: true,
      enableValueAddedServices: true,
      enableKittingAssembly: true,
      enableLaborManagement: true,
      // Client Services
      enableMultiClientInventory: true,
      enableClientPortals: true,
      enableClientDashboards: true,
      enableClientReporting: true,
      enableClientOrderPortal: true,
      enableClientInventoryView: true,
      enableClientBilling: true,
      // Billing & E-commerce specific
      enableStorageBilling: true,
      enableHandlingCharges: true,
      enableServiceLevelBilling: true,
      enableUsageBasedBilling: true,
      // Technology & Integration
      enableBarcodeScanning: true,
      enableMobileScanning: true,
      enableRFIDTracking: true,
      enableAPIAccess: true,
      enableEDIIntegration: true,
      enableAdvancedAnalytics: true,
      enablePredictiveAnalytics: true,
      enableTaskAutomation: true,
      enableAuditTrail: true,
      // Transportation
      useThirdPartyCarriers: true,
      enableRateQuotes: true,
      enablePickups: true,
      // Disable conflicting features
      is3PL: false,
      isManufacturerWarehouse: false,
      isDistributionCenter: false,
      isRetailWarehouse: false,
      ownTransporters: false,
    }
  },
  MANUFACTURER_WAREHOUSE: {
    name: 'Manufacturers',
    description: 'Manufacturing warehouse with production integration',
    icon: 'factory',
    color: '#5856D6',
    features: {
      hasWarehouses: true,
      isManufacturerWarehouse: true,
      ownTransporters: true,
      // Core Manufacturing Operations
      enableReceivingWorkflows: true,
      enablePickPackOperations: true,
      enableLaborManagement: true,
      enableSlottingOptimization: true,
      enableQualityControl: true,
      enableWaveManagement: true,
      enableValueAddedServices: true,
      enableKittingAssembly: true,
      enableCycleCountingAdvanced: true,
      // Advanced Manufacturing Features
      enableAdvancedAnalytics: true,
      enablePredictiveAnalytics: true,
      enablePerformanceTracking: true,
      enableTaskAutomation: true,
      enableWorkflowOptimization: true,
      // Technology & Tracking
      enableBarcodeScanning: true,
      enableRFIDTracking: true,
      enableMobileScanning: true,
      enableIoTSensors: true,
      enableAPIAccess: true,
      // Compliance & Security
      enableAuditTrail: true,
      enableComplianceReporting: true,
      enableSecurityMonitoring: true,
      enableAccessControl: true,
      // Transportation (own fleet)
      useThirdPartyCarriers: false,
      enableRateQuotes: true,
      enablePickups: true,
      // Billing for internal tracking
      enableHandlingCharges: true,
      // Disable conflicting features
      is3PL: false,
      isEcommerceFulfillment: false,
      isDistributionCenter: false,
      isRetailWarehouse: false,
      enableMultiClientInventory: false,
      enableStorageBilling: false,
    }
  },
  DISTRIBUTION_CENTER: {
    name: 'Distributors',
    description: 'High-volume distribution with cross-docking',
    icon: 'truck-fast',
    color: '#FF3B30',
    features: {
      hasWarehouses: true,
      isDistributionCenter: true,
      // Core Distribution Operations
      enableReceivingWorkflows: true,
      enablePickPackOperations: true,
      enableCrossDocking: true,
      enableYardManagement: true,
      enableWaveManagement: true,
      enableLaborManagement: true,
      enableSlottingOptimization: true,
      enableCycleCountingAdvanced: true,
      // Advanced Distribution Features
      enableAdvancedAnalytics: true,
      enablePredictiveAnalytics: true,
      enableWorkflowOptimization: true,
      enableTaskAutomation: true,
      enablePerformanceTracking: true,
      // Technology & Integration
      enableBarcodeScanning: true,
      enableMobileScanning: true,
      enableRFIDTracking: true,
      enableAPIAccess: true,
      enableEDIIntegration: true,
      // Transportation (mixed fleet)
      ownTransporters: true,
      useThirdPartyCarriers: true,
      enableRateQuotes: true,
      enablePickups: true,
      // Billing & Pricing
      enableHandlingCharges: true,
      enableTransportationBilling: true,
      enableAccessorialCharges: true,
      // Audit & Compliance
      enableAuditTrail: true,
      enableComplianceReporting: true,
      // Some client services for B2B customers
      enableClientPortals: true,
      enableClientDashboards: true,
      enableClientReporting: true,
      // Disable conflicting features
      is3PL: false,
      isEcommerceFulfillment: false,
      isManufacturerWarehouse: false,
      isRetailWarehouse: false,
      enableMultiClientInventory: false,
      enableStorageBilling: false,
    }
  },
  RETAIL_WAREHOUSE: {
    name: 'Retailers',
    description: 'Retail distribution with store replenishment',
    icon: 'store',
    color: '#AF52DE',
    features: {
      hasWarehouses: true,
      isRetailWarehouse: true,
      // Core Retail Operations
      enableReceivingWorkflows: true,
      enablePickPackOperations: true,
      enableSlottingOptimization: true,
      enableCycleCountingAdvanced: true,
      enableWaveManagement: true,
      enableLaborManagement: true,
      enableReturnsManagement: true,
      enableValueAddedServices: true,
      enableKittingAssembly: true,
      // Analytics & Performance
      enableAdvancedAnalytics: true,
      enablePredictiveAnalytics: true,
      enablePerformanceTracking: true,
      enableWorkflowOptimization: true,
      // Technology & Scanning
      enableBarcodeScanning: true,
      enableMobileScanning: true,
      enableRFIDTracking: true,
      enableAPIAccess: true,
      // Transportation (own fleet for store delivery)
      ownTransporters: true,
      useThirdPartyCarriers: false,
      enableRateQuotes: true,
      enablePickups: true,
      // Inventory Management
      enableQualityControl: true,
      enableTaskAutomation: true,
      // Billing for internal cost tracking
      enableHandlingCharges: true,
      enableTransportationBilling: true,
      // Audit & Compliance
      enableAuditTrail: true,
      enableComplianceReporting: true,
      // Disable conflicting features
      is3PL: false,
      isEcommerceFulfillment: false,
      isManufacturerWarehouse: false,
      isDistributionCenter: false,
      enableMultiClientInventory: false,
      enableStorageBilling: false,
      enableClientPortals: false,
    }
  }
};

export default function FeatureManagementScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const { settings, updateSettings } = useSettings();
  const [profiles, setProfiles] = useState([]);
  const [featureSummary, setFeatureSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [applyingProfile, setApplyingProfile] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings || {});

  // Sync local settings when context settings change
  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  // Load profiles and feature summary
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [profilesRes, summaryRes] = await Promise.all([
          fetch(`${API_URL}/company-settings/profiles`, {
            headers: { Authorization: `Bearer ${userToken}` }
          }),
          fetch(`${API_URL}/company-settings/features`, {
            headers: { Authorization: `Bearer ${userToken}` }
          })
        ]);

        if (profilesRes.ok) {
          const profilesData = await profilesRes.json();
          setProfiles(profilesData);
        }

        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          setFeatureSummary(summaryData);
        }
      } catch (error) {
        console.error('Error loading feature data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userToken) {
      loadData();
    }
  }, [userToken]);

  const applyProfile = async (profileId) => {
    setApplyingProfile(true);
    try {
      const response = await fetch(`${API_URL}/company-settings/profiles/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ profileId }),
      });

      if (!response.ok) {
        throw new Error('Failed to apply profile');
      }

      const result = await response.json();
      Alert.alert('Success', result.message);
      setShowProfileModal(false);
      
      // Refresh settings
      await updateSettings(result.settings);
    } catch (error) {
      console.error('Error applying profile:', error);
      Alert.alert('Error', 'Failed to apply profile. Please try again.');
    } finally {
      setApplyingProfile(false);
    }
  };

  const applyPreset = (presetKey, isEnabled) => {
    const preset = COMPANY_PRESETS[presetKey];
    if (!preset) return;

    if (isEnabled) {
      // Complete reset of ALL feature flags to default/false state
      const resetAllFeatures = {
        // Core settings
        hasWarehouses: false,
        ownTransporters: false,
        useThirdPartyCarriers: false,
        enableTrackingInput: true, // Keep core operational features
        enableAddressValidation: true,
        enableRateQuotes: false,
        enablePickups: false,
        enableNotifications: true, // Keep core system features
        enableDevTools: false,
        enableWarehouseHeatmap: false,
        
        // Warehouse Management Features
        enableReceivingWorkflows: false,
        enablePickPackOperations: false,
        enableCrossDocking: false,
        enableCycleCountingAdvanced: false,
        enableSlottingOptimization: false,
        enableYardManagement: false,
        enableLaborManagement: false,
        enableReturnsManagement: false,
        enableValueAddedServices: false,
        enableQualityControl: false,
        enableKittingAssembly: false,
        enableWaveManagement: false,
        
        // Advanced Features
        enableAdvancedAnalytics: false,
        enablePredictiveAnalytics: false,
        enableTaskAutomation: false,
        enableExceptionHandling: false,
        enablePerformanceTracking: false,
        enableWorkflowOptimization: false,
        
        // Business Model Flags
        is3PL: false,
        isEcommerceFulfillment: false,
        isManufacturerWarehouse: false,
        isDistributionCenter: false,
        isRetailWarehouse: false,
        isColdStorage: false,
        isHazmatFacility: false,
        isCustomsWarehouse: false,
        
        // Billing & Service Flags
        enableStorageBilling: false,
        enableHandlingCharges: false,
        enableTransportationBilling: false,
        enableAccessorialCharges: false,
        enableClientPortals: false,
        enableMultiClientInventory: false,
        enableSLATracking: false,
        enableServiceLevelBilling: false,
        enableUsageBasedBilling: false,
        enableContractManagement: false,
        
        // Integration Flags
        enableEDIIntegration: false,
        enableAPIAccess: false,
        enableBarcodeScanning: false,
        enableRFIDTracking: false,
        enableVoicePicking: false,
        enableMobileScanning: false,
        enableIoTSensors: false,
        enableAutomatedSorting: false,
        enableRoboticIntegration: false,
        
        // Client/Customer Features
        enableClientDashboards: false,
        enableClientReporting: false,
        enableClientNotifications: false,
        enableClientDocuments: false,
        enableClientOrderPortal: false,
        enableClientInventoryView: false,
        enableClientBilling: false,
        
        // Compliance & Security
        enableAuditTrail: false,
        enableComplianceReporting: false,
        enableSecurityMonitoring: false,
        enableAccessControl: false,
        enableDataEncryption: false,
        enableGDPRCompliance: false,
        enableSOXCompliance: false,
      };

      // Apply the complete reset first, then overlay the preset features
      setLocalSettings(prev => ({
        ...prev,
        ...resetAllFeatures,
        ...preset.features
      }));
    } else {
      // When disabling, reset all the features that were enabled by this preset
      const resetFeatures = {};
      
      // Set all preset features to false
      Object.keys(preset.features).forEach(key => {
        resetFeatures[key] = false;
      });

      setLocalSettings(prev => ({
        ...prev,
        ...resetFeatures
      }));
    }
  };

  const isPresetActive = (presetKey) => {
    const preset = COMPANY_PRESETS[presetKey];
    if (!preset) return false;

    // Check for the specific business type flag for each preset
    const businessTypeMap = {
      'SIMPLE_3PL': 'is3PL',
      'ECOMMERCE_FULFILLMENT': 'isEcommerceFulfillment', 
      'MANUFACTURER_WAREHOUSE': 'isManufacturerWarehouse',
      'DISTRIBUTION_CENTER': 'isDistributionCenter',
      'RETAIL_WAREHOUSE': 'isRetailWarehouse'
    };

    const mainFeature = businessTypeMap[presetKey];
    return mainFeature ? localSettings[mainFeature] === true : false;
  };

  const updateFeature = (key, value) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveFeatures = async () => {
    try {
      await updateSettings(localSettings);
      Alert.alert('Success', 'Feature settings saved successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    }
  };

  const renderPresetSwitch = (presetKey) => {
    const preset = COMPANY_PRESETS[presetKey];
    const isActive = isPresetActive(presetKey);

    return (
      <View style={styles.presetCard} key={presetKey}>
        <View style={styles.presetContent}>
          <View style={[styles.presetIcon, { backgroundColor: `${preset.color}20` }]}>
            <MaterialCommunityIcons name={preset.icon} size={24} color={preset.color} />
          </View>
          <View style={styles.presetInfo}>
            <Text style={styles.presetTitle}>{preset.name}</Text>
            <Text style={styles.presetDescription}>{preset.description}</Text>
          </View>
          <Switch
            value={isActive}
            onValueChange={(value) => applyPreset(presetKey, value)}
            trackColor={{ false: '#E1E5E9', true: `${preset.color}30` }}
            thumbColor={isActive ? preset.color : '#8E8E93'}
            ios_backgroundColor="#E1E5E9"
          />
        </View>
      </View>
    );
  };

  const renderFeatureToggle = (title, subtitle, key, icon, iconColor = '#007AFF') => (
    <View style={styles.featureCard} key={key}>
      <View style={styles.featureContent}>
        <View style={styles.featureIcon}>
          <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
        </View>
        <View style={styles.featureInfo}>
          <Text style={styles.featureTitle}>{title}</Text>
          {subtitle && <Text style={styles.featureSubtitle}>{subtitle}</Text>}
        </View>
        <Switch
          value={localSettings[key] || false}
          onValueChange={(value) => updateFeature(key, value)}
          trackColor={{ false: '#E1E5E9', true: '#007AFF30' }}
          thumbColor={localSettings[key] ? '#007AFF' : '#8E8E93'}
          ios_backgroundColor="#E1E5E9"
        />
      </View>
    </View>
  );

  const renderFeatureSection = (title, features, icon, color) => (
    <View style={styles.section} key={title}>
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons name={icon} size={24} color={color} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {features.map(feature => renderFeatureToggle(...feature))}
    </View>
  );

  const businessModelFeatures = [
    ['3PL Services', 'Third-party logistics provider', 'is3PL', 'warehouse', '#34C759'],
    ['E-commerce Fulfillment', 'Online order fulfillment', 'isEcommerceFulfillment', 'cart', '#FF9500'],
    ['Manufacturer Warehouse', 'Manufacturing facility', 'isManufacturerWarehouse', 'factory', '#5856D6'],
    ['Distribution Center', 'High-volume distribution', 'isDistributionCenter', 'truck-fast', '#FF3B30'],
    ['Retail Warehouse', 'Store replenishment', 'isRetailWarehouse', 'store', '#AF52DE'],
    ['Cold Storage', 'Temperature-controlled', 'isColdStorage', 'snowflake', '#00C7BE'],
    ['Hazmat Facility', 'Hazardous materials', 'isHazmatFacility', 'biohazard', '#FF6B35'],
  ];

  const warehouseFeatures = [
    ['Receiving Workflows', 'Automated receiving processes', 'enableReceivingWorkflows', 'truck-delivery', '#34C759'],
    ['Pick & Pack Operations', 'Order fulfillment workflows', 'enablePickPackOperations', 'package-variant', '#FF9500'],
    ['Cross Docking', 'Direct transfer operations', 'enableCrossDocking', 'swap-horizontal', '#5856D6'],
    ['Returns Management', 'RMA and returns processing', 'enableReturnsManagement', 'backup-restore', '#FF3B30'],
    ['Yard Management', 'Trailer and gate management', 'enableYardManagement', 'gate', '#AF52DE'],
    ['Labor Management', 'Workforce optimization', 'enableLaborManagement', 'account-group', '#00C7BE'],
    ['Quality Control', 'Inspection workflows', 'enableQualityControl', 'shield-check', '#FF6B35'],
    ['Wave Management', 'Batch processing', 'enableWaveManagement', 'waves', '#007AFF'],
    ['Cycle Counting', 'Inventory accuracy management', 'enableCycleCountingAdvanced', 'clipboard-check', '#FF9500'],
    ['Value Added Services', 'Kitting and assembly', 'enableValueAddedServices', 'tools', '#34C759'],
    ['Slotting Optimization', 'Location optimization', 'enableSlottingOptimization', 'grid', '#FF9500'],
  ];

  const clientFeatures = [
    ['Multi-Client Inventory', 'Segregated client inventory', 'enableMultiClientInventory', 'account-multiple', '#34C759'],
    ['Client Portals', 'Customer access portals', 'enableClientPortals', 'web', '#FF9500'],
    ['Client Dashboards', 'Customer dashboards', 'enableClientDashboards', 'view-dashboard', '#5856D6'],
    ['Client Reporting', 'Customer reports', 'enableClientReporting', 'chart-box', '#FF3B30'],
    ['Client Order Portal', 'Online ordering', 'enableClientOrderPortal', 'cart-plus', '#AF52DE'],
    ['Client Inventory View', 'Real-time inventory access', 'enableClientInventoryView', 'eye', '#00C7BE'],
  ];

  const billingFeatures = [
    ['Storage Billing', 'Storage charges', 'enableStorageBilling', 'currency-usd', '#34C759'],
    ['Handling Charges', 'Labor and handling', 'enableHandlingCharges', 'hand-coin', '#FF9500'],
    ['Transportation Billing', 'Shipping charges', 'enableTransportationBilling', 'truck-delivery', '#5856D6'],
    ['Accessorial Charges', 'Additional services', 'enableAccessorialCharges', 'plus-circle', '#FF3B30'],
    ['Service Level Billing', 'Tiered pricing', 'enableServiceLevelBilling', 'star-circle', '#AF52DE'],
    ['Usage Based Billing', 'Pay-per-use pricing', 'enableUsageBasedBilling', 'calculator', '#00C7BE'],
  ];

  const integrationFeatures = [
    ['EDI Integration', 'Electronic data interchange', 'enableEDIIntegration', 'swap-vertical', '#34C759'],
    ['API Access', 'Third-party integrations', 'enableAPIAccess', 'api', '#FF9500'],
    ['Barcode Scanning', 'Barcode readers', 'enableBarcodeScanning', 'barcode-scan', '#5856D6'],
    ['RFID Tracking', 'Radio frequency tracking', 'enableRFIDTracking', 'radio', '#FF3B30'],
    ['Voice Picking', 'Voice-directed picking', 'enableVoicePicking', 'microphone', '#AF52DE'],
    ['Mobile Scanning', 'Mobile device scanning', 'enableMobileScanning', 'cellphone-link', '#00C7BE'],
    ['IoT Sensors', 'Internet of Things', 'enableIoTSensors', 'radio-tower', '#FF6B35'],
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Feature Management" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading features...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Feature Management" />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <MaterialCommunityIcons name="tune" size={32} color="#007AFF" />
          <Text style={styles.headerTitle}>Feature Management</Text>
          <Text style={styles.headerSubtitle}>
            Configure your platform capabilities and business features
          </Text>
        </View>

        {/* Company Type Presets */}
        <View style={styles.presetsCard}>
          <View style={styles.presetsHeader}>
            <MaterialCommunityIcons name="lightning-bolt" size={24} color="#007AFF" />
            <Text style={styles.presetsTitle}>Company Type Presets</Text>
          </View>
          <Text style={styles.presetsSubtitle}>
            Choose your business type to automatically configure relevant features
          </Text>
          
          {Object.keys(COMPANY_PRESETS).map(presetKey => renderPresetSwitch(presetKey))}
        </View>

        {/* Quick Setup Section */}
        <View style={styles.quickSetupCard}>
          <View style={styles.quickSetupHeader}>
            <MaterialCommunityIcons name="rocket-launch" size={24} color="#FF9500" />
            <Text style={styles.quickSetupTitle}>Advanced Profiles</Text>
          </View>
          <Text style={styles.quickSetupSubtitle}>
            Apply specialized business profiles with advanced configurations
          </Text>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => setShowProfileModal(true)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#FF9500', '#FF8C00']}
              style={styles.profileButtonGradient}
            >
              <MaterialCommunityIcons name="cog" size={20} color="white" />
              <Text style={styles.profileButtonText}>Browse All Profiles</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Current Business Model */}
        {featureSummary && (
          <View style={styles.currentModelCard}>
            <View style={styles.currentModelHeader}>
              <MaterialCommunityIcons name="domain" size={24} color="#34C759" />
              <Text style={styles.currentModelTitle}>Current Business Model</Text>
            </View>
            <Text style={styles.currentModelType}>{featureSummary.businessModel.type}</Text>
            <View style={styles.modelFeatures}>
              <View style={styles.modelFeature}>
                <MaterialCommunityIcons 
                  name={featureSummary.businessModel.hasWarehouses ? 'check-circle' : 'close-circle'} 
                  size={16} 
                  color={featureSummary.businessModel.hasWarehouses ? '#34C759' : '#8E8E93'} 
                />
                <Text style={styles.modelFeatureText}>Warehouses</Text>
              </View>
              <View style={styles.modelFeature}>
                <MaterialCommunityIcons 
                  name={featureSummary.businessModel.ownTransporters ? 'check-circle' : 'close-circle'} 
                  size={16} 
                  color={featureSummary.businessModel.ownTransporters ? '#34C759' : '#8E8E93'} 
                />
                <Text style={styles.modelFeatureText}>Own Fleet</Text>
              </View>
              <View style={styles.modelFeature}>
                <MaterialCommunityIcons 
                  name={featureSummary.businessModel.useThirdPartyCarriers ? 'check-circle' : 'close-circle'} 
                  size={16} 
                  color={featureSummary.businessModel.useThirdPartyCarriers ? '#34C759' : '#8E8E93'} 
                />
                <Text style={styles.modelFeatureText}>3rd Party Carriers</Text>
              </View>
            </View>
          </View>
        )}

        {/* Manual Configuration Section */}
        <View style={styles.manualConfigSection}>
          <View style={styles.manualConfigHeader}>
            <MaterialCommunityIcons name="tune" size={24} color="#8E8E93" />
            <Text style={styles.manualConfigTitle}>Manual Configuration</Text>
          </View>
          <Text style={styles.manualConfigSubtitle}>
            Fine-tune individual features regardless of your preset selection
          </Text>
        </View>

        {/* Feature Sections */}
        {renderFeatureSection('Business Model', businessModelFeatures, 'domain', '#007AFF')}
        {renderFeatureSection('Warehouse Operations', warehouseFeatures, 'warehouse', '#34C759')}
        {renderFeatureSection('Client Services', clientFeatures, 'account-group', '#FF9500')}
        {renderFeatureSection('Billing & Pricing', billingFeatures, 'currency-usd', '#5856D6')}
        {renderFeatureSection('Integrations', integrationFeatures, 'api', '#FF3B30')}

        {/* Save Button */}
        <View style={styles.saveContainer}>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={saveFeatures}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#34C759', '#30D158']}
              style={styles.saveGradient}
            >
              <MaterialCommunityIcons name="content-save" size={20} color="white" />
              <Text style={styles.saveText}>Save Feature Settings</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Profile Selection Modal */}
      <Modal
        visible={showProfileModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowProfileModal(false)}
              style={styles.modalCloseButton}
            >
              <MaterialCommunityIcons name="close" size={24} color="#8E8E93" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Choose Business Profile</Text>
            <View style={styles.modalCloseButton} />
          </View>
          
          <ScrollView style={styles.modalContent}>
            {profiles.map((profile) => (
              <TouchableOpacity
                key={profile.id}
                style={styles.profileCard}
                onPress={() => {
                  Alert.alert(
                    'Apply Profile',
                    `Apply "${profile.name}" profile? This will update your feature settings.`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Apply', onPress: () => applyProfile(profile.id) }
                    ]
                  );
                }}
                activeOpacity={0.7}
                disabled={applyingProfile}
              >
                <Text style={styles.profileName}>{profile.name}</Text>
                <Text style={styles.profileDescription}>{profile.description}</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#C7C7CC" />
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          {applyingProfile && (
            <View style={styles.applyingOverlay}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.applyingText}>Applying profile...</Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  
  // Header
  headerSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 12,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Company Type Presets Card
  presetsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  presetsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  presetsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 8,
  },
  presetsSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    marginBottom: 16,
  },
  
  // Preset Switch Card
  presetCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E1E5E9',
  },
  presetContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  presetIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  presetInfo: {
    flex: 1,
  },
  presetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  presetDescription: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
  },

  // Quick Setup Card
  quickSetupCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  quickSetupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickSetupTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 8,
  },
  quickSetupSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    marginBottom: 16,
  },
  profileButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  profileButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  profileButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },

  // Manual Configuration Section
  manualConfigSection: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginHorizontal: -20,
    marginBottom: 20,
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E1E5E9',
  },
  manualConfigHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  manualConfigTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 8,
  },
  manualConfigSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },

  // Current Model Card
  currentModelCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  currentModelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  currentModelTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 8,
  },
  currentModelType: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 12,
  },
  modelFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  modelFeature: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modelFeatureText: {
    fontSize: 14,
    color: '#1C1C1E',
    marginLeft: 6,
  },

  // Feature Sections
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 8,
  },
  featureCard: {
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
  featureContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureInfo: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  featureSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
  },

  // Save Button
  saveContainer: {
    marginTop: 20,
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E5E9',
    backgroundColor: 'white',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
    marginBottom: 4,
  },
  profileDescription: {
    fontSize: 14,
    color: '#8E8E93',
    flex: 2,
    marginRight: 12,
  },
  applyingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyingText: {
    fontSize: 16,
    color: 'white',
    marginTop: 12,
    fontWeight: '500',
  },
}); 