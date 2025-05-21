const cron = require('node-cron');
const analyticsService = require('../services/analyticsService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendNotification } = require('../services/notificationService');

// Low stock threshold (absolute quantity)
const LOW_STOCK_THRESHOLD = parseInt(process.env.LOW_STOCK_THRESHOLD, 10) || 100;

// Daily warehouse reports at midnight
cron.schedule('0 0 * * *', async () => {
  try {
    const warehouses = await prisma.warehouse.findMany({ select: { id: true } });
    for (const { id: warehouseId } of warehouses) {
      const { totalSkus, totalQuantity } = await analyticsService.getSpaceUsage({ warehouseId });
      const report = await prisma.warehouseReport.create({
        data: { warehouseId, totalSkus, totalQuantity },
      });
      // Send low-stock alert if below threshold
      if (totalQuantity <= LOW_STOCK_THRESHOLD) {
        // notify all warehouse_admin users for this warehouse
        const admins = await prisma.user.findMany({
          where: { warehouseId, role: 'warehouse_admin' }
        });
        for (const { id: userId } of admins) {
          await sendNotification({
            userId,
            type: 'warehouse.low_stock',
            title: 'Low Stock Alert',
            message: `Warehouse ${warehouseId} total stock ${totalQuantity} is below threshold ${LOW_STOCK_THRESHOLD}`,
            metadata: { reportId: report.id }
          });
        }
      }
    }
    console.log('Warehouse daily reports generated:', new Date().toISOString());
  } catch (err) {
    console.error('Error generating warehouse reports:', err);
  }
}); 