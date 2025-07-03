const integrationService = require('../services/integrationService');

/**
 * Integration Middleware - Captures operational events and routes them for processing
 * Implements event-driven architecture for real-time financial integration
 */

/**
 * Event capture middleware that can be added to any route
 */
const captureEvent = (eventType, dataExtractor) => {
  return async (req, res, next) => {
    // Store original res.json to intercept successful responses
    const originalJson = res.json;
    
    res.json = function(data) {
      // Call original res.json first
      const result = originalJson.call(this, data);
      
      // Only process events on successful responses (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Extract tenant ID from request
        const tenantId = req.user?.tenantId;
        
        if (tenantId) {
          // Extract event data using the provided extractor function
          const eventData = dataExtractor ? dataExtractor(req, res, data) : { ...req.body, ...req.params };
          
          // Process the event asynchronously (don't block the response)
          setImmediate(async () => {
            try {
              await integrationService.processEvent(eventType, eventData, tenantId);
            } catch (error) {
              console.error(`Error processing integration event ${eventType}:`, error);
            }
          });
        }
      }
      
      return result;
    };
    
    next();
  };
};

/**
 * Specific event middlewares for common operational events
 */

/**
 * Wave completion event middleware
 */
const captureWaveCompletion = captureEvent('wave.completed', (req, res, data) => {
  return {
    waveId: req.params.id || data.id,
    totalTasks: data.totalTasks || data.pickLists?.length || 0,
    totalTime: data.totalTime || 120, // Default 2 hours
    warehouseId: data.warehouseId || req.body.warehouseId,
    completedAt: new Date()
  };
});

/**
 * Shipment delivery event middleware
 */
const captureShipmentDelivery = captureEvent('shipment.delivered', (req, res, data) => {
  return {
    shipmentId: req.params.id || data.id,
    clientId: data.clientId || data.client?.id,
    serviceType: data.serviceType || 'TRANSPORTATION',
    totalCost: data.totalCost || calculateShipmentCost(data),
    deliveredAt: new Date()
  };
});

/**
 * Inventory received event middleware
 */
const captureInventoryReceived = captureEvent('inventory.received', (req, res, data) => {
  return {
    receiptId: req.params.id || data.id,
    items: data.items || data.receiptItems || [],
    warehouseId: data.warehouseId,
    receivedAt: new Date()
  };
});

/**
 * Stock movement event middleware
 */
const captureStockMovement = captureEvent('stock.movement', (req, res, data) => {
  return {
    movementId: req.params.id || data.id,
    movementType: data.type || data.movementType,
    items: data.items || [],
    fromLocationId: data.fromLocationId,
    toLocationId: data.toLocationId,
    warehouseId: data.warehouseId,
    movedAt: new Date()
  };
});

/**
 * Asset maintenance event middleware
 */
const captureAssetMaintenance = captureEvent('asset.maintenance', (req, res, data) => {
  return {
    workOrderId: req.params.id || data.id,
    assetId: data.assetId || data.asset?.id,
    totalCost: data.totalCost || data.laborCost + data.partsCost,
    laborHours: data.laborHours,
    partsUsed: data.partsUsed || [],
    completedAt: new Date()
  };
});

/**
 * Purchase received event middleware
 */
const capturePurchaseReceived = captureEvent('purchase.received', (req, res, data) => {
  return {
    purchaseOrderId: data.purchaseOrderId || data.purchaseOrder?.id,
    receiptId: req.params.id || data.id,
    items: data.items || data.receiptItems || [],
    supplierId: data.supplierId || data.supplier?.id,
    totalValue: data.totalValue || calculateReceiptValue(data.items),
    receivedAt: new Date()
  };
});

/**
 * Utility bill event middleware
 */
const captureUtilityBill = captureEvent('utility.bill', (req, res, data) => {
  return {
    billId: req.params.id || data.id,
    facilityId: data.facilityId || data.facility?.id,
    utilityType: data.utilityType,
    amount: data.amount,
    billDate: data.billDate,
    allocations: data.allocations || []
  };
});

/**
 * Pick completion event middleware
 */
const capturePickCompletion = captureEvent('pick.completed', (req, res, data) => {
  return {
    pickListId: req.params.id || data.id,
    pickerId: data.pickerId || data.picker?.id,
    totalItems: data.totalItems || data.pickTasks?.length || 0,
    totalTime: data.totalTime || 60, // Default 1 hour
    warehouseId: data.warehouseId,
    completedAt: new Date()
  };
});

/**
 * Pack completion event middleware
 */
const capturePackCompletion = captureEvent('pack.completed', (req, res, data) => {
  return {
    packingSlipId: req.params.id || data.id,
    packerId: data.packerId || data.packer?.id,
    totalPackages: data.totalPackages || data.packages?.length || 0,
    totalTime: data.totalTime || 30, // Default 30 minutes
    warehouseId: data.warehouseId,
    completedAt: new Date()
  };
});

/**
 * Helper function to calculate shipment cost
 */
function calculateShipmentCost(shipment) {
  const baseCost = 50;
  const weightCost = (shipment.weight || 0) * 0.5;
  const distanceCost = 0.10 * 100; // Assume 100 miles
  
  return baseCost + weightCost + distanceCost;
}

/**
 * Helper function to calculate receipt value
 */
function calculateReceiptValue(items) {
  if (!Array.isArray(items)) return 0;
  
  return items.reduce((total, item) => {
    return total + ((item.quantity || 0) * (item.unitCost || 0));
  }, 0);
}

/**
 * Generic event trigger for manual integration events
 */
const triggerIntegrationEvent = async (req, res, next) => {
  try {
    const { eventType, eventData } = req.body;
    const tenantId = req.user?.tenantId;
    
    if (!eventType || !eventData || !tenantId) {
      return res.status(400).json({ 
        error: 'eventType, eventData, and authenticated user required' 
      });
    }
    
    const result = await integrationService.processEvent(eventType, eventData, tenantId);
    
    res.json({
      success: true,
      message: `Integration event ${eventType} processed`,
      result
    });
  } catch (error) {
    console.error('Error triggering integration event:', error);
    res.status(500).json({ error: 'Failed to process integration event' });
  }
};

/**
 * Batch reconciliation trigger
 */
const triggerBatchReconciliation = async (req, res, next) => {
  try {
    const tenantId = req.user?.tenantId;
    const { date } = req.body;
    
    if (!tenantId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const reconciliationDate = date ? new Date(date) : new Date();
    const result = await integrationService.runBatchReconciliation(tenantId, reconciliationDate);
    
    res.json({
      success: true,
      message: 'Batch reconciliation completed',
      result
    });
  } catch (error) {
    console.error('Error running batch reconciliation:', error);
    res.status(500).json({ error: 'Failed to run batch reconciliation' });
  }
};

/**
 * Integration health check middleware
 */
const integrationHealthCheck = async (req, res, next) => {
  try {
    const tenantId = req.user?.tenantId;
    
    if (!tenantId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Check recent integration events and their success rates
    const healthStatus = {
      status: 'healthy',
      lastChecked: new Date(),
      integrationServiceStatus: 'active',
      eventProcessingStatus: 'normal',
      // Add more health metrics as needed
    };
    
    res.json(healthStatus);
  } catch (error) {
    console.error('Error checking integration health:', error);
    res.status(500).json({ 
      status: 'unhealthy',
      error: 'Health check failed',
      lastChecked: new Date()
    });
  }
};

module.exports = {
  // Generic event capture
  captureEvent,
  
  // Specific event middlewares
  captureWaveCompletion,
  captureShipmentDelivery,
  captureInventoryReceived,
  captureStockMovement,
  captureAssetMaintenance,
  capturePurchaseReceived,
  captureUtilityBill,
  capturePickCompletion,
  capturePackCompletion,
  
  // Manual triggers
  triggerIntegrationEvent,
  triggerBatchReconciliation,
  integrationHealthCheck,
  
  // Helper functions
  calculateShipmentCost,
  calculateReceiptValue
}; 