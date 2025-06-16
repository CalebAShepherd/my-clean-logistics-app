/**
 * Pre-configured company settings profiles for different business types.
 * These templates can be used to quickly configure new deployments.
 */

const BASE_SETTINGS = {
  // Core settings all businesses need
  enableNotifications: true,
  enableTrackingInput: true,
  enableAddressValidation: true,
  enableDevTools: false,
  primaryColor: '#007AFF',
  secondaryColor: '#FFFFFF',
  accentColor: '#FFAA00',
};

const COMPANY_PROFILES = {
  // Simple 3PL Storage & Distribution
  SIMPLE_3PL: {
    name: '3PL Storage & Distribution',
    description: 'Basic third-party logistics with storage and distribution services',
    settings: {
      ...BASE_SETTINGS,
      hasWarehouses: true,
      is3PL: true,
      enableMultiClientInventory: true,
      enableStorageBilling: true,
      enableClientPortals: true,
      enableYardManagement: true,
      enableClientDashboards: true,
      enableClientReporting: true,
      enableReceivingWorkflows: true,
      enableCrossDocking: true,
      enableSLATracking: true,
      useThirdPartyCarriers: true,
      enableRateQuotes: true,
      enablePickups: true,
    }
  },

  // E-commerce Fulfillment Center
  ECOMMERCE_FULFILLMENT: {
    name: 'E-commerce Fulfillment Center',
    description: 'Complete e-commerce order fulfillment with returns management',
    settings: {
      ...BASE_SETTINGS,
      hasWarehouses: true,
      isEcommerceFulfillment: true,
      enablePickPackOperations: true,
      enableReturnsManagement: true,
      enableCycleCountingAdvanced: true,
      enableSlottingOptimization: true,
      enableMultiClientInventory: true,
      enableValueAddedServices: true,
      enableKittingAssembly: true,
      enableWaveManagement: true,
      enableQualityControl: true,
      enableAdvancedAnalytics: true,
      enableClientPortals: true,
      enableClientOrderPortal: true,
      enableClientInventoryView: true,
      enableBarcodeScanning: true,
      enableMobileScanning: true,
      useThirdPartyCarriers: true,
    }
  },

  // Manufacturer Warehouse
  MANUFACTURER_WAREHOUSE: {
    name: 'Manufacturer Warehouse',
    description: 'Manufacturing warehouse with production integration',
    settings: {
      ...BASE_SETTINGS,
      hasWarehouses: true,
      isManufacturerWarehouse: true,
      ownTransporters: true,
      enableReceivingWorkflows: true,
      enableLaborManagement: true,
      enableSlottingOptimization: true,
      enableCycleCountingAdvanced: true,
      enableQualityControl: true,
      enableAdvancedAnalytics: true,
      enablePerformanceTracking: true,
      enableTaskAutomation: true,
      enableBarcodeScanning: true,
      enableRFIDTracking: true,
      enableAuditTrail: true,
      enableComplianceReporting: true,
      useThirdPartyCarriers: false,
    }
  },

  // Distribution Center
  DISTRIBUTION_CENTER: {
    name: 'Distribution Center',
    description: 'High-volume distribution with cross-docking capabilities',
    settings: {
      ...BASE_SETTINGS,
      hasWarehouses: true,
      isDistributionCenter: true,
      enableCrossDocking: true,
      enableYardManagement: true,
      enableWaveManagement: true,
      enableLaborManagement: true,
      enableCycleCountingAdvanced: true,
      enableAdvancedAnalytics: true,
      enableWorkflowOptimization: true,
      enableTaskAutomation: true,
      enablePerformanceTracking: true,
      enableBarcodeScanning: true,
      enableMobileScanning: true,
      ownTransporters: true,
      useThirdPartyCarriers: true,
      enableRateQuotes: true,
    }
  },

  // Retail Warehouse
  RETAIL_WAREHOUSE: {
    name: 'Retail Warehouse',
    description: 'Retail distribution with store replenishment focus',
    settings: {
      ...BASE_SETTINGS,
      hasWarehouses: true,
      isRetailWarehouse: true,
      enableReceivingWorkflows: true,
      enablePickPackOperations: true,
      enableSlottingOptimization: true,
      enableCycleCountingAdvanced: true,
      enableWaveManagement: true,
      enableAdvancedAnalytics: true,
      enableBarcodeScanning: true,
      enableMobileScanning: true,
      ownTransporters: true,
      useThirdPartyCarriers: false,
    }
  },

  // Cold Storage Facility
  COLD_STORAGE: {
    name: 'Cold Storage Facility',
    description: 'Temperature-controlled storage with compliance tracking',
    settings: {
      ...BASE_SETTINGS,
      hasWarehouses: true,
      isColdStorage: true,
      is3PL: true,
      enableMultiClientInventory: true,
      enableStorageBilling: true,
      enableReceivingWorkflows: true,
      enableQualityControl: true,
      enableComplianceReporting: true,
      enableAuditTrail: true,
      enableIoTSensors: true,
      enableClientPortals: true,
      enableClientDashboards: true,
      enableSLATracking: true,
      useThirdPartyCarriers: true,
    }
  },

  // Hazmat Facility
  HAZMAT_FACILITY: {
    name: 'Hazmat Storage Facility',
    description: 'Hazardous materials storage with strict compliance',
    settings: {
      ...BASE_SETTINGS,
      hasWarehouses: true,
      isHazmatFacility: true,
      is3PL: true,
      enableMultiClientInventory: true,
      enableStorageBilling: true,
      enableReceivingWorkflows: true,
      enableQualityControl: true,
      enableComplianceReporting: true,
      enableAuditTrail: true,
      enableSecurityMonitoring: true,
      enableAccessControl: true,
      enableClientPortals: true,
      enableSLATracking: true,
      enableDataEncryption: true,
      useThirdPartyCarriers: true,
    }
  },

  // Advanced 3PL with Full Services
  ADVANCED_3PL: {
    name: 'Advanced 3PL Provider',
    description: 'Full-service 3PL with advanced capabilities and multiple service lines',
    settings: {
      ...BASE_SETTINGS,
      hasWarehouses: true,
      is3PL: true,
      isEcommerceFulfillment: true,
      enableMultiClientInventory: true,
      enableStorageBilling: true,
      enableHandlingCharges: true,
      enableTransportationBilling: true,
      enableAccessorialCharges: true,
      enableServiceLevelBilling: true,
      enableUsageBasedBilling: true,
      enableContractManagement: true,
      enableClientPortals: true,
      enableClientDashboards: true,
      enableClientReporting: true,
      enableClientOrderPortal: true,
      enableClientInventoryView: true,
      enableClientBilling: true,
      enableReceivingWorkflows: true,
      enablePickPackOperations: true,
      enableCrossDocking: true,
      enableReturnsManagement: true,
      enableValueAddedServices: true,
      enableKittingAssembly: true,
      enableWaveManagement: true,
      enableYardManagement: true,
      enableLaborManagement: true,
      enableCycleCountingAdvanced: true,
      enableQualityControl: true,
      enableAdvancedAnalytics: true,
      enablePredictiveAnalytics: true,
      enableTaskAutomation: true,
      enableExceptionHandling: true,
      enablePerformanceTracking: true,
      enableWorkflowOptimization: true,
      enableSLATracking: true,
      enableEDIIntegration: true,
      enableAPIAccess: true,
      enableBarcodeScanning: true,
      enableRFIDTracking: true,
      enableVoicePicking: true,
      enableMobileScanning: true,
      enableIoTSensors: true,
      enableAuditTrail: true,
      enableComplianceReporting: true,
      ownTransporters: true,
      useThirdPartyCarriers: true,
      enableRateQuotes: true,
      enablePickups: true,
    }
  },

  // Basic Transportation Only
  TRANSPORTATION_ONLY: {
    name: 'Transportation Provider',
    description: 'Transportation and logistics without warehousing',
    settings: {
      ...BASE_SETTINGS,
      hasWarehouses: false,
      ownTransporters: true,
      useThirdPartyCarriers: true,
      enableRateQuotes: true,
      enablePickups: true,
      enableYardManagement: true,
      enableAdvancedAnalytics: true,
      enableClientPortals: true,
      enableClientDashboards: true,
      enableMobileScanning: true,
      enableAPIAccess: true,
    }
  },

  // Custom/Configurable (Default)
  CUSTOM: {
    name: 'Custom Configuration',
    description: 'Start with basic settings and customize as needed',
    settings: {
      ...BASE_SETTINGS,
      hasWarehouses: false,
      useThirdPartyCarriers: true,
    }
  }
};

module.exports = {
  COMPANY_PROFILES,
  BASE_SETTINGS,
  
  /**
   * Get all available profiles
   */
  getAllProfiles: () => {
    return Object.keys(COMPANY_PROFILES).map(key => ({
      id: key,
      ...COMPANY_PROFILES[key]
    }));
  },

  /**
   * Get a specific profile by ID
   */
  getProfile: (profileId) => {
    return COMPANY_PROFILES[profileId] || COMPANY_PROFILES.CUSTOM;
  },

  /**
   * Apply a profile to existing settings (merge with existing)
   */
  applyProfile: (profileId, existingSettings = {}) => {
    const profile = COMPANY_PROFILES[profileId];
    if (!profile) return existingSettings;
    
    return {
      ...existingSettings,
      ...profile.settings,
      // Preserve certain fields that shouldn't be overwritten
      id: existingSettings.id,
      createdAt: existingSettings.createdAt,
      updatedAt: new Date(),
      // Preserve custom branding unless it's being reset
      companyName: existingSettings.companyName || profile.settings.companyName,
      logoUrl: existingSettings.logoUrl || profile.settings.logoUrl,
      customDomain: existingSettings.customDomain || profile.settings.customDomain,
      googleApiKey: existingSettings.googleApiKey || profile.settings.googleApiKey,
    };
  }
}; 