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

/**
 * Advanced Space Utilization Analysis
 * Calculate comprehensive space efficiency metrics and optimization recommendations
 */
async function getSpaceOptimizationAnalysis({ facilityId, warehouseId } = {}) {
  try {
    // Base filters
    const facilityFilter = facilityId ? { facilityId } : {};
    const warehouseFilter = warehouseId ? { warehouseId } : {};

    // Get facility areas and their utilization
    const facilityAreas = await prisma.facilityArea.findMany({
      where: facilityFilter,
      include: {
        facility: {
          include: {
            warehouses: warehouseId ? { where: { id: warehouseId } } : true
          }
        }
      }
    });

    // Get warehouse locations and inventory data
    const locations = await prisma.location.findMany({
      where: warehouseFilter,
      include: {
        WarehouseItem: {
          include: {
            inventoryItem: {
              select: { name: true, unitCost: true, sku: true }
            }
          }
        }
      }
    });

    // Calculate zone-level utilization
    const zoneUtilization = {};
    const zoneCapacity = {};
    const zoneValue = {};

    locations.forEach(location => {
      const zone = location.zone || 'UNASSIGNED';
      
      if (!zoneUtilization[zone]) {
        zoneUtilization[zone] = { occupied: 0, total: 0, value: 0, items: 0 };
        zoneCapacity[zone] = { used: 0, total: 0 };
      }

      location.WarehouseItem.forEach(item => {
        const capacity = item.maxThreshold || 100;
        const utilization = item.quantity / capacity;
        const value = item.quantity * (item.inventoryItem?.unitCost || 0);

        zoneUtilization[zone].occupied += item.quantity;
        zoneUtilization[zone].total += capacity;
        zoneUtilization[zone].value += value;
        zoneUtilization[zone].items += 1;

        zoneCapacity[zone].used += item.quantity;
        zoneCapacity[zone].total += capacity;
      });
    });

    // Calculate facility-level metrics
    const facilityMetrics = facilityAreas.map(area => ({
      id: area.id,
      name: area.name,
      areaType: area.areaType,
      squareFeet: area.squareFeet,
      currentUtilization: area.currentUtilization || 0,
      maxUtilization: area.maxUtilization || 85,
      efficiency: area.currentUtilization ? (area.currentUtilization / (area.maxUtilization || 85)) * 100 : 0,
      capacity: area.capacity || 0,
      height: area.height || 0,
      volumeUtilization: area.capacity && area.height ? 
        (area.currentUtilization / 100) * area.squareFeet * area.height : 0
    }));

    // Identify optimization opportunities
    const optimizationRecommendations = [];

    // Under-utilized areas
    facilityMetrics.forEach(area => {
      if (area.currentUtilization < 50 && area.areaType === 'WAREHOUSE_FLOOR') {
        optimizationRecommendations.push({
          type: 'UNDERUTILIZED_SPACE',
          priority: 'HIGH',
          area: area.name,
          currentUtilization: area.currentUtilization,
          recommendation: `Consider consolidating inventory or repurposing ${area.name} (${area.currentUtilization}% utilized)`,
          potentialSavings: area.squareFeet * 0.5 // Estimated cost per sq ft
        });
      }
    });

    // Over-utilized areas
    facilityMetrics.forEach(area => {
      if (area.currentUtilization > area.maxUtilization) {
        optimizationRecommendations.push({
          type: 'OVERCROWDED_SPACE',
          priority: 'CRITICAL',
          area: area.name,
          currentUtilization: area.currentUtilization,
          maxUtilization: area.maxUtilization,
          recommendation: `${area.name} is over capacity (${area.currentUtilization}% vs ${area.maxUtilization}% max). Consider expansion or redistribution.`,
          urgency: 'IMMEDIATE'
        });
      }
    });

    // Zone imbalances
    Object.entries(zoneUtilization).forEach(([zone, metrics]) => {
      const utilizationPct = (metrics.occupied / metrics.total) * 100;
      if (utilizationPct > 90) {
        optimizationRecommendations.push({
          type: 'ZONE_IMBALANCE',
          priority: 'MEDIUM',
          zone,
          utilization: utilizationPct,
          recommendation: `Zone ${zone} is ${utilizationPct.toFixed(1)}% full. Consider redistributing high-velocity items.`,
          action: 'REDISTRIBUTE'
        });
      }
    });

    return {
      facilityMetrics,
      zoneUtilization: Object.entries(zoneUtilization).map(([zone, metrics]) => ({
        zone,
        utilizationPercent: (metrics.occupied / metrics.total) * 100,
        totalItems: metrics.items,
        totalValue: metrics.value,
        capacity: zoneCapacity[zone]
      })),
      optimizationRecommendations,
      overallMetrics: {
        totalLocations: locations.length,
        occupiedLocations: locations.filter(loc => loc.WarehouseItem.length > 0).length,
        averageUtilization: facilityMetrics.reduce((sum, area) => sum + area.currentUtilization, 0) / facilityMetrics.length,
        totalSquareFeet: facilityMetrics.reduce((sum, area) => sum + area.squareFeet, 0),
        totalCapacity: facilityMetrics.reduce((sum, area) => sum + area.capacity, 0)
      }
    };
  } catch (error) {
    console.error('Error in space optimization analysis:', error);
    throw error;
  }
}

/**
 * Generate optimal slotting recommendations based on ABC analysis and velocity
 */
async function getSlottingOptimization({ warehouseId } = {}) {
  try {
    const whereClause = warehouseId ? { warehouseId } : {};

    // Get current inventory with location and movement data
    const inventoryItems = await prisma.warehouseItem.findMany({
      where: whereClause,
      include: {
        inventoryItem: {
          include: {
            StockMovement: {
              where: {
                timestamp: {
                  gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
                }
              }
            }
          }
        },
        Location: true
      }
    });

    // Calculate velocity and classify items
    const itemAnalysis = inventoryItems.map(item => {
      const movements = item.inventoryItem.StockMovement;
      const totalMovement = movements.reduce((sum, mov) => sum + mov.quantity, 0);
      const velocity = totalMovement / 90; // Daily average
      const value = item.quantity * (item.inventoryItem.unitCost || 0);

      // Current location accessibility score (closer to dock doors = higher score)
      const accessibilityScore = item.Location ? 
        Math.max(0, 100 - (Math.abs(item.Location.x || 0) + Math.abs(item.Location.y || 0)) / 10) : 0;

      return {
        id: item.id,
        itemId: item.itemId,
        sku: item.inventoryItem.sku,
        name: item.inventoryItem.name,
        quantity: item.quantity,
        velocity,
        value,
        currentLocation: item.Location,
        accessibilityScore,
        classification: velocity > 10 ? 'A' : velocity > 2 ? 'B' : 'C',
        recommendedZone: velocity > 10 ? 'FAST_PICK' : velocity > 2 ? 'STANDARD' : 'SLOW_MOVE'
      };
    });

    // Generate slotting recommendations
    const recommendations = itemAnalysis.map(item => {
      let recommendation = null;
      let priority = 'LOW';

      // High-velocity items should be in accessible locations
      if (item.classification === 'A' && item.accessibilityScore < 70) {
        recommendation = 'Move to more accessible location near dock doors';
        priority = 'HIGH';
      }
      // Low-velocity items taking up prime real estate
      else if (item.classification === 'C' && item.accessibilityScore > 80) {
        recommendation = 'Move to less accessible location to free up prime space';
        priority = 'MEDIUM';
      }
      // Medium items in wrong zones
      else if (item.classification === 'B' && (item.accessibilityScore < 40 || item.accessibilityScore > 90)) {
        recommendation = 'Relocate to standard accessibility zone';
        priority = 'MEDIUM';
      }

      return {
        ...item,
        recommendation,
        priority,
        shouldRelocate: recommendation !== null
      };
    });

    // Calculate potential improvements
    const itemsNeedingRelocation = recommendations.filter(item => item.shouldRelocate);
    const potentialPickTimeReduction = itemsNeedingRelocation
      .filter(item => item.classification === 'A')
      .reduce((sum, item) => sum + (item.velocity * 0.5), 0); // Estimated 0.5 min savings per pick

    return {
      itemAnalysis: recommendations,
      optimizationSummary: {
        totalItems: recommendations.length,
        itemsNeedingRelocation: itemsNeedingRelocation.length,
        highPriorityRelocations: itemsNeedingRelocation.filter(item => item.priority === 'HIGH').length,
        potentialPickTimeReduction,
        classificationBreakdown: {
          A: recommendations.filter(item => item.classification === 'A').length,
          B: recommendations.filter(item => item.classification === 'B').length,
          C: recommendations.filter(item => item.classification === 'C').length
        }
      }
    };
  } catch (error) {
    console.error('Error in slotting optimization:', error);
    throw error;
  }
}

/**
 * Analyze space trends and predict future needs
 */
async function getSpaceTrendAnalysis({ warehouseId, facilityId } = {}) {
  try {
    // Get historical warehouse reports for trend analysis
    const whereClause = {};
    if (warehouseId) whereClause.warehouseId = warehouseId;

    const historicalData = await prisma.warehouseReport.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' },
      take: 90 // Last 90 days
    });

    // Calculate trends
    const trends = historicalData.map((report, index) => ({
      date: report.createdAt,
      totalSkus: report.totalSkus,
      totalQuantity: report.totalQuantity,
      growth: index > 0 ? 
        ((report.totalQuantity - historicalData[index - 1].totalQuantity) / historicalData[index - 1].totalQuantity) * 100 : 0
    }));

    // Calculate growth rate
    const totalGrowth = trends.length > 1 ? 
      ((trends[trends.length - 1].totalQuantity - trends[0].totalQuantity) / trends[0].totalQuantity) * 100 : 0;
    const avgDailyGrowth = totalGrowth / trends.length;

    // Predict future space needs (6 months projection)
    const currentQuantity = trends.length > 0 ? trends[trends.length - 1].totalQuantity : 0;
    const projected6Months = currentQuantity * (1 + (avgDailyGrowth / 100) * 180);

    // Get current facility capacity
    const facilityData = facilityId ? await prisma.facility.findUnique({
      where: { id: facilityId },
      include: { facilityAreas: true }
    }) : null;

    const totalCapacity = facilityData ? 
      facilityData.facilityAreas.reduce((sum, area) => sum + (area.capacity || 0), 0) : null;

    return {
      trends,
      analysis: {
        totalGrowthPercent: totalGrowth,
        avgDailyGrowthPercent: avgDailyGrowth,
        currentQuantity,
        projected6Months,
        projectedGrowth: ((projected6Months - currentQuantity) / currentQuantity) * 100,
        capacityUtilization: totalCapacity ? (currentQuantity / totalCapacity) * 100 : null,
        projectedCapacityUtilization: totalCapacity ? (projected6Months / totalCapacity) * 100 : null,
        capacityAlert: totalCapacity && (projected6Months / totalCapacity) > 0.85
      },
      recommendations: [
        totalGrowth > 15 ? {
          type: 'CAPACITY_EXPANSION',
          priority: 'HIGH',
          message: `Inventory growing at ${totalGrowth.toFixed(1)}% - consider capacity expansion`
        } : null,
        avgDailyGrowth < -1 ? {
          type: 'SPACE_CONSOLIDATION',
          priority: 'MEDIUM',
          message: `Declining inventory trend - opportunity for space consolidation`
        } : null
      ].filter(Boolean)
    };
  } catch (error) {
    console.error('Error in space trend analysis:', error);
    throw error;
  }
}

/**
 * Calculate optimal warehouse layout based on product flow
 */
async function getLayoutOptimization({ warehouseId } = {}) {
  try {
    const whereClause = warehouseId ? { warehouseId } : {};

    // Get pick task data to understand movement patterns
    const pickTasks = await prisma.pickTask.findMany({
      where: {
        ...whereClause,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      include: {
        fromLocation: true,
        toLocation: true,
        inventoryItem: true
      }
    });

    // Analyze movement patterns between zones
    const zoneMovements = {};
    const itemFrequency = {};

    pickTasks.forEach(task => {
      const fromZone = task.fromLocation?.zone || 'UNKNOWN';
      const toZone = task.toLocation?.zone || 'SHIPPING';
      const itemId = task.inventoryItemId;

      // Track zone-to-zone movements
      const movementKey = `${fromZone}->${toZone}`;
      zoneMovements[movementKey] = (zoneMovements[movementKey] || 0) + 1;

      // Track item pick frequency
      itemFrequency[itemId] = (itemFrequency[itemId] || 0) + 1;
    });

    // Identify most common paths
    const sortedMovements = Object.entries(zoneMovements)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    // Calculate average travel distance (simplified)
    let totalDistance = 0;
    let totalPicks = 0;

    pickTasks.forEach(task => {
      if (task.fromLocation && task.toLocation) {
        const distance = Math.sqrt(
          Math.pow(task.fromLocation.x - task.toLocation.x, 2) +
          Math.pow(task.fromLocation.y - task.toLocation.y, 2)
        );
        totalDistance += distance;
        totalPicks++;
      }
    });

    const avgTravelDistance = totalPicks > 0 ? totalDistance / totalPicks : 0;

    // Generate layout recommendations
    const layoutRecommendations = [];

    // If high-frequency items are far from shipping
    const highFrequencyItems = Object.entries(itemFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20);

    // Add recommendations based on analysis
    if (avgTravelDistance > 50) {
      layoutRecommendations.push({
        type: 'REDUCE_TRAVEL_DISTANCE',
        priority: 'HIGH',
        message: `Average pick travel distance is ${avgTravelDistance.toFixed(1)} units. Consider moving high-frequency items closer to shipping.`,
        impact: 'Potential 15-25% reduction in pick times'
      });
    }

    return {
      movementAnalysis: {
        totalPicks: pickTasks.length,
        avgTravelDistance,
        topMovementPaths: sortedMovements,
        highFrequencyItems: highFrequencyItems.slice(0, 10)
      },
      layoutRecommendations,
      optimizationPotential: {
        estimatedTimeReduction: Math.max(0, (avgTravelDistance - 30) * 0.1), // Simplified calculation
        efficiencyScore: Math.max(0, 100 - avgTravelDistance)
      }
    };
  } catch (error) {
    console.error('Error in layout optimization:', error);
    throw error;
  }
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
  getSpaceOptimizationAnalysis,
  getSlottingOptimization,
  getSpaceTrendAnalysis,
  getLayoutOptimization,
  // TODO: getFuelAndIdle, getRouteEfficiency
}; 