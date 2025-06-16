/**
 * Feature flag utilities for conditional rendering and business logic
 */

/**
 * Check if a specific feature is enabled
 * @param {Object} settings - Company settings object
 * @param {string} featureKey - Feature flag key to check
 * @returns {boolean} - Whether the feature is enabled
 */
export const isFeatureEnabled = (settings, featureKey) => {
  if (!settings) return false;
  return settings[featureKey] === true;
};

/**
 * Check if any of the provided features are enabled
 * @param {Object} settings - Company settings object
 * @param {string[]} featureKeys - Array of feature flag keys to check
 * @returns {boolean} - Whether any of the features are enabled
 */
export const isAnyFeatureEnabled = (settings, featureKeys) => {
  if (!settings || !Array.isArray(featureKeys)) return false;
  return featureKeys.some(key => settings[key] === true);
};

/**
 * Check if all of the provided features are enabled
 * @param {Object} settings - Company settings object
 * @param {string[]} featureKeys - Array of feature flag keys to check
 * @returns {boolean} - Whether all features are enabled
 */
export const areAllFeaturesEnabled = (settings, featureKeys) => {
  if (!settings || !Array.isArray(featureKeys)) return false;
  return featureKeys.every(key => settings[key] === true);
};

/**
 * Get the business model type
 * @param {Object} settings - Company settings object
 * @returns {string} - Business model type
 */
export const getBusinessModelType = (settings) => {
  if (!settings) return 'CUSTOM';
  
  if (settings.is3PL) return '3PL';
  if (settings.isEcommerceFulfillment) return 'ECOMMERCE_FULFILLMENT';
  if (settings.isManufacturerWarehouse) return 'MANUFACTURER_WAREHOUSE';
  if (settings.isDistributionCenter) return 'DISTRIBUTION_CENTER';
  if (settings.isRetailWarehouse) return 'RETAIL_WAREHOUSE';
  if (settings.isColdStorage) return 'COLD_STORAGE';
  if (settings.isHazmatFacility) return 'HAZMAT_FACILITY';
  if (settings.isCustomsWarehouse) return 'CUSTOMS_WAREHOUSE';
  
  return 'CUSTOM';
};

/**
 * Check if company has warehouses
 * @param {Object} settings - Company settings object
 * @returns {boolean} - Whether company has warehouses
 */
export const hasWarehouses = (settings) => {
  return isFeatureEnabled(settings, 'hasWarehouses');
};

/**
 * Check if company is a 3PL provider
 * @param {Object} settings - Company settings object
 * @returns {boolean} - Whether company is 3PL
 */
export const is3PLProvider = (settings) => {
  return isFeatureEnabled(settings, 'is3PL');
};

/**
 * Check if multi-client features should be available
 * @param {Object} settings - Company settings object
 * @returns {boolean} - Whether multi-client features are enabled
 */
export const isMultiClientEnabled = (settings) => {
  return isFeatureEnabled(settings, 'enableMultiClientInventory');
};

/**
 * Check if warehouse operations are enabled
 * @param {Object} settings - Company settings object
 * @returns {boolean} - Whether warehouse operations are available
 */
export const hasWarehouseOperations = (settings) => {
  return hasWarehouses(settings) && isAnyFeatureEnabled(settings, [
    'enableReceivingWorkflows',
    'enablePickPackOperations',
    'enableCrossDocking',
    'enableReturnsManagement',
    'enableYardManagement',
    'enableLaborManagement',
    'enableQualityControl',
    'enableWaveManagement'
  ]);
};

/**
 * Check if client portal features are enabled
 * @param {Object} settings - Company settings object
 * @returns {boolean} - Whether client portal features are available
 */
export const hasClientPortals = (settings) => {
  return isAnyFeatureEnabled(settings, [
    'enableClientPortals',
    'enableClientDashboards',
    'enableClientReporting',
    'enableClientOrderPortal',
    'enableClientInventoryView'
  ]);
};

/**
 * Check if billing features are enabled
 * @param {Object} settings - Company settings object
 * @returns {boolean} - Whether billing features are available
 */
export const hasBillingFeatures = (settings) => {
  return isAnyFeatureEnabled(settings, [
    'enableStorageBilling',
    'enableHandlingCharges',
    'enableTransportationBilling',
    'enableAccessorialCharges',
    'enableServiceLevelBilling',
    'enableUsageBasedBilling'
  ]);
};

/**
 * Check if advanced analytics are enabled
 * @param {Object} settings - Company settings object
 * @returns {boolean} - Whether advanced analytics are available
 */
export const hasAdvancedAnalytics = (settings) => {
  return isAnyFeatureEnabled(settings, [
    'enableAdvancedAnalytics',
    'enablePredictiveAnalytics',
    'enablePerformanceTracking',
    'enableWorkflowOptimization'
  ]);
};

/**
 * Check if integration features are enabled
 * @param {Object} settings - Company settings object
 * @returns {boolean} - Whether integration features are available
 */
export const hasIntegrations = (settings) => {
  return isAnyFeatureEnabled(settings, [
    'enableEDIIntegration',
    'enableAPIAccess',
    'enableBarcodeScanning',
    'enableRFIDTracking',
    'enableVoicePicking',
    'enableMobileScanning',
    'enableIoTSensors'
  ]);
};

/**
 * Check if compliance features are enabled
 * @param {Object} settings - Company settings object
 * @returns {boolean} - Whether compliance features are available
 */
export const hasComplianceFeatures = (settings) => {
  return isAnyFeatureEnabled(settings, [
    'enableAuditTrail',
    'enableComplianceReporting',
    'enableSecurityMonitoring',
    'enableAccessControl',
    'enableDataEncryption',
    'enableGDPRCompliance',
    'enableSOXCompliance'
  ]);
};

/**
 * Get enabled features count for a category
 * @param {Object} settings - Company settings object
 * @param {string[]} categoryFeatures - Array of feature keys for the category
 * @returns {number} - Number of enabled features in the category
 */
export const getEnabledFeaturesCount = (settings, categoryFeatures) => {
  if (!settings || !Array.isArray(categoryFeatures)) return 0;
  return categoryFeatures.filter(key => settings[key] === true).length;
};

/**
 * Get feature enablement percentage for a category
 * @param {Object} settings - Company settings object
 * @param {string[]} categoryFeatures - Array of feature keys for the category
 * @returns {number} - Percentage of enabled features (0-100)
 */
export const getFeatureEnablementPercentage = (settings, categoryFeatures) => {
  if (!settings || !Array.isArray(categoryFeatures) || categoryFeatures.length === 0) return 0;
  const enabledCount = getEnabledFeaturesCount(settings, categoryFeatures);
  return Math.round((enabledCount / categoryFeatures.length) * 100);
};

/**
 * Feature categories for organization
 */
export const FEATURE_CATEGORIES = {
  BUSINESS_MODEL: [
    'is3PL',
    'isEcommerceFulfillment',
    'isManufacturerWarehouse',
    'isDistributionCenter',
    'isRetailWarehouse',
    'isColdStorage',
    'isHazmatFacility',
    'isCustomsWarehouse'
  ],
  WAREHOUSE_OPERATIONS: [
    'enableReceivingWorkflows',
    'enablePickPackOperations',
    'enableCrossDocking',
    'enableReturnsManagement',
    'enableYardManagement',
    'enableLaborManagement',
    'enableQualityControl',
    'enableWaveManagement',
    'enableValueAddedServices',
    'enableSlottingOptimization',
    'enableKittingAssembly'
  ],
  CLIENT_SERVICES: [
    'enableMultiClientInventory',
    'enableClientPortals',
    'enableClientDashboards',
    'enableClientReporting',
    'enableClientOrderPortal',
    'enableClientInventoryView',
    'enableClientBilling',
    'enableClientNotifications',
    'enableClientDocuments'
  ],
  BILLING: [
    'enableStorageBilling',
    'enableHandlingCharges',
    'enableTransportationBilling',
    'enableAccessorialCharges',
    'enableServiceLevelBilling',
    'enableUsageBasedBilling',
    'enableContractManagement'
  ],
  INTEGRATIONS: [
    'enableEDIIntegration',
    'enableAPIAccess',
    'enableBarcodeScanning',
    'enableRFIDTracking',
    'enableVoicePicking',
    'enableMobileScanning',
    'enableIoTSensors',
    'enableAutomatedSorting',
    'enableRoboticIntegration'
  ],
  ANALYTICS: [
    'enableAdvancedAnalytics',
    'enablePredictiveAnalytics',
    'enablePerformanceTracking',
    'enableWorkflowOptimization',
    'enableTaskAutomation',
    'enableExceptionHandling'
  ],
  COMPLIANCE: [
    'enableAuditTrail',
    'enableComplianceReporting',
    'enableSecurityMonitoring',
    'enableAccessControl',
    'enableDataEncryption',
    'enableGDPRCompliance',
    'enableSOXCompliance'
  ]
};

/**
 * Component wrapper for conditional rendering based on feature flags
 * @param {Object} props - Component props
 * @param {Object} props.settings - Company settings object
 * @param {string|string[]} props.feature - Feature key(s) to check
 * @param {boolean} props.requireAll - Whether all features must be enabled (for array)
 * @param {React.Component} props.children - Child components to render if feature is enabled
 * @param {React.Component} props.fallback - Fallback component if feature is disabled
 * @returns {React.Component} - Conditionally rendered component
 */
export const FeatureGate = ({ settings, feature, requireAll = false, children, fallback = null }) => {
  let isEnabled = false;
  
  if (Array.isArray(feature)) {
    isEnabled = requireAll 
      ? areAllFeaturesEnabled(settings, feature)
      : isAnyFeatureEnabled(settings, feature);
  } else {
    isEnabled = isFeatureEnabled(settings, feature);
  }
  
  return isEnabled ? children : fallback;
};

// ========== PICK & PACK OPERATIONS HELPERS ==========

/**
 * Check if Pick & Pack operations are fully enabled
 * @param {Object} settings - Company settings object
 * @returns {boolean} - Whether full Pick & Pack operations are available
 */
export const hasPickAndPackOperations = (settings) => {
  return isFeatureEnabled(settings, 'enableWaveManagement') && 
         isFeatureEnabled(settings, 'enablePickPackOperations');
};

/**
 * Check if wave creation is enabled
 * @param {Object} settings - Company settings object
 * @returns {boolean} - Whether wave creation is available
 */
export const canCreateWaves = (settings) => {
  return isFeatureEnabled(settings, 'enableWaveManagement');
};

/**
 * Check if route optimization is enabled
 * @param {Object} settings - Company settings object
 * @returns {boolean} - Whether route optimization is available
 */
export const canOptimizeRoutes = (settings) => {
  return isFeatureEnabled(settings, 'enablePickPackOperations') &&
         hasAdvancedAnalytics(settings);
};

/**
 * Check if quality control features are enabled
 * @param {Object} settings - Company settings object
 * @returns {boolean} - Whether quality control is available
 */
export const hasQualityControl = (settings) => {
  return isFeatureEnabled(settings, 'enableQualityControl');
};

/**
 * Check if advanced picking features are enabled
 * @param {Object} settings - Company settings object
 * @returns {boolean} - Whether advanced picking features are available
 */
export const hasAdvancedPicking = (settings) => {
  return isAnyFeatureEnabled(settings, [
    'enableBarcodeScanning',
    'enableVoicePicking',
    'enableRFIDTracking',
    'enableMobileScanning'
  ]);
};

/**
 * Check if packing operations are enabled
 * @param {Object} settings - Company settings object
 * @returns {boolean} - Whether packing operations are available
 */
export const hasPackingOperations = (settings) => {
  return isFeatureEnabled(settings, 'enablePickPackOperations');
};

/**
 * Check if wave management is enabled
 * @param {Object} settings - Company settings object
 * @returns {boolean} - Whether wave management is available
 */
export const hasWaveManagement = (settings) => {
  return isFeatureEnabled(settings, 'enableWaveManagement');
};

/**
 * Check if pick list management is enabled
 * @param {Object} settings - Company settings object
 * @returns {boolean} - Whether pick list management is available
 */
export const hasPickListManagement = (settings) => {
  return isFeatureEnabled(settings, 'enablePickPackOperations');
};

// === RECEIVING & PUT-AWAY OPERATIONS ===

/**
 * Check if receiving operations are enabled
 * @param {Object} settings - Company settings object
 * @returns {boolean} - Whether receiving operations are available
 */
export const hasReceivingOperations = (settings) => {
  return isFeatureEnabled(settings, 'enableReceivingWorkflows');
};

/**
 * Check if ASN creation is enabled
 * @param {Object} settings - Company settings object
 * @returns {boolean} - Whether ASN creation is available
 */
export const canCreateASNs = (settings) => {
  return isFeatureEnabled(settings, 'enableReceivingWorkflows');
};

/**
 * Check if appointment scheduling is enabled
 * @param {Object} settings - Company settings object
 * @returns {boolean} - Whether appointment scheduling is available
 */
export const hasAppointmentScheduling = (settings) => {
  return isFeatureEnabled(settings, 'enableReceivingWorkflows') && 
         isFeatureEnabled(settings, 'enableYardManagement');
};

/**
 * Check if dock management is enabled
 * @param {Object} settings - Company settings object
 * @returns {boolean} - Whether dock management is available
 */
export const hasDockManagement = (settings) => {
  return isFeatureEnabled(settings, 'enableYardManagement');
};

/**
 * Check if put-away operations are enabled
 * @param {Object} settings - Company settings object
 * @returns {boolean} - Whether put-away operations are available
 */
export const hasPutAwayOperations = (settings) => {
  return isFeatureEnabled(settings, 'enableReceivingWorkflows');
};

/**
 * Check if receiving QC is enabled
 * @param {Object} settings - Company settings object
 * @returns {boolean} - Whether receiving QC is available
 */
export const hasReceivingQC = (settings) => {
  return isFeatureEnabled(settings, 'enableReceivingWorkflows') && 
         isFeatureEnabled(settings, 'enableQualityControl');
};

/**
 * Check if cross-docking is enabled
 * @param {Object} settings - Company settings object
 * @returns {boolean} - Whether cross-docking is available
 */
export const hasCrossDocking = (settings) => {
  return isFeatureEnabled(settings, 'enableCrossDocking');
};

/**
 * Check if advanced receiving features are enabled
 * @param {Object} settings - Company settings object
 * @returns {boolean} - Whether advanced receiving features are available
 */
export const hasAdvancedReceiving = (settings) => {
  return isFeatureEnabled(settings, 'enableReceivingWorkflows') && 
         isFeatureEnabled(settings, 'enableAdvancedAnalytics');
};

/**
 * Check if cycle counting features are enabled
 * @param {Object} settings - Company settings object
 * @returns {boolean} - Whether cycle counting features are available
 */
export const hasCycleCounting = (settings) => {
  return isFeatureEnabled(settings, 'enableCycleCountingAdvanced');
}; 