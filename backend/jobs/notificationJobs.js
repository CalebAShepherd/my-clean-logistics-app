const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendNotification } = require('../services/notificationService');

// Schedule job to check for late shipments every hour at minute 0
cron.schedule('0 * * * *', async () => {
  console.log('Running late shipment alert job...');
  try {
    const now = new Date();
    // Find shipments that are late: not delivered and shipmentDate is in the past
    const lateShipments = await prisma.shipment.findMany({
      where: {
        status: { in: ['IN_TRANSIT', 'OUT_FOR_DEL'] },
        shipmentDate: { lt: now }
      }
    });
    for (const shipment of lateShipments) {
      try {
        await sendNotification({
          userId: shipment.clientId,
          type: 'late_shipment',
          title: `Shipment ${shipment.id} is late`,
          message: `Expected delivery was ${shipment.shipmentDate.toISOString()}`,
          metadata: { shipmentId: shipment.id }
        });
      } catch (err) {
        console.error('Error sending late shipment notification for', shipment.id, err);
      }
    }
  } catch (err) {
    console.error('Late shipment alert job failed:', err);
  }
}); 