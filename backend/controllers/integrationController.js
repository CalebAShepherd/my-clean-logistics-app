const { PrismaClient } = require('@prisma/client');
const integrationService = require('../services/integrationService');
const prisma = new PrismaClient();

/**
 * Integration Controller - API endpoints for integration monitoring and management
 */

/**
 * Get integration dashboard data
 */
exports.getIntegrationDashboard = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { period = '7d' } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '1d':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      default:
        startDate.setDate(endDate.getDate() - 7);
    }

    // Get integration metrics
    const metrics = {
      // Journal entries created by integration
      journalEntriesCreated: await prisma.journalEntry.count({
        where: {
          tenantId,
          createdAt: { gte: startDate, lte: endDate },
          referenceType: { not: null }
        }
      }),
      
      // Invoices auto-generated - REMOVED as no source field exists on InvoiceEnhanced model
      invoicesGenerated: 0,
      
      // Cost allocations created
      costAllocations: await prisma.costAllocation.count({
        where: {
          tenantId,
          allocationDate: { gte: startDate, lte: endDate }
        }
      }),
      
      // Revenue recognized
      revenueRecognized: await prisma.journalEntry.aggregate({
        where: {
          tenantId,
          createdAt: { gte: startDate, lte: endDate },
          referenceType: 'shipment_delivery'
        },
        _sum: { totalAmount: true }
      }),
      
      // Inventory adjustments
      inventoryAdjustments: await prisma.stockMovement.count({
        where: {
          timestamp: { gte: startDate, lte: endDate },
          type: 'ADJUSTMENT'
        }
      })
    };

    // Get recent integration activities
    const recentActivities = await prisma.journalEntry.findMany({
      where: {
        tenantId,
        createdAt: { gte: startDate, lte: endDate },
        referenceType: { not: null }
      },
      select: {
        id: true,
        entryNumber: true,
        description: true,
        totalAmount: true,
        createdAt: true,
        referenceType: true,
        referenceId: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Integration health status
    const healthStatus = {
      status: 'healthy',
      lastBatchReconciliation: await getLastBatchReconciliation(tenantId),
      pendingIntegrations: await getPendingIntegrations(tenantId),
      failedIntegrations: 0 // TODO: Implement failed integration tracking
    };

    const dashboardData = {
      period,
      dateRange: { startDate, endDate },
      metrics,
      recentActivities,
      healthStatus
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('Error fetching integration dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch integration dashboard' });
  }
};

/**
 * Get integration events log
 */
exports.getIntegrationEvents = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { page = 1, limit = 50, eventType, status, startDate, endDate } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Build where clause
    const where = { tenantId };
    
    if (eventType) where.referenceType = eventType;
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }
    
    // Get journal entries that represent integration events
    const events = await prisma.journalEntry.findMany({
      where,
      select: {
        id: true,
        entryNumber: true,
        description: true,
        totalAmount: true,
        status: true,
        createdAt: true,
        referenceType: true,
        referenceId: true
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: parseInt(limit)
    });
    
    const totalCount = await prisma.journalEntry.count({ where });
    
    res.json({
      events,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching integration events:', error);
    res.status(500).json({ error: 'Failed to fetch integration events' });
  }
};

/**
 * Manually trigger integration event
 */
exports.triggerIntegrationEvent = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { eventType, eventData } = req.body;
    
    if (!eventType || !eventData) {
      return res.status(400).json({ 
        error: 'eventType and eventData are required' 
      });
    }
    
    const result = await integrationService.processEvent(eventType, eventData, tenantId);
    
    res.json({
      success: true,
      message: `Integration event ${eventType} processed successfully`,
      result
    });
  } catch (error) {
    console.error('Error triggering integration event:', error);
    res.status(500).json({ error: 'Failed to process integration event' });
  }
};

/**
 * Run batch reconciliation
 */
exports.runBatchReconciliation = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { date } = req.body;
    
    const reconciliationDate = date ? new Date(date) : new Date();
    const result = await integrationService.runBatchReconciliation(tenantId, reconciliationDate);
    
    res.json({
      success: true,
      message: 'Batch reconciliation completed successfully',
      date: reconciliationDate,
      result
    });
  } catch (error) {
    console.error('Error running batch reconciliation:', error);
    res.status(500).json({ error: 'Failed to run batch reconciliation' });
  }
};

/**
 * Get integration health status
 */
exports.getIntegrationHealth = async (req, res) => {
  try {
    const { tenantId } = req.user;
    
    const healthData = {
      status: 'healthy',
      lastChecked: new Date(),
      services: {
        integrationService: 'active',
        eventProcessing: 'normal',
        batchProcessing: 'normal'
      },
      metrics: {
        lastBatchReconciliation: await getLastBatchReconciliation(tenantId),
        pendingIntegrations: await getPendingIntegrations(tenantId),
        failedIntegrations: 0, // TODO: Implement
        averageProcessingTime: '< 1s' // TODO: Calculate actual metrics
      },
      systemLoad: {
        eventQueueSize: 0, // TODO: Implement queue monitoring
        processingRate: '100/min', // TODO: Calculate actual rate
        errorRate: '0%' // TODO: Calculate actual error rate
      }
    };
    
    res.json(healthData);
  } catch (error) {
    console.error('Error checking integration health:', error);
    res.status(500).json({ 
      status: 'unhealthy',
      error: 'Health check failed',
      lastChecked: new Date()
    });
  }
};

/**
 * Get integration configuration
 */
exports.getIntegrationConfig = async (req, res) => {
  try {
    const { tenantId } = req.user;
    
    // Get company settings that affect integration
    const companySettings = await prisma.companySettings.findFirst({
      where: { tenantId },
      select: {
        autoInvoiceGeneration: true,
        autoCostAllocation: true,
        autoRevenueRecognition: true,
        defaultTaxRate: true,
        defaultPaymentTerms: true
      }
    });
    
    const config = {
      autoIntegrations: {
        waveCompletion: true,
        shipmentDelivery: companySettings?.autoInvoiceGeneration || true,
        inventoryReceived: true,
        stockMovement: true,
        assetMaintenance: true,
        costAllocation: companySettings?.autoCostAllocation || true,
        revenueRecognition: companySettings?.autoRevenueRecognition || true
      },
      settings: {
        batchReconciliationTime: '02:00', // 2 AM daily
        autoPostJournalEntries: true,
        requireApprovalForLargeEntries: true,
        largeEntryThreshold: 10000,
        defaultTaxRate: companySettings?.defaultTaxRate || 0.08,
        defaultPaymentTerms: companySettings?.defaultPaymentTerms || 30
      },
      notifications: {
        integrationFailures: true,
        batchReconciliationResults: true,
        largeVariances: true,
        systemHealth: true
      }
    };
    
    res.json(config);
  } catch (error) {
    console.error('Error fetching integration config:', error);
    res.status(500).json({ error: 'Failed to fetch integration configuration' });
  }
};

/**
 * Update integration configuration
 */
exports.updateIntegrationConfig = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { autoIntegrations, settings, notifications } = req.body;
    
    // Update company settings if provided
    if (settings) {
      await prisma.companySettings.updateMany({
        where: { tenantId },
        data: {
          autoInvoiceGeneration: autoIntegrations?.shipmentDelivery,
          autoCostAllocation: autoIntegrations?.costAllocation,
          autoRevenueRecognition: autoIntegrations?.revenueRecognition,
          defaultTaxRate: settings.defaultTaxRate,
          defaultPaymentTerms: settings.defaultPaymentTerms
        }
      });
    }
    
    // TODO: Store integration-specific settings in a dedicated table
    
    res.json({
      success: true,
      message: 'Integration configuration updated successfully'
    });
  } catch (error) {
    console.error('Error updating integration config:', error);
    res.status(500).json({ error: 'Failed to update integration configuration' });
  }
};

/**
 * Get integration reports
 */
exports.getIntegrationReports = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { reportType = 'summary', period = '30d' } = req.query;
    
    const endDate = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }
    
    let reportData = {};
    
    switch (reportType) {
      case 'summary':
        reportData = await generateSummaryReport(tenantId, startDate, endDate);
        break;
      case 'financial':
        reportData = await generateFinancialIntegrationReport(tenantId, startDate, endDate);
        break;
      case 'operational':
        reportData = await generateOperationalIntegrationReport(tenantId, startDate, endDate);
        break;
      case 'variance':
        reportData = await generateVarianceReport(tenantId, startDate, endDate);
        break;
      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }
    
    res.json({
      reportType,
      period,
      dateRange: { startDate, endDate },
      data: reportData,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Error generating integration report:', error);
    res.status(500).json({ error: 'Failed to generate integration report' });
  }
};

/**
 * Helper function to get last batch reconciliation
 */
async function getLastBatchReconciliation(tenantId) {
  // This would typically be stored in a dedicated table
  // For now, we'll look for journal entries with batch reconciliation metadata
  const lastEntry = await prisma.journalEntry.findFirst({
    where: {
      tenantId,
      referenceType: 'batch_reconciliation'
    },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true }
  });
  
  return lastEntry?.createdAt || null;
}

/**
 * Counts pending integration records for various models.
 * This is a simplified example. In a real system, you might have dedicated flags or tables.
 */
async function getPendingIntegrations(tenantId) {
  // Count operations that should trigger integrations but haven't been processed
  const twentyFourHoursAgo = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);

  const completedWaves = await prisma.wave.count({
    where: {
      status: "COMPLETED",
      actualEndTime: {
        gte: twentyFourHoursAgo,
      },
      warehouse: {
        administrators: {
          some: {
            tenantId: tenantId,
          },
        },
      },
    },
  });

  const completedWorkOrders = await prisma.workOrder.count({
    where: {
      status: "COMPLETED",
      completedAt: {
        gte: twentyFourHoursAgo,
      },
      asset: {
        warehouse: {
          administrators: {
            some: {
              tenantId: tenantId,
            },
          },
        },
      },
    },
  });

  // This is a placeholder. In a real system, you'd have more robust logic
  // to determine what's "pending" integration.
  return completedWaves + completedWorkOrders;
}

/**
 * Generate summary integration report
 */
async function generateSummaryReport(tenantId, startDate, endDate) {
  const journalEntries = await prisma.journalEntry.count({
    where: {
      tenantId,
      createdAt: { gte: startDate, lte: endDate },
      referenceType: { not: null }
    }
  });
  
  const invoicesGenerated = await prisma.invoiceEnhanced.count({
    where: {
      tenantId,
      createdAt: { gte: startDate, lte: endDate },
      referenceType: 'shipment_delivery'
    }
  });
  
  const costAllocations = await prisma.costAllocation.count({
    where: {
      tenantId,
      allocationDate: { gte: startDate, lte: endDate }
    }
  });
  
  return {
    journalEntriesCreated: journalEntries,
    invoicesGenerated,
    costAllocationsCreated: costAllocations,
    integrationEvents: journalEntries + invoicesGenerated + costAllocations
  };
}

/**
 * Generate financial integration report
 */
async function generateFinancialIntegrationReport(tenantId, startDate, endDate) {
  const revenueRecognized = await prisma.journalEntry.aggregate({
    where: {
      tenantId,
      createdAt: { gte: startDate, lte: endDate },
      referenceType: 'shipment_delivery'
    },
    _sum: { totalAmount: true }
  });
  
  const expensesRecorded = await prisma.journalEntry.aggregate({
    where: {
      tenantId,
      createdAt: { gte: startDate, lte: endDate },
      referenceType: { in: ['wave_completion', 'asset_maintenance'] }
    },
    _sum: { totalAmount: true }
  });
  
  return {
    revenueRecognized: revenueRecognized._sum.totalAmount || 0,
    expensesRecorded: expensesRecorded._sum.totalAmount || 0,
    netImpact: (revenueRecognized._sum.totalAmount || 0) - (expensesRecorded._sum.totalAmount || 0)
  };
}

/**
 * Generate operational integration report
 */
async function generateOperationalIntegrationReport(tenantId, startDate, endDate) {
  const wavesProcessed = await prisma.wave.count({
    where: {
      status: 'COMPLETED',
      actualEndTime: { gte: startDate, lte: endDate },
      warehouse: {
        administrators: {
          some: {
            tenantId: tenantId,
          },
        },
      },
    }
  });
  
  const shipmentsDelivered = await prisma.shipment.count({
    where: {
      status: 'DELIVERED',
      deliveredAt: { gte: startDate, lte: endDate },
      client: {
        tenantId: tenantId,
      },
    }
  });
  
  return {
    wavesProcessed,
    shipmentsDelivered,
    integrationEfficiency: '98%' // TODO: Calculate actual efficiency
  };
}

/**
 * Generate variance report
 */
async function generateVarianceReport(tenantId, startDate, endDate) {
  // This would compare system calculations vs actual GL balances
  return {
    inventoryVariance: 0,
    revenueVariance: 0,
    expenseVariance: 0,
    totalVariance: 0
  };
}

module.exports = exports; 