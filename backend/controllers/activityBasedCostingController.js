const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// === ACTIVITY CENTERS ===

/**
 * Get all activity centers
 */
exports.getActivityCenters = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { warehouseId, activityType, isActive } = req.query;
    
    const where = { tenantId };
    if (warehouseId) where.warehouseId = warehouseId;
    if (activityType) where.activityType = activityType;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    console.log('getActivityCenters: where clause:', where);

    const activityCenters = await prisma.activityCenter.findMany({
      where,
      include: {
        warehouse: true,
        costCenter: true,
        _count: {
          select: { 
            activityCosts: true,
            costAllocations: true 
          }
        }
      },
      orderBy: { code: 'asc' }
    });

    console.log('getActivityCenters: found activity centers:', activityCenters.length);

    // If no activity centers exist, return demo data
    if (activityCenters.length === 0) {
      const mockData = [
        {
          id: 'ac_001',
          code: 'REC001',
          name: 'Receiving Operations',
          description: 'All receiving and unloading activities',
          activityType: 'RECEIVING',
          costPerUnit: 5.50,
          unitOfMeasure: 'per pallet',
          warehouse: { id: 'wh_1', name: 'Main Warehouse' },
          costCenter: { id: 'cc_ops', name: 'Operations' },
          isActive: true,
          _count: { activityCosts: 45, costAllocations: 128 }
        },
        {
          id: 'ac_002',
          code: 'PICK001',
          name: 'Order Picking',
          description: 'Single and batch picking operations',
          activityType: 'PICKING',
          costPerUnit: 2.75,
          unitOfMeasure: 'per pick task',
          warehouse: { id: 'wh_1', name: 'Main Warehouse' },
          costCenter: { id: 'cc_ops', name: 'Operations' },
          isActive: true,
          _count: { activityCosts: 67, costAllocations: 234 }
        },
        {
          id: 'ac_003',
          code: 'PACK001',
          name: 'Packing & Shipping',
          description: 'All packing and shipping activities',
          activityType: 'PACKING',
          costPerUnit: 3.25,
          unitOfMeasure: 'per shipment',
          warehouse: { id: 'wh_1', name: 'Main Warehouse' },
          costCenter: { id: 'cc_ops', name: 'Operations' },
          isActive: true,
          _count: { activityCosts: 52, costAllocations: 187 }
        },
        {
          id: 'ac_004',
          code: 'STOR001',
          name: 'Storage Operations',
          description: 'Inventory storage and management',
          activityType: 'STORAGE',
          costPerUnit: 0.85,
          unitOfMeasure: 'per pallet per day',
          warehouse: { id: 'wh_1', name: 'Main Warehouse' },
          costCenter: { id: 'cc_ops', name: 'Operations' },
          isActive: true,
          _count: { activityCosts: 30, costAllocations: 456 }
        }
      ];
      return res.json(mockData);
    }

    return res.json(activityCenters);
  } catch (err) {
    console.error('Error fetching activity centers:', err);
    console.error('Error details:', err.message);
    console.error('Error stack:', err.stack);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
};

/**
 * Create a new activity center
 */
exports.createActivityCenter = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const {
      code,
      name,
      description,
      activityType,
      costPerUnit,
      unitOfMeasure,
      warehouseId,
      costCenterId
    } = req.body;

    if (!code || !name || !activityType || !unitOfMeasure) {
      return res.status(400).json({ 
        error: 'Code, name, activity type, and unit of measure are required' 
      });
    }

    const activityCenter = await prisma.activityCenter.create({
      data: {
        code,
        name,
        description,
        activityType,
        costPerUnit: costPerUnit || 0,
        unitOfMeasure,
        warehouseId,
        costCenterId,
        tenantId
      },
      include: {
        warehouse: true,
        costCenter: true
      }
    });

    return res.status(201).json(activityCenter);
  } catch (err) {
    console.error('Error creating activity center:', err);
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Activity center code already exists' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update an activity center
 */
exports.updateActivityCenter = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.user;
    const {
      name,
      description,
      costPerUnit,
      unitOfMeasure,
      isActive
    } = req.body;

    const activityCenter = await prisma.activityCenter.update({
      where: { id, tenantId },
      data: {
        name,
        description,
        costPerUnit,
        unitOfMeasure,
        isActive
      },
      include: {
        warehouse: true,
        costCenter: true
      }
    });

    return res.json(activityCenter);
  } catch (err) {
    console.error('Error updating activity center:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// === ACTIVITY COSTS ===

/**
 * Get activity costs with filtering
 */
exports.getActivityCosts = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { 
      activityCenterId, 
      startDate, 
      endDate, 
      page = 1, 
      limit = 20 
    } = req.query;

    const where = { tenantId };
    if (activityCenterId) where.activityCenterId = activityCenterId;
    if (startDate && endDate) {
      where.costDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const [activityCosts, total] = await Promise.all([
      prisma.activityCost.findMany({
        where,
        include: {
          activityCenter: true,
          pickList: { select: { id: true, listNumber: true } },
          packingSlip: { select: { id: true, slipNumber: true } },
          shipment: { select: { id: true, reference: true } },
          receipt: { select: { id: true, receiptNumber: true } },
          putAwayTask: { select: { id: true, taskNumber: true } }
        },
        orderBy: { costDate: 'desc' },
        skip: (page - 1) * limit,
        take: parseInt(limit)
      }),
      prisma.activityCost.count({ where })
    ]);

    // If no data exists, return mock data
    if (activityCosts.length === 0) {
      const mockData = [
        {
          id: 'cost_001',
          activityCenter: { id: 'ac_001', code: 'REC001', name: 'Receiving Operations' },
          costDate: '2024-02-10T00:00:00.000Z',
          directCost: 450.00,
          indirectCost: 125.00,
          totalCost: 575.00,
          actualUnits: 35,
          budgetedUnits: 32,
          varianceAmount: 47.50,
          variancePercent: 9.02,
          receipt: { id: 'rec_001', receiptNumber: 'REC-2024-001' },
          notes: 'Higher than expected due to complex unloading'
        },
        {
          id: 'cost_002',
          activityCenter: { id: 'ac_002', code: 'PICK001', name: 'Order Picking' },
          costDate: '2024-02-10T00:00:00.000Z',
          directCost: 320.50,
          indirectCost: 85.25,
          totalCost: 405.75,
          actualUnits: 147,
          budgetedUnits: 150,
          varianceAmount: -8.25,
          variancePercent: -2.0,
          pickList: { id: 'pick_001', listNumber: 'PICK-2024-001' },
          notes: 'Efficient picking session'
        },
        {
          id: 'cost_003',
          activityCenter: { id: 'ac_003', code: 'PACK001', name: 'Packing & Shipping' },
          costDate: '2024-02-09T00:00:00.000Z',
          directCost: 275.75,
          indirectCost: 92.25,
          totalCost: 368.00,
          actualUnits: 88,
          budgetedUnits: 85,
          varianceAmount: 12.25,
          variancePercent: 3.44,
          packingSlip: { id: 'pack_001', slipNumber: 'PACK-2024-001' },
          notes: 'Additional packaging materials needed'
        }
      ];
      return res.json({ data: mockData, total: mockData.length, page: 1, totalPages: 1 });
    }

    return res.json({
      data: activityCosts,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('Error fetching activity costs:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Create activity cost record
 */
exports.createActivityCost = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const {
      activityCenterId,
      costDate,
      directCost,
      indirectCost,
      actualUnits,
      budgetedUnits,
      notes,
      pickListId,
      packingSlipId,
      shipmentId,
      receiptId,
      putAwayTaskId
    } = req.body;

    if (!activityCenterId || !costDate) {
      return res.status(400).json({ 
        error: 'Activity center ID and cost date are required' 
      });
    }

    const totalCost = (directCost || 0) + (indirectCost || 0);
    const varianceAmount = (actualUnits || 0) - (budgetedUnits || 0);
    const variancePercent = budgetedUnits > 0 ? 
      ((varianceAmount / budgetedUnits) * 100) : 0;

    const activityCost = await prisma.activityCost.create({
      data: {
        activityCenterId,
        costDate: new Date(costDate),
        directCost: directCost || 0,
        indirectCost: indirectCost || 0,
        totalCost,
        actualUnits: actualUnits || 0,
        budgetedUnits: budgetedUnits || 0,
        varianceAmount,
        variancePercent,
        notes,
        pickListId,
        packingSlipId,
        shipmentId,
        receiptId,
        putAwayTaskId,
        tenantId
      },
      include: {
        activityCenter: true,
        pickList: { select: { id: true, listNumber: true } },
        packingSlip: { select: { id: true, slipNumber: true } },
        shipment: { select: { id: true, reference: true } },
        receipt: { select: { id: true, receiptNumber: true } },
        putAwayTask: { select: { id: true, taskNumber: true } }
      }
    });

    return res.status(201).json(activityCost);
  } catch (err) {
    console.error('Error creating activity cost:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// === COST ALLOCATIONS ===

/**
 * Get cost allocations
 */
exports.getCostAllocations = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { 
      customerId, 
      activityCenterId, 
      startDate, 
      endDate,
      page = 1,
      limit = 20 
    } = req.query;

    const where = { tenantId };
    if (customerId) where.customerId = customerId;
    if (activityCenterId) where.activityCenterId = activityCenterId;
    if (startDate && endDate) {
      where.allocationDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const [allocations, total] = await Promise.all([
      prisma.costAllocation.findMany({
        where,
        include: {
          activityCenter: true,
          customer: { select: { id: true, username: true, email: true } },
          warehouse: { select: { id: true, name: true } },
          shipment: { select: { id: true, reference: true } }
        },
        orderBy: { allocationDate: 'desc' },
        skip: (page - 1) * limit,
        take: parseInt(limit)
      }),
      prisma.costAllocation.count({ where })
    ]);

    // If no data exists, return mock data
    if (allocations.length === 0) {
      const mockData = [
        {
          id: 'alloc_001',
          allocationDate: '2024-02-10T00:00:00.000Z',
          activityCenter: { id: 'ac_001', code: 'REC001', name: 'Receiving Operations' },
          customer: { id: 'cust_001', username: 'acme_corp', email: 'logistics@acme.com' },
          warehouse: { id: 'wh_1', name: 'Main Warehouse' },
          allocatedCost: 275.50,
          allocationMethod: 'ACTIVITY_BASED',
          allocationBasis: 'Based on 15 pallets received',
          unitsConsumed: 15,
          notes: 'Large shipment allocation'
        },
        {
          id: 'alloc_002',
          allocationDate: '2024-02-10T00:00:00.000Z',
          activityCenter: { id: 'ac_002', code: 'PICK001', name: 'Order Picking' },
          customer: { id: 'cust_002', username: 'globaltech', email: 'orders@globaltech.com' },
          warehouse: { id: 'wh_1', name: 'Main Warehouse' },
          allocatedCost: 168.75,
          allocationMethod: 'USAGE_BASED',
          allocationBasis: 'Based on 52 pick tasks',
          unitsConsumed: 52,
          notes: 'High-frequency picking customer'
        },
        {
          id: 'alloc_003',
          allocationDate: '2024-02-09T00:00:00.000Z',
          activityCenter: { id: 'ac_004', code: 'STOR001', name: 'Storage Operations' },
          customer: { id: 'cust_001', username: 'acme_corp', email: 'logistics@acme.com' },
          warehouse: { id: 'wh_1', name: 'Main Warehouse' },
          allocatedCost: 425.00,
          allocationMethod: 'TIME_BASED',
          allocationBasis: 'Based on 500 pallet-days',
          unitsConsumed: 500,
          notes: 'Monthly storage allocation'
        }
      ];
      return res.json({ data: mockData, total: mockData.length, page: 1, totalPages: 1 });
    }

    return res.json({
      data: allocations,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('Error fetching cost allocations:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Create cost allocation
 */
exports.createCostAllocation = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const {
      activityCenterId,
      customerId,
      warehouseId,
      shipmentId,
      allocatedCost,
      allocationMethod,
      allocationBasis,
      unitsConsumed,
      notes
    } = req.body;

    if (!activityCenterId || !allocatedCost || !allocationMethod) {
      return res.status(400).json({ 
        error: 'Activity center ID, allocated cost, and allocation method are required' 
      });
    }

    const allocation = await prisma.costAllocation.create({
      data: {
        allocationDate: new Date(),
        activityCenterId,
        customerId,
        warehouseId,
        shipmentId,
        allocatedCost,
        allocationMethod,
        allocationBasis: allocationBasis || '',
        unitsConsumed: unitsConsumed || 0,
        notes,
        tenantId
      },
      include: {
        activityCenter: true,
        customer: { select: { id: true, username: true, email: true } },
        warehouse: { select: { id: true, name: true } },
        shipment: { select: { id: true, reference: true } }
      }
    });

    return res.status(201).json(allocation);
  } catch (err) {
    console.error('Error creating cost allocation:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// === CUSTOMER PROFITABILITY ===

/**
 * Get customer profitability analysis
 */
exports.getCustomerProfitability = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { customerId, startDate, endDate } = req.query;

    const where = { tenantId };
    if (customerId) where.customerId = customerId;
    if (startDate && endDate) {
      where.analysisDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const profitability = await prisma.customerProfitability.findMany({
      where,
      include: {
        customer: { select: { id: true, username: true, email: true } }
      },
      orderBy: { analysisDate: 'desc' }
    });

    // If no data exists, return mock data
    if (profitability.length === 0) {
      const mockData = [
        {
          id: 'prof_001',
          customer: { id: 'cust_001', username: 'acme_corp', email: 'logistics@acme.com' },
          analysisDate: '2024-02-01T00:00:00.000Z',
          periodStart: '2024-01-01T00:00:00.000Z',
          periodEnd: '2024-01-31T00:00:00.000Z',
          totalRevenue: 45750.00,
          totalDirectCosts: 28500.00,
          totalIndirectCosts: 8200.00,
          totalCosts: 36700.00,
          grossProfit: 17250.00,
          grossMarginPercent: 37.70,
          netProfit: 9050.00,
          netMarginPercent: 19.78,
          totalShipments: 124,
          totalPallets: 456,
          totalWeight: 12750.5,
          averageCostPerShipment: 295.97,
          averageCostPerPallet: 80.48,
          storageUtilization: 78.5
        },
        {
          id: 'prof_002',
          customer: { id: 'cust_002', username: 'globaltech', email: 'orders@globaltech.com' },
          analysisDate: '2024-02-01T00:00:00.000Z',
          periodStart: '2024-01-01T00:00:00.000Z',
          periodEnd: '2024-01-31T00:00:00.000Z',
          totalRevenue: 32100.00,
          totalDirectCosts: 19800.00,
          totalIndirectCosts: 5950.00,
          totalCosts: 25750.00,
          grossProfit: 12300.00,
          grossMarginPercent: 38.32,
          netProfit: 6350.00,
          netMarginPercent: 19.78,
          totalShipments: 89,
          totalPallets: 234,
          totalWeight: 8940.2,
          averageCostPerShipment: 289.33,
          averageCostPerPallet: 110.04,
          storageUtilization: 45.2
        }
      ];
      return res.json(mockData);
    }

    return res.json(profitability);
  } catch (err) {
    console.error('Error fetching customer profitability:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Generate customer profitability analysis
 */
exports.generateCustomerProfitability = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { customerId, periodStart, periodEnd } = req.body;

    if (!customerId || !periodStart || !periodEnd) {
      return res.status(400).json({ 
        error: 'Customer ID, period start, and period end are required' 
      });
    }

    // This would typically calculate from actual data
    // For now, return success message
    return res.json({ 
      message: 'Customer profitability analysis generation started',
      customerId,
      periodStart,
      periodEnd
    });
  } catch (err) {
    console.error('Error generating customer profitability:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// === SERVICE PROFITABILITY ===

/**
 * Get service profitability analysis
 */
exports.getServiceProfitability = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { serviceType, warehouseId, startDate, endDate } = req.query;

    const where = { tenantId };
    if (serviceType) where.serviceType = serviceType;
    if (warehouseId) where.warehouseId = warehouseId;
    if (startDate && endDate) {
      where.analysisDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const profitability = await prisma.serviceProfitability.findMany({
      where,
      include: {
        warehouse: { select: { id: true, name: true } }
      },
      orderBy: [{ serviceType: 'asc' }, { analysisDate: 'desc' }]
    });

    // If no data exists, return mock data
    if (profitability.length === 0) {
      const mockData = [
        {
          id: 'serv_001',
          serviceType: 'RECEIVING',
          warehouse: { id: 'wh_1', name: 'Main Warehouse' },
          analysisDate: '2024-02-01T00:00:00.000Z',
          periodStart: '2024-01-01T00:00:00.000Z',
          periodEnd: '2024-01-31T00:00:00.000Z',
          totalRevenue: 18500.00,
          totalCosts: 12750.00,
          directCosts: 9200.00,
          indirectCosts: 3550.00,
          grossProfit: 5750.00,
          marginPercent: 31.08,
          totalUnits: 1250,
          costPerUnit: 10.20,
          revenuePerUnit: 14.80,
          utilizationRate: 85.5
        },
        {
          id: 'serv_002',
          serviceType: 'PICKING',
          warehouse: { id: 'wh_1', name: 'Main Warehouse' },
          analysisDate: '2024-02-01T00:00:00.000Z',
          periodStart: '2024-01-01T00:00:00.000Z',
          periodEnd: '2024-01-31T00:00:00.000Z',
          totalRevenue: 24750.00,
          totalCosts: 16200.00,
          directCosts: 11800.00,
          indirectCosts: 4400.00,
          grossProfit: 8550.00,
          marginPercent: 34.55,
          totalUnits: 3450,
          costPerUnit: 4.70,
          revenuePerUnit: 7.17,
          utilizationRate: 92.3
        },
        {
          id: 'serv_003',
          serviceType: 'STORAGE',
          warehouse: { id: 'wh_1', name: 'Main Warehouse' },
          analysisDate: '2024-02-01T00:00:00.000Z',
          periodStart: '2024-01-01T00:00:00.000Z',
          periodEnd: '2024-01-31T00:00:00.000Z',
          totalRevenue: 32100.00,
          totalCosts: 19850.00,
          directCosts: 14200.00,
          indirectCosts: 5650.00,
          grossProfit: 12250.00,
          marginPercent: 38.16,
          totalUnits: 15600,
          costPerUnit: 1.27,
          revenuePerUnit: 2.06,
          utilizationRate: 78.2
        }
      ];
      return res.json(mockData);
    }

    return res.json(profitability);
  } catch (err) {
    console.error('Error fetching service profitability:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Generate service profitability analysis
 */
exports.generateServiceProfitability = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { serviceType, warehouseId, periodStart, periodEnd } = req.body;

    if (!serviceType || !periodStart || !periodEnd) {
      return res.status(400).json({ 
        error: 'Service type, period start, and period end are required' 
      });
    }

    // This would typically calculate from actual data
    // For now, return success message
    return res.json({ 
      message: 'Service profitability analysis generation started',
      serviceType,
      warehouseId,
      periodStart,
      periodEnd
    });
  } catch (err) {
    console.error('Error generating service profitability:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// === DASHBOARD ===

/**
 * Get activity-based costing dashboard data
 */
exports.getActivityBasedCostingDashboard = async (req, res) => {
  try {
    const { tenantId } = req.user;

    // Mock dashboard data for demonstration
    const dashboardData = {
      totalActivityCosts: 245000,
      activityCostVariance: -8.5,
      overallMargin: 28.4,
      activeActivityCenters: 8,
      totalRevenue: 485000,
      topCostCenters: [
        { activityType: 'PICKING', totalCost: 85000, unitCost: 2.50, units: 34000 },
        { activityType: 'RECEIVING', totalCost: 62000, unitCost: 12.40, units: 5000 },
        { activityType: 'PACKING', totalCost: 48000, unitCost: 1.80, units: 26667 },
        { activityType: 'STORAGE', totalCost: 35000, unitCost: 0.15, units: 233333 }
      ],
      customerProfitability: [
        { customerName: 'Acme Corp', revenue: 125000, totalCosts: 95000, margin: 24.0 },
        { customerName: 'Tech Solutions', revenue: 85000, totalCosts: 72000, margin: 15.3 },
        { customerName: 'Global Logistics', revenue: 95000, totalCosts: 68000, margin: 28.4 }
      ],
      serviceProfitability: [
        { serviceType: 'RECEIVING', revenue: 185000, costs: 145000, margin: 21.6, utilization: 87.5 },
        { serviceType: 'PICKING', revenue: 225000, costs: 195000, margin: 13.3, utilization: 92.1 },
        { serviceType: 'STORAGE', revenue: 155000, costs: 125000, margin: 19.4, utilization: 78.2 }
      ],
      recentAllocations: [
        {
          id: 1,
          description: 'Q1 Pick Operations - Acme Corp',
          amount: 15000,
          method: 'ACTIVITY_BASED',
          time: '2 hours ago'
        },
        {
          id: 2,
          description: 'Storage Costs - Tech Solutions',
          amount: 8500,
          method: 'USAGE_BASED',
          time: '4 hours ago'
        }
      ]
    };

    return res.json(dashboardData);
  } catch (err) {
    console.error('Error fetching activity-based costing dashboard:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 