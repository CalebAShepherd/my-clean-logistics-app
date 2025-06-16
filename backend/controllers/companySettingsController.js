const { PrismaClient } = require('@prisma/client');
const { getAllProfiles, getProfile, applyProfile } = require('../config/companyProfiles');
const prisma = new PrismaClient();

/**
 * Retrieve the single CompanySettings row, creating it if missing.
 */
exports.getSettings = async (req, res) => {
  try {
    let settings = await prisma.companySettings.findFirst();
    if (!settings) {
      settings = await prisma.companySettings.create({ data: {} });
    }
    return res.json(settings);
  } catch (err) {
    console.error('Error fetching company settings:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update or create the CompanySettings row.
 */
exports.updateSettings = async (req, res) => {
  try {
    const data = { ...req.body };
    const settings = await prisma.companySettings.upsert({
      where: { id: req.body.id || '' },
      create: data,
      update: data,
    });
    return res.json(settings);
  } catch (err) {
    console.error('Error updating company settings:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get public company branding information (logo and name only)
 * This endpoint doesn't require authentication and is used for login/signup screens
 */
exports.getBranding = async (req, res) => {
  try {
    let settings = await prisma.companySettings.findFirst({
      select: {
        companyName: true,
        logoUrl: true,
      }
    });
    
    if (!settings) {
      // Return default branding if no settings exist
      settings = {
        companyName: 'Clean Logistics',
        logoUrl: null,
      };
    }
    
    return res.json(settings);
  } catch (err) {
    console.error('Error fetching company branding:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get all available company profiles
 */
exports.getProfiles = async (req, res) => {
  try {
    const profiles = getAllProfiles();
    return res.json(profiles);
  } catch (err) {
    console.error('Error fetching company profiles:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get a specific company profile by ID
 */
exports.getProfile = async (req, res) => {
  try {
    const { profileId } = req.params;
    const profile = getProfile(profileId);
    return res.json(profile);
  } catch (err) {
    console.error('Error fetching company profile:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Apply a company profile to current settings
 */
exports.applyProfile = async (req, res) => {
  try {
    const { profileId } = req.body;
    
    if (!profileId) {
      return res.status(400).json({ error: 'Profile ID is required' });
    }

    // Get current settings
    let currentSettings = await prisma.companySettings.findFirst();
    if (!currentSettings) {
      currentSettings = await prisma.companySettings.create({ data: {} });
    }

    // Apply the profile
    const updatedSettings = applyProfile(profileId, currentSettings);
    
    // Save the updated settings
    const settings = await prisma.companySettings.upsert({
      where: { id: currentSettings.id },
      create: updatedSettings,
      update: updatedSettings,
    });

    return res.json({
      success: true,
      message: `Applied ${getProfile(profileId).name} profile successfully`,
      settings: settings
    });
  } catch (err) {
    console.error('Error applying company profile:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get feature-based settings summary
 * Returns a categorized view of enabled features
 */
exports.getFeatureSummary = async (req, res) => {
  try {
    let settings = await prisma.companySettings.findFirst();
    if (!settings) {
      settings = await prisma.companySettings.create({ data: {} });
    }

    const summary = {
      businessModel: {
        type: settings.is3PL ? '3PL' : 
              settings.isEcommerceFulfillment ? 'E-commerce Fulfillment' :
              settings.isManufacturerWarehouse ? 'Manufacturer Warehouse' :
              settings.isDistributionCenter ? 'Distribution Center' :
              settings.isRetailWarehouse ? 'Retail Warehouse' :
              settings.isColdStorage ? 'Cold Storage' :
              settings.isHazmatFacility ? 'Hazmat Facility' : 'Custom',
        hasWarehouses: settings.hasWarehouses,
        ownTransporters: settings.ownTransporters,
        useThirdPartyCarriers: settings.useThirdPartyCarriers,
      },
      warehouseOperations: {
        receiving: settings.enableReceivingWorkflows,
        pickPack: settings.enablePickPackOperations,
        crossDocking: settings.enableCrossDocking,
        returns: settings.enableReturnsManagement,
        yardManagement: settings.enableYardManagement,
        laborManagement: settings.enableLaborManagement,
        qualityControl: settings.enableQualityControl,
        waveManagement: settings.enableWaveManagement,
      },
      clientServices: {
        multiClient: settings.enableMultiClientInventory,
        portals: settings.enableClientPortals,
        dashboards: settings.enableClientDashboards,
        reporting: settings.enableClientReporting,
        orderPortal: settings.enableClientOrderPortal,
        inventoryView: settings.enableClientInventoryView,
      },
      billing: {
        storage: settings.enableStorageBilling,
        handling: settings.enableHandlingCharges,
        transportation: settings.enableTransportationBilling,
        accessorial: settings.enableAccessorialCharges,
        serviceLevel: settings.enableServiceLevelBilling,
        usageBased: settings.enableUsageBasedBilling,
      },
      integrations: {
        edi: settings.enableEDIIntegration,
        api: settings.enableAPIAccess,
        barcode: settings.enableBarcodeScanning,
        rfid: settings.enableRFIDTracking,
        voice: settings.enableVoicePicking,
        mobile: settings.enableMobileScanning,
        iot: settings.enableIoTSensors,
      },
      analytics: {
        advanced: settings.enableAdvancedAnalytics,
        predictive: settings.enablePredictiveAnalytics,
        performance: settings.enablePerformanceTracking,
        workflow: settings.enableWorkflowOptimization,
      },
      compliance: {
        audit: settings.enableAuditTrail,
        reporting: settings.enableComplianceReporting,
        security: settings.enableSecurityMonitoring,
        access: settings.enableAccessControl,
        encryption: settings.enableDataEncryption,
        gdpr: settings.enableGDPRCompliance,
        sox: settings.enableSOXCompliance,
      }
    };

    return res.json(summary);
  } catch (err) {
    console.error('Error fetching feature summary:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};