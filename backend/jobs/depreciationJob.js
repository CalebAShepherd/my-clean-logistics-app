const cron = require('node-cron');
const depreciationService = require('../services/depreciationService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Schedule monthly depreciation job
 * Runs on the 1st day of each month at 2:00 AM
 */
const scheduleMonthlyDepreciation = () => {
  cron.schedule('0 2 1 * *', async () => {
    console.log('Starting monthly depreciation job...');
    
    try {
      // Get all active tenants
      const tenants = await prisma.tenant.findMany({
        select: { id: true, name: true }
      });

      const results = [];

      for (const tenant of tenants) {
        try {
          console.log(`Processing depreciation for tenant: ${tenant.name}`);
          
          // Get the last day of the previous month
          const now = new Date();
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 0);
          
          const result = await depreciationService.postMonthlyDepreciation(tenant.id, lastMonth);
          
          results.push({
            tenantId: tenant.id,
            tenantName: tenant.name,
            success: true,
            ...result
          });
          
          console.log(`Depreciation completed for ${tenant.name}: ${result.totalAmount || 0}`);
        } catch (err) {
          console.error(`Error processing depreciation for tenant ${tenant.name}:`, err);
          results.push({
            tenantId: tenant.id,
            tenantName: tenant.name,
            success: false,
            error: err.message
          });
        }
      }

      console.log('Monthly depreciation job completed:', results);
      
      // Optionally, you could send a summary email or notification here
      
    } catch (err) {
      console.error('Error in monthly depreciation job:', err);
    }
  });
  
  console.log('Monthly depreciation job scheduled');
};

/**
 * Run depreciation manually for a specific tenant
 */
const runDepreciationForTenant = async (tenantId, asOfDate = new Date()) => {
  try {
    console.log(`Running manual depreciation for tenant: ${tenantId}`);
    
    const result = await depreciationService.postMonthlyDepreciation(tenantId, asOfDate);
    
    console.log('Manual depreciation completed:', result);
    return result;
  } catch (err) {
    console.error('Error in manual depreciation:', err);
    throw err;
  }
};

/**
 * Initialize depreciation job
 */
const initializeDepreciationJob = () => {
  console.log('Initializing depreciation job...');
  scheduleMonthlyDepreciation();
};

module.exports = {
  initializeDepreciationJob,
  runDepreciationForTenant,
  scheduleMonthlyDepreciation
}; 