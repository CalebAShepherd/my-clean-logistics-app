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
 * Get total in-transit shipments (status IN_TRANSIT or OUT_FOR_DEL)
 */
async function getInTransitCount() {
  const total = await prisma.shipment.count({
    where: { status: { in: ['IN_TRANSIT', 'OUT_FOR_DEL'] } }
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
 * Forecast delivery volumes based on historical trends
 * @param {Date} start
 * @param {Date} end
 * @param {'day'|'week'|'month'} period
 * @param {'sma'|'exp'|'linear'} method
 * @param {number} window
 */
async function getForecast(start, end, period = 'day', method = 'sma', window = 3) {
  // Fetch historical trends
  const trends = await getDeliveryTrends(start, end, period);
  if (method === 'sma') {
    // Simple Moving Average over the last `window` points
    if (trends.length < window) {
      return { trends, forecast: null };
    }
    const values = trends.map((r) => r.count);
    const lastValues = values.slice(-window);
    const avg = lastValues.reduce((sum, v) => sum + v, 0) / window;
    // Determine next period label (only accurate for 'day')
    let nextPeriodLabel = 'next';
    if (period === 'day') {
      const lastDate = new Date(trends[trends.length - 1].period);
      nextPeriodLabel = lastDate
        .toISOString()
        .slice(0, 10);
      // add one day
      const nextDate = new Date(new Date(nextPeriodLabel).getTime() + 24 * 60 * 60 * 1000);
      nextPeriodLabel = nextDate.toISOString().slice(0, 10);
    }
    return {
      trends,
      forecast: { period: nextPeriodLabel, count: Math.round(avg) }
    };
  }
  // Fallback: no advanced method implemented
  return { trends, forecast: null };
}

/**
 * Get stock turnover (number of movements) grouped by period, optionally filtered by warehouse and date range
 * @param {{ warehouseId?: string, start?: string, end?: string, period?: 'day'|'week'|'month'|'year' }} options
 */
async function getStockTurnover({ warehouseId, start, end, period = 'week' }) {
  const now = new Date();
  let startDate, endDate;
  if (start && end) {
    startDate = new Date(start);
    endDate = new Date(end);
  } else {
    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0);
    }
    endDate = now;
  }
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

  // Build WHERE clauses
  const whereClauses = [
    `"timestamp" BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}'`
  ];
  if (warehouseId) {
    whereClauses.unshift(`"warehouseId" = ${Number(warehouseId)}`);
  }
  const where = whereClauses.join(' AND ');

  const query = `
    SELECT to_char("timestamp", '${format}') AS period,
           count(*)::int AS count
    FROM "StockMovement"
    WHERE ${where}
    GROUP BY period
    ORDER BY period
  `;
  const result = await prisma.$queryRawUnsafe(query);
  return result;
}

/**
 * Get space usage metrics, optionally filtered by warehouse or zone
 * @param {{ warehouseId?: string, zone?: string }} options
 */
async function getSpaceUsage({ warehouseId, zone } = {}) {
  // Filter by warehouseId and/or zone through the Location relation
  const whereClause = {};
  if (warehouseId) whereClause.warehouseId = Number(warehouseId);
  if (zone) whereClause.Location = { zone };
  const usageData = await prisma.warehouseItem.findMany({
    where: whereClause,
    select: {
      itemId: true,
      quantity: true,
      Location: { select: { zone: true } }
    }
  });
  const byZone = {};
  const bySku = {};
  usageData.forEach(({ itemId, quantity, Location }) => {
    const z = Location?.zone || 'Unspecified';
    byZone[z] = (byZone[z] || 0) + quantity;
    bySku[itemId] = (bySku[itemId] || 0) + quantity;
  });
  // Compute totals
  const totalSkus = Object.keys(bySku).length;
  const totalQuantity = Object.values(bySku).reduce((sum, q) => sum + q, 0);
  return { byZone, bySku, totalSkus, totalQuantity };
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

// Get inventory aging buckets based on inbound stock movements
/**
 * @param {{ warehouseId?: string }} options
 */
async function getInventoryAging({ warehouseId } = {}) {
  const whereClauses = [`type = 'INBOUND'`];
  if (warehouseId) {
    whereClauses.push(`"warehouseId" = ${Number(warehouseId)}`);
  }
  const where = whereClauses.join(' AND ');
  const query = `
    SELECT
      CASE
        WHEN NOW() - "timestamp" <= INTERVAL '30 days' THEN '0-30'
        WHEN NOW() - "timestamp" <= INTERVAL '60 days' THEN '31-60'
        ELSE '61+' END AS bucket,
      SUM(quantity)::int AS total
    FROM "StockMovement"
    WHERE ${where}
    GROUP BY bucket
    ORDER BY bucket;
  `;
  const result = await prisma.$queryRawUnsafe(query);
  return result;
}

/**
 * Compute ABC classification for SKUs based on consumption value
 * @param {{ warehouseId?: string }} options
 */
async function getABCAnalysis({ warehouseId } = {}) {
  // Build optional warehouse filter clause
  let warehouseFilter = '';
  if (warehouseId) {
    warehouseFilter = `AND sm."warehouseId" = ${Number(warehouseId)}`;
  }

  // Raw SQL to compute ABC: usage value per SKU and cumulative percentage
  const query = `
    WITH usage AS (
      SELECT sm."itemId", SUM(sm.quantity * ii."unitCost")::float AS value
      FROM "StockMovement" sm
      JOIN "InventoryItem" ii ON sm."itemId" = ii.id
      WHERE sm.type = 'OUTBOUND'
      ${warehouseFilter}
      GROUP BY sm."itemId"
    ), total AS (
      SELECT COALESCE(SUM(value), 0) AS totalValue FROM usage
    ), ranking AS (
      SELECT u."itemId", u.value,
             u.value / NULLIF(t.totalValue, 0) AS pct,
             SUM(u.value) OVER (ORDER BY u.value DESC) / NULLIF(t.totalValue, 0) AS cumPct
      FROM usage u CROSS JOIN total t
    )
    SELECT "itemId", value,
           CASE
             WHEN cumPct <= 0.7 THEN 'A'
             WHEN cumPct <= 0.9 THEN 'B'
             ELSE 'C'
           END AS bucket
    FROM ranking
    ORDER BY value DESC;
  `;
  const result = await prisma.$queryRawUnsafe(query);
  return result;
}

/**
 * Get SKUs with low movement counts (slow-moving or dead stock)
 * @param {{ warehouseId?: string, days?: number, threshold?: number }} options
 */
async function getSlowMovers({ warehouseId, days = 30, threshold = 1 } = {}) {
  // Build optional warehouse filter clause
  let warehouseFilter = '';
  if (warehouseId) {
    warehouseFilter = `AND sm."warehouseId" = ${Number(warehouseId)}`;
  }

  const query = `
    SELECT sm."itemId", COUNT(*)::int AS movementCount
    FROM "StockMovement" sm
    WHERE sm.type = 'OUTBOUND'
      AND sm."timestamp" >= NOW() - INTERVAL '${Number(days)} days'
      ${warehouseFilter}
    GROUP BY sm."itemId"
    HAVING COUNT(*) <= ${Number(threshold)}
    ORDER BY movementCount ASC;
  `;
  const result = await prisma.$queryRawUnsafe(query);
  return result;
}

/**
 * Get shipments whose transit times are > sigma stddev above mean
 * @param {Date} start
 * @param {Date} end
 * @param {number} sigma
 */
async function getDeliveryAnomalies(start, end, sigma = 2) {
  // Compute transit time (in seconds) per shipment
  const query = `
    WITH diffs AS (
      SELECT id, EXTRACT(EPOCH FROM ("deliveredAt" - "shipmentDate")) AS transitSecs
      FROM "Shipment"
      WHERE status = 'DELIVERED'
        AND "deliveredAt" BETWEEN '${start.toISOString()}' AND '${end.toISOString()}'
        AND "shipmentDate" IS NOT NULL
    ), stats AS (
      SELECT
        COALESCE(AVG(transitSecs),0) AS avgSecs,
        COALESCE(STDDEV_POP(transitSecs),0) AS stdSecs
      FROM diffs
    )
    SELECT d.id, d.transitSecs
    FROM diffs d CROSS JOIN stats s
    WHERE d.transitSecs > s.avgSecs + (s.stdSecs * ${sigma})
    ORDER BY d.transitSecs DESC;
  `;
  const result = await prisma.$queryRawUnsafe(query);
  return result;
}

/**
 * Get warehouse reports filtered by warehouse and date range
 * @param {{ warehouseId?: string, start?: string, end?: string }} options
 */
async function getWarehouseReports({ warehouseId, start, end } = {}) {
  const where = {};
  if (warehouseId) where.warehouseId = warehouseId;
  if (start || end) where.reportDate = {};
  if (start) where.reportDate.gte = new Date(start);
  if (end) where.reportDate.lte = new Date(end);
  const reports = await prisma.warehouseReport.findMany({
    where,
    orderBy: { reportDate: 'desc' },
    select: { id: true, warehouseId: true, reportDate: true, totalSkus: true, totalQuantity: true }
  });
  return reports;
}

/**
 * Get rack utilization data for heatmap
 * @param {{ warehouseId: string }} options
 */
async function getRackUtilization({ warehouseId } = {}) {
  // Join WarehouseItem with Location to get coordinates and compute utilization
  const items = await prisma.warehouseItem.findMany({
    where: { warehouseId },
    select: {
      quantity: true,
      maxThreshold: true,
      Location: { select: { x: true, y: true, id: true } }
    }
  });
  // Skip any items without a defined Location
  const validItems = items.filter(item => item.Location !== null);
  return validItems.map(({ quantity, maxThreshold, Location }) => {
    const capacity = maxThreshold ?? quantity;
    const utilization = capacity > 0 ? quantity / capacity : 0;
    return {
      rackId: Location.id,
      x: Location.x ?? 0,
      y: Location.y ?? 0,
      quantity,
      capacity,
      utilization
    };
  });
}

module.exports = {
  getOnTimeLateStats,
  getCompletedCount,
  getInTransitCount,
  getDeliveryTrends,
  getForecast,
  getStockTurnover,
  getSpaceUsage,
  getReceivingSpeed,
  getInventoryAging,
  getABCAnalysis,
  getSlowMovers,
  getDeliveryAnomalies,
  getWarehouseReports,
  getRackUtilization,
  // TODO: getFuelAndIdle, getRouteEfficiency
}; 