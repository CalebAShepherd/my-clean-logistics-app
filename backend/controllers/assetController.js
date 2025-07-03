const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all assets with filters
const getAssets = async (req, res) => {
  try {
    const {
      warehouseId,
      category,
      status,
      condition,
      assignedTo,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build filter conditions
    const where = {};
    
    if (warehouseId && warehouseId !== 'all') {
      where.warehouseId = warehouseId;
    }
    
    if (category && category !== 'all') {
      where.category = category;
    }
    
    if (status && status !== 'all') {
      where.status = status;
    }
    
    if (condition && condition !== 'all') {
      where.condition = condition;
    }
    
    if (assignedTo && assignedTo !== 'all') {
      where.assignedTo = assignedTo;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { assetNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { manufacturer: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [assets, totalCount] = await Promise.all([
      prisma.asset.findMany({
        where,
        skip,
        take,
        orderBy: {
          [sortBy]: sortOrder
        },
        include: {
          warehouse: {
            select: { id: true, name: true }
          },
          location: {
            select: { id: true, zone: true, aisle: true, shelf: true, bin: true }
          },
          assignedUser: {
            select: { id: true, username: true, email: true }
          },
          supplier: {
            select: { id: true, name: true }
          },
          purchaseOrder: {
            select: { id: true, orderNumber: true }
          },
          maintenanceSchedules: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              nextMaintenanceDate: true,
              priority: true
            }
          },
          workOrders: {
            where: { status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] } },
            select: {
              id: true,
              workOrderNumber: true,
              title: true,
              status: true,
              priority: true,
              dueDate: true
            }
          },
          _count: {
            select: {
              maintenanceHistory: true,
              workOrders: true
            }
          }
        }
      }),
      prisma.asset.count({ where })
    ]);

    // Calculate depreciation for each asset
    const assetsWithDepreciation = assets.map(asset => {
      const currentDepreciation = calculateDepreciation(asset);
      return {
        ...asset,
        currentDepreciation,
        bookValue: asset.currentValue || (asset.purchaseCost - currentDepreciation)
      };
    });

    res.json({
      assets: assetsWithDepreciation,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / take),
        totalCount,
        hasNext: skip + take < totalCount,
        hasPrev: skip > 0
      }
    });
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
};

// Get single asset by ID
const getAssetById = async (req, res) => {
  try {
    const { id } = req.params;

    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        warehouse: true,
        location: true,
        assignedUser: {
          select: { id: true, username: true, email: true, role: true }
        },
        supplier: true,
        purchaseOrder: true,
        maintenanceSchedules: {
          include: {
            workOrders: {
              where: { status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] } },
              orderBy: { createdAt: 'desc' }
            }
          }
        },
        workOrders: {
          include: {
            assignedUser: {
              select: { id: true, username: true, email: true }
            },
            partsUsed: true
          },
          orderBy: { createdAt: 'desc' }
        },
        maintenanceHistory: {
          include: {
            performedByUser: {
              select: { id: true, username: true, email: true }
            },
            workOrder: {
              select: { id: true, workOrderNumber: true, title: true }
            }
          },
          orderBy: { maintenanceDate: 'desc' },
          take: 10
        },
        assetReadings: {
          orderBy: { readingDate: 'desc' },
          take: 20
        },
        depreciationRecords: {
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          take: 12
        }
      }
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Calculate current depreciation
    const currentDepreciation = calculateDepreciation(asset);
    const bookValue = asset.currentValue || (asset.purchaseCost - currentDepreciation);

    // Get upcoming maintenance
    const upcomingMaintenance = await prisma.maintenanceSchedule.findMany({
      where: {
        assetId: id,
        isActive: true,
        nextMaintenanceDate: {
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Next 30 days
        }
      },
      orderBy: { nextMaintenanceDate: 'asc' }
    });

    res.json({
      ...asset,
      currentDepreciation,
      bookValue,
      upcomingMaintenance
    });
  } catch (error) {
    console.error('Error fetching asset:', error);
    res.status(500).json({ error: 'Failed to fetch asset' });
  }
};

// Create new asset
const createAsset = async (req, res) => {
  try {
    const {
      assetNumber,
      name,
      description,
      category,
      subCategory,
      warehouseId,
      locationId,
      assignedTo,
      supplierId,
      purchaseDate,
      purchaseCost,
      purchaseOrderId,
      status = 'ACTIVE',
      condition = 'EXCELLENT',
      depreciationMethod = 'STRAIGHT_LINE',
      depreciationRate,
      usefulLifeYears,
      salvageValue = 0,
      serialNumber,
      modelNumber,
      manufacturer,
      specifications,
      warrantyStart,
      warrantyEnd,
      warrantyProvider,
      certifications,
      complianceNotes,
      nextInspectionDate
    } = req.body;

    // Check if asset number already exists
    const existingAsset = await prisma.asset.findUnique({
      where: { assetNumber }
    });

    if (existingAsset) {
      return res.status(400).json({ error: 'Asset number already exists' });
    }

    // Calculate current value based on depreciation
    const currentValue = calculateCurrentValue({
      purchaseCost,
      purchaseDate,
      depreciationMethod,
      depreciationRate,
      usefulLifeYears,
      salvageValue
    });

    const asset = await prisma.asset.create({
      data: {
        assetNumber,
        name,
        description,
        category,
        subCategory,
        warehouseId,
        locationId,
        assignedTo,
        supplierId,
        purchaseDate: new Date(purchaseDate),
        purchaseCost,
        purchaseOrderId,
        status,
        condition,
        currentValue,
        depreciationMethod,
        depreciationRate,
        usefulLifeYears,
        salvageValue,
        serialNumber,
        modelNumber,
        manufacturer,
        specifications,
        warrantyStart: warrantyStart ? new Date(warrantyStart) : null,
        warrantyEnd: warrantyEnd ? new Date(warrantyEnd) : null,
        warrantyProvider,
        certifications,
        complianceNotes,
        nextInspectionDate: nextInspectionDate ? new Date(nextInspectionDate) : null
      },
      include: {
        warehouse: true,
        location: true,
        assignedUser: {
          select: { id: true, username: true, email: true }
        },
        supplier: true
      }
    });

    // Create initial depreciation record if needed
    if (depreciationMethod && usefulLifeYears) {
      await createDepreciationRecord(asset.id, purchaseDate);
    }

    res.status(201).json(asset);
  } catch (error) {
    console.error('Error creating asset:', error);
    res.status(500).json({ error: 'Failed to create asset' });
  }
};

// Update asset
const updateAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Convert date strings to Date objects
    if (updateData.purchaseDate) {
      updateData.purchaseDate = new Date(updateData.purchaseDate);
    }
    if (updateData.warrantyStart) {
      updateData.warrantyStart = new Date(updateData.warrantyStart);
    }
    if (updateData.warrantyEnd) {
      updateData.warrantyEnd = new Date(updateData.warrantyEnd);
    }
    if (updateData.nextInspectionDate) {
      updateData.nextInspectionDate = new Date(updateData.nextInspectionDate);
    }

    // Recalculate current value if depreciation-related fields are updated
    if (updateData.purchaseCost || updateData.depreciationRate || updateData.usefulLifeYears) {
      const existingAsset = await prisma.asset.findUnique({
        where: { id }
      });

      if (existingAsset) {
        updateData.currentValue = calculateCurrentValue({
          purchaseCost: updateData.purchaseCost || existingAsset.purchaseCost,
          purchaseDate: updateData.purchaseDate || existingAsset.purchaseDate,
          depreciationMethod: updateData.depreciationMethod || existingAsset.depreciationMethod,
          depreciationRate: updateData.depreciationRate || existingAsset.depreciationRate,
          usefulLifeYears: updateData.usefulLifeYears || existingAsset.usefulLifeYears,
          salvageValue: updateData.salvageValue || existingAsset.salvageValue
        });
      }
    }

    const asset = await prisma.asset.update({
      where: { id },
      data: updateData,
      include: {
        warehouse: true,
        location: true,
        assignedUser: {
          select: { id: true, username: true, email: true }
        },
        supplier: true
      }
    });

    res.json(asset);
  } catch (error) {
    console.error('Error updating asset:', error);
    res.status(500).json({ error: 'Failed to update asset' });
  }
};

// Delete asset
const deleteAsset = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if asset has active maintenance schedules or work orders
    const activeRecords = await prisma.asset.findUnique({
      where: { id },
      include: {
        maintenanceSchedules: {
          where: { isActive: true }
        },
        workOrders: {
          where: { status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] } }
        }
      }
    });

    if (activeRecords?.maintenanceSchedules.length > 0 || activeRecords?.workOrders.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete asset with active maintenance schedules or work orders'
      });
    }

    await prisma.asset.delete({
      where: { id }
    });

    res.json({ message: 'Asset deleted successfully' });
  } catch (error) {
    console.error('Error deleting asset:', error);
    res.status(500).json({ error: 'Failed to delete asset' });
  }
};

// Analytics endpoints
const getAssetAnalytics = async (req, res) => {
  try {
    const { timeRange = '3months', assetId } = req.query;
    const companyId = req.user.companyId;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case '1month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case '3months':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case '6months':
        startDate.setMonth(endDate.getMonth() - 6);
        break;
      case '1year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(endDate.getMonth() - 3);
    }

    const whereClause = {
      companyId,
      ...(assetId && { id: assetId }),
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };

    // Get basic analytics
    const [
      totalAssets,
      totalValue,
      activeAssets,
      maintenanceAssets,
      averageCondition,
      categoryBreakdown,
      conditionBreakdown,
      valueHistory,
      topAssets,
      alerts
    ] = await Promise.all([
      prisma.asset.count({ where: { companyId, ...(assetId && { id: assetId }) } }),
      
      prisma.asset.aggregate({
        where: { companyId, ...(assetId && { id: assetId }) },
        _sum: { purchasePrice: true, currentValue: true }
      }),
      
      prisma.asset.count({
        where: { companyId, status: 'ACTIVE', ...(assetId && { id: assetId }) }
      }),
      
      prisma.asset.count({
        where: { companyId, status: 'MAINTENANCE', ...(assetId && { id: assetId }) }
      }),
      
      prisma.asset.aggregate({
        where: { companyId, ...(assetId && { id: assetId }) },
        _avg: { currentValue: true }
      }),
      
      // Category breakdown
      prisma.asset.groupBy({
        by: ['category'],
        where: { companyId, ...(assetId && { id: assetId }) },
        _count: true
      }),
      
      // Condition breakdown
      prisma.asset.groupBy({
        by: ['condition'],
        where: { companyId, ...(assetId && { id: assetId }) },
        _count: true
      }),
      
      // Value history (mock data for now - would need historical tracking)
      generateValueHistory(startDate, endDate),
      
      // Top assets by value
      prisma.asset.findMany({
        where: { companyId, ...(assetId && { id: assetId }) },
        orderBy: { currentValue: 'desc' },
        take: 10,
        select: {
          id: true,
          name: true,
          category: true,
          currentValue: true,
          condition: true,
          status: true
        }
      }),
      
      // Generate alerts based on asset conditions
      generateAssetAlerts(companyId, assetId)
    ]);

    // Calculate maintenance costs
    const maintenanceData = await prisma.workOrder.aggregate({
      where: {
        asset: { companyId, ...(assetId && { id: assetId }) },
        createdAt: { gte: startDate, lte: endDate }
      },
      _sum: { estimatedCost: true, actualCost: true }
    });

    // Calculate utilization rate (mock calculation)
    const utilizationRate = ((activeAssets / Math.max(totalAssets, 1)) * 100);

    // Calculate growth metrics (mock data)
    const assetsGrowth = 5.2; // Would calculate from historical data
    const valueChange = 2.8;
    const utilizationChange = 1.5;
    const maintenanceChange = -3.2;

    res.json({
      totalAssets,
      totalValue: totalValue._sum.currentValue || 0,
      utilizationRate,
      maintenanceCosts: maintenanceData._sum.actualCost || maintenanceData._sum.estimatedCost || 0,
      assetsGrowth,
      valueChange,
      utilizationChange,
      maintenanceChange,
      categoryBreakdown: categoryBreakdown.map(item => ({
        category: item.category,
        count: item._count
      })),
      conditionBreakdown: conditionBreakdown.map(item => ({
        condition: item.condition,
        count: item._count
      })),
      valueHistory,
      topAssets,
      alerts,
      activeAssets,
      maintenanceAssets,
      averageValue: averageCondition._avg.currentValue || 0
    });
  } catch (error) {
    console.error('Error fetching asset analytics:', error);
    res.status(500).json({ error: 'Failed to fetch asset analytics' });
  }
};

const getAssetMetrics = async (req, res) => {
  try {
    const { timeRange = '3months', assetId } = req.query;
    const companyId = req.user.companyId;

    // Get detailed metrics
    const metrics = await prisma.asset.findMany({
      where: { 
        companyId,
        ...(assetId && { id: assetId })
      },
      include: {
        workOrders: {
          where: {
            createdAt: {
              gte: getDateFromTimeRange(timeRange)
            }
          },
          select: {
            id: true,
            status: true,
            estimatedCost: true,
            actualCost: true,
            estimatedDuration: true,
            actualDuration: true,
            createdAt: true
          }
        },
        assetReadings: {
          where: {
            timestamp: {
              gte: getDateFromTimeRange(timeRange)
            }
          },
          orderBy: { timestamp: 'desc' },
          take: 100
        },
        depreciationRecords: {
          where: {
            date: {
              gte: getDateFromTimeRange(timeRange)
            }
          },
          orderBy: { date: 'desc' }
        }
      }
    });

    // Calculate performance metrics for each asset
    const assetMetrics = metrics.map(asset => {
      const totalMaintenanceCost = asset.workOrders.reduce((sum, wo) => 
        sum + (wo.actualCost || wo.estimatedCost || 0), 0
      );
      
      const totalDowntime = asset.workOrders.reduce((sum, wo) => 
        sum + (wo.actualDuration || wo.estimatedDuration || 0), 0
      );
      
      const completedWorkOrders = asset.workOrders.filter(wo => wo.status === 'COMPLETED').length;
      const totalWorkOrders = asset.workOrders.length;
      
      return {
        assetId: asset.id,
        name: asset.name,
        category: asset.category,
        totalMaintenanceCost,
        totalDowntime,
        workOrderCompletion: totalWorkOrders > 0 ? (completedWorkOrders / totalWorkOrders) * 100 : 0,
        utilizationRate: calculateUtilizationRate(asset),
        efficiency: calculateEfficiencyScore(asset),
        lastReading: asset.assetReadings[0] || null,
        depreciationRate: calculateDepreciationRate(asset.depreciationRecords)
      };
    });

    res.json({
      metrics: assetMetrics,
      summary: {
        totalAssets: metrics.length,
        avgMaintenanceCost: assetMetrics.reduce((sum, m) => sum + m.totalMaintenanceCost, 0) / metrics.length,
        avgDowntime: assetMetrics.reduce((sum, m) => sum + m.totalDowntime, 0) / metrics.length,
        avgUtilization: assetMetrics.reduce((sum, m) => sum + m.utilizationRate, 0) / metrics.length
      }
    });
  } catch (error) {
    console.error('Error fetching asset metrics:', error);
    res.status(500).json({ error: 'Failed to fetch asset metrics' });
  }
};

const getAssetTrends = async (req, res) => {
  try {
    const { timeRange = '3months', assetId } = req.query;
    const companyId = req.user.companyId;

    const startDate = getDateFromTimeRange(timeRange);
    const endDate = new Date();

    // Generate monthly trends
    const trends = await generateMonthlyTrends(companyId, startDate, endDate, assetId);

    res.json({
      trends,
      period: timeRange,
      startDate,
      endDate
    });
  } catch (error) {
    console.error('Error fetching asset trends:', error);
    res.status(500).json({ error: 'Failed to fetch asset trends' });
  }
};

const getAssetUtilization = async (req, res) => {
  try {
    const { assetId } = req.params;
    const { timeRange = '30days' } = req.query;
    const companyId = req.user.companyId;

    const asset = await prisma.asset.findUnique({
      where: { id: assetId, companyId },
      include: {
        assetReadings: {
          where: {
            timestamp: {
              gte: getDateFromTimeRange(timeRange)
            }
          },
          orderBy: { timestamp: 'asc' }
        },
        workOrders: {
          where: {
            createdAt: {
              gte: getDateFromTimeRange(timeRange)
            }
          }
        }
      }
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Calculate utilization metrics
    const utilizationData = calculateDetailedUtilization(asset, timeRange);

    res.json(utilizationData);
  } catch (error) {
    console.error('Error fetching asset utilization:', error);
    res.status(500).json({ error: 'Failed to fetch asset utilization' });
  }
};

const getAssetPerformance = async (req, res) => {
  try {
    const { assetId } = req.params;
    const { timeRange = '30days' } = req.query;
    const companyId = req.user.companyId;

    const asset = await prisma.asset.findUnique({
      where: { id: assetId, companyId },
      include: {
        assetReadings: {
          where: {
            timestamp: {
              gte: getDateFromTimeRange(timeRange)
            }
          },
          orderBy: { timestamp: 'asc' }
        },
        workOrders: {
          where: {
            createdAt: {
              gte: getDateFromTimeRange(timeRange)
            }
          },
          include: {
            parts: true
          }
        },
        depreciationRecords: {
          where: {
            date: {
              gte: getDateFromTimeRange(timeRange)
            }
          },
          orderBy: { date: 'desc' }
        }
      }
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Calculate performance metrics
    const performance = calculateAssetPerformance(asset, timeRange);

    res.json(performance);
  } catch (error) {
    console.error('Error fetching asset performance:', error);
    res.status(500).json({ error: 'Failed to fetch asset performance' });
  }
};

// Record asset reading (temperature, vibration, etc.)
const recordAssetReading = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      readingType,
      readingValue,
      unit,
      timestamp = new Date(),
      notes,
      alertThreshold
    } = req.body;

    const readingBy = req.user?.id;
    const isAlert = alertThreshold && (readingValue > alertThreshold || readingValue < 0);

    const reading = await prisma.assetReading.create({
      data: {
        assetId: id,
        readingType,
        readingValue,
        unit,
        timestamp: new Date(timestamp),
        readingBy,
        notes,
        alertThreshold,
        isAlert
      },
      include: {
        reader: {
          select: { id: true, username: true, email: true }
        }
      }
    });

    // If it's an alert, create a notification or work order
    if (isAlert) {
      console.log(`Alert: Asset ${id} reading ${readingType} is ${readingValue} ${unit}`);
    }

    res.status(201).json(reading);
  } catch (error) {
    console.error('Error recording asset reading:', error);
    res.status(500).json({ error: 'Failed to record asset reading' });
  }
};

// Helper functions
function getDateFromTimeRange(timeRange) {
  const date = new Date();
  switch (timeRange) {
    case '7days':
      date.setDate(date.getDate() - 7);
      break;
    case '30days':
    case '1month':
      date.setMonth(date.getMonth() - 1);
      break;
    case '3months':
      date.setMonth(date.getMonth() - 3);
      break;
    case '6months':
      date.setMonth(date.getMonth() - 6);
      break;
    case '1year':
      date.setFullYear(date.getFullYear() - 1);
      break;
    default:
      date.setMonth(date.getMonth() - 1);
  }
  return date;
}

function generateValueHistory(startDate, endDate) {
  // Mock historical data - in reality, this would come from historical records
  const months = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    months.push({
      period: current.toISOString().slice(0, 7), // YYYY-MM format
      totalValue: Math.floor(Math.random() * 100000) + 500000,
      bookValue: Math.floor(Math.random() * 80000) + 400000
    });
    current.setMonth(current.getMonth() + 1);
  }
  
  return months;
}

async function generateAssetAlerts(companyId, assetId = null) {
  const alerts = [];
  
  // Check for assets needing maintenance
  const maintenanceDue = await prisma.asset.count({
    where: {
      companyId,
      ...(assetId && { id: assetId }),
      OR: [
        { condition: 'POOR' },
        { condition: 'CRITICAL' }
      ]
    }
  });
  
  if (maintenanceDue > 0) {
    alerts.push({
      title: 'Assets Require Immediate Attention',
      description: `${maintenanceDue} assets are in poor or critical condition and require immediate maintenance.`,
      severity: 'high',
      actionable: true
    });
  }

  // Check for warranty expiration
  const warrantiesExpiring = await prisma.asset.count({
    where: {
      companyId,
      ...(assetId && { id: assetId }),
      warrantyExpiry: {
        gte: new Date(),
        lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      }
    }
  });

  if (warrantiesExpiring > 0) {
    alerts.push({
      title: 'Warranties Expiring Soon',
      description: `${warrantiesExpiring} asset warranties will expire within the next 30 days.`,
      severity: 'medium',
      actionable: true
    });
  }

  return alerts;
}

function calculateUtilizationRate(asset) {
  // Mock calculation - would be based on actual usage data
  return Math.floor(Math.random() * 40) + 60; // 60-100%
}

function calculateEfficiencyScore(asset) {
  // Mock calculation - would be based on performance metrics
  return Math.floor(Math.random() * 30) + 70; // 70-100%
}

function calculateDepreciationRate(depreciationRecords) {
  if (depreciationRecords.length < 2) return 0;
  
  const latest = depreciationRecords[0];
  const previous = depreciationRecords[1];
  
  return ((previous.amount - latest.amount) / previous.amount) * 100;
}

async function generateMonthlyTrends(companyId, startDate, endDate, assetId = null) {
  // This would generate actual trend data from the database
  // For now, returning mock data
  const trends = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    trends.push({
      month: current.toISOString().slice(0, 7),
      assetCount: Math.floor(Math.random() * 10) + 45,
      totalValue: Math.floor(Math.random() * 50000) + 450000,
      maintenanceCost: Math.floor(Math.random() * 5000) + 2000,
      utilizationRate: Math.floor(Math.random() * 20) + 75
    });
    current.setMonth(current.getMonth() + 1);
  }
  
  return trends;
}

function calculateDetailedUtilization(asset, timeRange) {
  // Mock utilization calculation
  return {
    overall: Math.floor(Math.random() * 30) + 70,
    daily: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      utilization: Math.floor(Math.random() * 40) + 60
    })),
    peak: {
      hour: Math.floor(Math.random() * 8) + 9, // 9 AM - 5 PM
      utilization: Math.floor(Math.random() * 20) + 80
    }
  };
}

function calculateAssetPerformance(asset, timeRange) {
  // Mock performance calculation
  return {
    efficiency: Math.floor(Math.random() * 30) + 70,
    reliability: Math.floor(Math.random() * 25) + 75,
    availability: Math.floor(Math.random() * 20) + 80,
    mtbf: Math.floor(Math.random() * 200) + 300, // Mean Time Between Failures (hours)
    mttr: Math.floor(Math.random() * 4) + 2, // Mean Time To Repair (hours)
    oee: Math.floor(Math.random() * 25) + 65, // Overall Equipment Effectiveness
    trends: {
      efficiency: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        value: Math.floor(Math.random() * 30) + 70
      }))
    }
  };
}

module.exports = {
  getAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
  getAssetAnalytics,
  getAssetMetrics,
  getAssetTrends,
  getAssetUtilization,
  getAssetPerformance,
  recordAssetReading,
}; 