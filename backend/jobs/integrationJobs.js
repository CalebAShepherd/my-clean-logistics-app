const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const integrationService = require('../services/integrationService');
const prisma = new PrismaClient();

/**
 * Integration Jobs - Batch processing for end-of-day reconciliation and scheduled tasks
 */

console.log('Initializing integration batch jobs...');

/**
 * Daily batch reconciliation job - Runs at 2:00 AM every day
 */
cron.schedule('0 2 * * *', async () => {
  console.log('Starting daily batch reconciliation job...');
  
  try {
    // Get all active tenants
    const tenants = await prisma.tenant.findMany({
      select: { id: true, name: true }
    });
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    console.log(`Processing batch reconciliation for ${tenants.length} tenants for date: ${yesterday.toDateString()}`);
    
    const results = [];
    
    for (const tenant of tenants) {
      try {
        console.log(`Processing batch reconciliation for tenant: ${tenant.name} (${tenant.id})`);
        
        const result = await integrationService.runBatchReconciliation(tenant.id, yesterday);
        
        results.push({
          tenantId: tenant.id,
          tenantName: tenant.name,
          success: true,
          result
        });
        
        console.log(`Batch reconciliation completed for tenant: ${tenant.name}`);
      } catch (error) {
        console.error(`Error in batch reconciliation for tenant ${tenant.name}:`, error);
        
        results.push({
          tenantId: tenant.id,
          tenantName: tenant.name,
          success: false,
          error: error.message
        });
      }
    }
    
    // Log batch reconciliation summary
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    console.log(`Daily batch reconciliation completed: ${successCount} successful, ${failureCount} failed`);
    
    // TODO: Send notification email with results summary
    
  } catch (error) {
    console.error('Error in daily batch reconciliation job:', error);
  }
}, {
  scheduled: true,
  timezone: "America/New_York"
});

/**
 * Hourly integration health check - Runs every hour
 */
cron.schedule('0 * * * *', async () => {
  console.log('Running hourly integration health check...');
  
  try {
    // Get all active tenants
    const tenants = await prisma.tenant.findMany({
      select: { id: true, name: true }
    });
    
    for (const tenant of tenants) {
      try {
        await checkIntegrationHealth(tenant.id, tenant.name);
      } catch (error) {
        console.error(`Health check failed for tenant ${tenant.name}:`, error);
      }
    }
    
    console.log('Hourly integration health check completed');
  } catch (error) {
    console.error('Error in hourly health check job:', error);
  }
}, {
  scheduled: true,
  timezone: "America/New_York"
});

/**
 * Process pending integrations - Runs every 15 minutes
 */
cron.schedule('*/15 * * * *', async () => {
  console.log('Processing pending integrations...');
  
  try {
    // Get all active tenants
    const tenants = await prisma.tenant.findMany({
      select: { id: true, name: true }
    });
    
    for (const tenant of tenants) {
      try {
        await processPendingIntegrations(tenant.id);
      } catch (error) {
        console.error(`Error processing pending integrations for tenant ${tenant.name}:`, error);
      }
    }
    
    console.log('Pending integrations processing completed');
  } catch (error) {
    console.error('Error in pending integrations job:', error);
  }
}, {
  scheduled: true,
  timezone: "America/New_York"
});

/**
 * Weekly integration performance report - Runs every Sunday at 6:00 AM
 */
cron.schedule('0 6 * * 0', async () => {
  console.log('Generating weekly integration performance reports...');
  
  try {
    // Get all active tenants
    const tenants = await prisma.tenant.findMany({
      select: { id: true, name: true }
    });
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    for (const tenant of tenants) {
      try {
        await generateWeeklyPerformanceReport(tenant.id, tenant.name, weekAgo);
      } catch (error) {
        console.error(`Error generating weekly report for tenant ${tenant.name}:`, error);
      }
    }
    
    console.log('Weekly integration performance reports completed');
  } catch (error) {
    console.error('Error in weekly reporting job:', error);
  }
}, {
  scheduled: true,
  timezone: "America/New_York"
});

/**
 * Check integration health for a specific tenant
 */
async function checkIntegrationHealth(tenantId, tenantName) {
  const currentTime = new Date();
  const oneHourAgo = new Date(currentTime.getTime() - 60 * 60 * 1000);
  
  // Check for recent integration activities
  const recentJournalEntries = await prisma.journalEntry.count({
    where: {
      tenantId,
      createdAt: { gte: oneHourAgo },
      metadata: { path: ['source'], not: null }
    }
  });
  
  // Check for pending integrations
  const pendingIntegrations = await getPendingIntegrationsCount(tenantId);
  
  // Check for failed integrations (TODO: Implement failed integration tracking)
  const failedIntegrations = 0;
  
  const healthStatus = {
    tenantId,
    tenantName,
    timestamp: currentTime,
    recentIntegrations: recentJournalEntries,
    pendingIntegrations,
    failedIntegrations,
    status: pendingIntegrations > 10 || failedIntegrations > 0 ? 'warning' : 'healthy'
  };
  
  // Log health status
  console.log(`Health check for ${tenantName}:`, healthStatus);
  
  // If there are issues, trigger alerts
  if (healthStatus.status === 'warning') {
    console.warn(`Integration health warning for ${tenantName}: ${pendingIntegrations} pending, ${failedIntegrations} failed`);
    // TODO: Send notification/alert
  }
  
  return healthStatus;
}

/**
 * Process pending integrations for a specific tenant
 */
async function processPendingIntegrations(tenantId) {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
  // Find completed waves without cost allocations
  const unprocessedWaves = await prisma.wave.findMany({
    where: {
      status: 'COMPLETED',
      completedAt: { gte: oneHourAgo, lte: now }
    },
    select: {
      id: true,
      warehouseId: true,
      completedAt: true,
      pickLists: { select: { id: true } }
    }
  });
  
  for (const wave of unprocessedWaves) {
    // Check if cost allocation already exists
    const existingAllocation = await prisma.costAllocation.findFirst({
      where: {
        tenantId,
        metadata: { path: ['waveId'], equals: wave.id }
      }
    });
    
    if (!existingAllocation) {
      console.log(`Processing pending wave integration: ${wave.id}`);
      
      try {
        await integrationService.processEvent('wave.completed', {
          waveId: wave.id,
          totalTasks: wave.pickLists.length,
          totalTime: 120, // Default 2 hours
          warehouseId: wave.warehouseId
        }, tenantId);
        
        console.log(`Wave integration processed successfully: ${wave.id}`);
      } catch (error) {
        console.error(`Error processing wave integration ${wave.id}:`, error);
      }
    }
  }
  
  // Find delivered shipments without invoices
  const unprocessedShipments = await prisma.shipment.findMany({
    where: {
      status: 'DELIVERED',
      deliveredAt: { gte: oneHourAgo, lte: now }
    },
    select: {
      id: true,
      clientId: true,
      weight: true,
      deliveredAt: true
    }
  });
  
  for (const shipment of unprocessedShipments) {
    // Check if invoice already exists
    const existingInvoice = await prisma.invoiceEnhanced.findFirst({
      where: {
        tenantId,
        customerId: shipment.clientId,
        lineItems: {
          some: {
            description: { contains: shipment.id }
          }
        }
      }
    });
    
    if (!existingInvoice) {
      console.log(`Processing pending shipment integration: ${shipment.id}`);
      
      try {
        await integrationService.processEvent('shipment.delivered', {
          shipmentId: shipment.id,
          clientId: shipment.clientId,
          serviceType: 'TRANSPORTATION',
          totalCost: calculateShipmentCost(shipment)
        }, tenantId);
        
        console.log(`Shipment integration processed successfully: ${shipment.id}`);
      } catch (error) {
        console.error(`Error processing shipment integration ${shipment.id}:`, error);
      }
    }
  }
}

/**
 * Generate weekly performance report for a tenant
 */
async function generateWeeklyPerformanceReport(tenantId, tenantName, startDate) {
  const endDate = new Date();
  
  // Get integration metrics for the week
  const journalEntriesCreated = await prisma.journalEntry.count({
    where: {
      tenantId,
      createdAt: { gte: startDate, lte: endDate },
      metadata: { path: ['source'], not: null }
    }
  });
  
  const invoicesGenerated = await prisma.invoiceEnhanced.count({
    where: {
      tenantId,
      createdAt: { gte: startDate, lte: endDate },
      metadata: { path: ['source'], equals: 'shipment_delivery' }
    }
  });
  
  const costAllocationsCreated = await prisma.costAllocation.count({
    where: {
      tenantId,
      allocationDate: { gte: startDate, lte: endDate }
    }
  });
  
  const revenueRecognized = await prisma.journalEntry.aggregate({
    where: {
      tenantId,
      createdAt: { gte: startDate, lte: endDate },
      metadata: { path: ['source'], equals: 'shipment_delivery' }
    },
    _sum: { totalAmount: true }
  });
  
  const report = {
    tenantId,
    tenantName,
    period: { startDate, endDate },
    metrics: {
      journalEntriesCreated,
      invoicesGenerated,
      costAllocationsCreated,
      revenueRecognized: revenueRecognized._sum.totalAmount || 0,
      totalIntegrationEvents: journalEntriesCreated + invoicesGenerated + costAllocationsCreated
    },
    generatedAt: new Date()
  };
  
  console.log('Weekly integration report for', tenantName, ':', report);
  
  // TODO: Store report in database and/or send via email
  
  return report;
}

/**
 * Get pending integrations count for a tenant
 */
async function getPendingIntegrationsCount(tenantId) {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  // Count completed waves without cost allocations
  const completedWaves = await prisma.wave.count({
    where: {
      status: 'COMPLETED',
      completedAt: { gte: oneDayAgo }
    }
  });
  
  const waveAllocations = await prisma.costAllocation.count({
    where: {
      tenantId,
      allocationDate: { gte: oneDayAgo },
      metadata: { path: ['source'], equals: 'wave_completion' }
    }
  });
  
  // Count delivered shipments without invoices
  const deliveredShipments = await prisma.shipment.count({
    where: {
      status: 'DELIVERED',
      deliveredAt: { gte: oneDayAgo }
    }
  });
  
  const shipmentInvoices = await prisma.invoiceEnhanced.count({
    where: {
      tenantId,
      createdAt: { gte: oneDayAgo },
      metadata: { path: ['source'], equals: 'shipment_delivery' }
    }
  });
  
  const pendingWaves = Math.max(0, completedWaves - waveAllocations);
  const pendingShipments = Math.max(0, deliveredShipments - shipmentInvoices);
  
  return pendingWaves + pendingShipments;
}

/**
 * Calculate shipment cost for integration
 */
function calculateShipmentCost(shipment) {
  const baseCost = 50;
  const weightCost = (shipment.weight || 0) * 0.5;
  const distanceCost = 0.10 * 100; // Assume 100 miles
  
  return baseCost + weightCost + distanceCost;
}

/**
 * Manual job triggers for testing/admin use
 */
const manualTriggers = {
  runBatchReconciliation: async (tenantId, date) => {
    console.log(`Manually triggering batch reconciliation for tenant ${tenantId}`);
    return await integrationService.runBatchReconciliation(tenantId, date || new Date());
  },
  
  checkHealth: async (tenantId) => {
    console.log(`Manually triggering health check for tenant ${tenantId}`);
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true }
    });
    
    if (!tenant) throw new Error('Tenant not found');
    
    return await checkIntegrationHealth(tenant.id, tenant.name);
  },
  
  processPending: async (tenantId) => {
    console.log(`Manually processing pending integrations for tenant ${tenantId}`);
    return await processPendingIntegrations(tenantId);
  },
  
  generateReport: async (tenantId, startDate) => {
    console.log(`Manually generating performance report for tenant ${tenantId}`);
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true }
    });
    
    if (!tenant) throw new Error('Tenant not found');
    
    return await generateWeeklyPerformanceReport(tenant.id, tenant.name, startDate || new Date());
  }
};

console.log('Integration batch jobs initialized successfully');

module.exports = {
  manualTriggers
}; 