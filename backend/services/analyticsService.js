const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get on-time vs late deliveries in a given window
 * @param {Date} start
 * @param {Date} end
 */
async function getOnTimeLateStats(start, end) {
  // deliveredAt <= shipmentDate => on-time, else late
  const deliveries = await prisma.shipment.findMany({
    where: {
      status: 'DELIVERED',
      deliveredAt: { gte: start, lte: end }
    },
    select: { deliveredAt: true, shipmentDate: true }
  });
  let onTime = 0;
  let late = 0;
  deliveries.forEach(d => {
    if (d.deliveredAt <= d.shipmentDate) onTime++;
    else late++;
  });
  return { onTime, late };
}

/**
 * Get total completed deliveries in a window
 */
async function getCompletedCount(start, end) {
  const total = await prisma.shipment.count({
    where: { status: 'DELIVERED', deliveredAt: { gte: start, lte: end } }
  });
  return { total };
}

/**
 * Get delivery volume trends grouped by period (day/week/month)
 * @param {Date} start
 * @param {Date} end
 * @param {'day'|'week'|'month'} period
 */
async function getDeliveryTrends(start, end, period = 'day') {
  // Raw query using DATE_TRUNC for Postgres
  const format = period === 'day' ? 'YYYY-MM-DD'
    : period === 'week' ? 'IYYY-IW' : 'YYYY-MM';
  const result = await prisma.$queryRaw`
    SELECT to_char("deliveredAt", ${format}) as period,
           count(*)::int as count
    FROM "Shipment"
    WHERE status = 'DELIVERED'
      AND "deliveredAt" BETWEEN ${start} AND ${end}
    GROUP BY period
    ORDER BY period
  `;
  return result;
}

/**
 * Get stock turnover (number of movements) grouped by period
 * @param {'day'|'week'|'month'|'year'} period
 */
async function getStockTurnover(period = 'week') {
  const now = new Date();
  let start;
  switch (period) {
    case 'day':
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'week':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      start = new Date(0);
  }
  const end = now;
  const format =
    period === 'day'
      ? 'YYYY-MM-DD'
      : period === 'week'
      ? 'IYYY-IW'
      : period === 'month'
      ? 'YYYY-MM'
      : period === 'year'
      ? 'YYYY'
      : 'YYYY-MM-DD';

  const result = await prisma.$queryRaw`
    SELECT to_char("timestamp", ${format}) as period,
           count(*)::int as count
    FROM "StockMovement"
    WHERE "timestamp" BETWEEN ${start} AND ${end}
    GROUP BY period
    ORDER BY period
  `;
  return result;
}

/**
 * Get space usage metrics (e.g., total SKUs, total quantity)
 */
async function getSpaceUsage() {
  const usageData = await prisma.warehouseItem.findMany({
    select: { itemId: true, quantity: true }
  });
  const skuSet = new Set(usageData.map((u) => u.itemId));
  const totalSkus = skuSet.size;
  const totalQuantity = usageData.reduce((sum, u) => sum + u.quantity, 0);
  return { totalSkus, totalQuantity };
}

/**
 * Get receiving speed metrics (e.g., avg time between inbound logs) in hours
 */
async function getReceivingSpeed() {
  const movements = await prisma.stockMovement.findMany({
    where: { type: 'INBOUND' },
    orderBy: { timestamp: 'asc' },
    select: { timestamp: true }
  });
  if (movements.length < 2) {
    return { averageTime: 0 };
  }
  let totalDiff = 0;
  for (let i = 1; i < movements.length; i++) {
    totalDiff += movements[i].timestamp - movements[i - 1].timestamp;
  }
  const avgMs = totalDiff / (movements.length - 1);
  const avgHours = avgMs / (1000 * 60 * 60);
  return { averageTime: Number(avgHours.toFixed(2)) };
}

module.exports = {
  getOnTimeLateStats,
  getCompletedCount,
  getDeliveryTrends,
  getStockTurnover,
  getSpaceUsage,
  getReceivingSpeed,
  // TODO: getFuelAndIdle, getRouteEfficiency
}; 