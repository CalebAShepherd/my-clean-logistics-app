const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all facilities
const getFacilities = async (req, res) => {
  try {
    const {
      facilityType,
      city,
      state,
      page = 1,
      limit = 20,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    
    if (facilityType && facilityType !== 'all') {
      where.facilityType = facilityType;
    }
    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }
    if (state) {
      where.state = { contains: state, mode: 'insensitive' };
    }

    const [facilities, totalCount] = await Promise.all([
      prisma.facility.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          warehouses: {
            select: {
              id: true,
              name: true,
              address: true
            }
          },
          facilityAreas: {
            select: {
              id: true,
              name: true,
              areaType: true,
              squareFeet: true,
              currentUtilization: true
            }
          },
          _count: {
            select: {
              warehouses: true,
              facilityAreas: true,
              utilityBills: true
            }
          }
        }
      }),
      prisma.facility.count({ where })
    ]);

    // Calculate total utilization for each facility
    const facilitiesWithMetrics = facilities.map(facility => {
      const totalSquareFeet = facility.facilityAreas.reduce((sum, area) => sum + (area.squareFeet || 0), 0);
      const avgUtilization = facility.facilityAreas.length > 0 
        ? facility.facilityAreas.reduce((sum, area) => sum + (area.currentUtilization || 0), 0) / facility.facilityAreas.length
        : 0;

      return {
        ...facility,
        totalSquareFeet,
        avgUtilization: Math.round(avgUtilization * 100) / 100
      };
    });

    res.json({
      facilities: facilitiesWithMetrics,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / take),
        totalCount,
        hasNext: skip + take < totalCount,
        hasPrev: skip > 0
      }
    });
  } catch (error) {
    console.error('Error fetching facilities:', error);
    res.status(500).json({ error: 'Failed to fetch facilities' });
  }
};

// Get facility by ID
const getFacilityById = async (req, res) => {
  try {
    const { id } = req.params;

    const facility = await prisma.facility.findUnique({
      where: { id },
      include: {
        warehouses: true,
        facilityAreas: {
          orderBy: { name: 'asc' }
        },
        utilityBills: {
          orderBy: { billDate: 'desc' },
          take: 12 // Last 12 months
        }
      }
    });

    if (!facility) {
      return res.status(404).json({ error: 'Facility not found' });
    }

    // Calculate utility costs summary
    const utilitySummary = facility.utilityBills.reduce((acc, bill) => {
      const type = bill.utilityType;
      if (!acc[type]) {
        acc[type] = { totalCost: 0, totalUsage: 0, billCount: 0 };
      }
      acc[type].totalCost += parseFloat(bill.amount);
      acc[type].totalUsage += bill.usage;
      acc[type].billCount += 1;
      return acc;
    }, {});

    res.json({
      ...facility,
      utilitySummary
    });
  } catch (error) {
    console.error('Error fetching facility:', error);
    res.status(500).json({ error: 'Failed to fetch facility' });
  }
};

// Create facility
const createFacility = async (req, res) => {
  try {
    const {
      name,
      facilityType,
      address,
      city,
      state,
      zipCode,
      country = 'US',
      totalSquareFeet,
      warehouseSquareFeet,
      officeSquareFeet,
      totalCapacity,
      electricityMeterNumber,
      gasMeterNumber,
      waterMeterNumber,
      facilityManager,
      maintenanceContact
    } = req.body;

    const facility = await prisma.facility.create({
      data: {
        name,
        facilityType,
        address,
        city,
        state,
        zipCode,
        country,
        totalSquareFeet,
        warehouseSquareFeet,
        officeSquareFeet,
        totalCapacity,
        electricityMeterNumber,
        gasMeterNumber,
        waterMeterNumber,
        facilityManager,
        maintenanceContact
      }
    });

    res.status(201).json(facility);
  } catch (error) {
    console.error('Error creating facility:', error);
    res.status(500).json({ error: 'Failed to create facility' });
  }
};

// Update facility
const updateFacility = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const facility = await prisma.facility.update({
      where: { id },
      data: updateData
    });

    res.json(facility);
  } catch (error) {
    console.error('Error updating facility:', error);
    res.status(500).json({ error: 'Failed to update facility' });
  }
};

// Delete facility
const deleteFacility = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if facility has associated warehouses
    const facility = await prisma.facility.findUnique({
      where: { id },
      include: {
        warehouses: true
      }
    });

    if (facility?.warehouses.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete facility with associated warehouses'
      });
    }

    await prisma.facility.delete({
      where: { id }
    });

    res.json({ message: 'Facility deleted successfully' });
  } catch (error) {
    console.error('Error deleting facility:', error);
    res.status(500).json({ error: 'Failed to delete facility' });
  }
};

// Get facility areas
const getFacilityAreas = async (req, res) => {
  try {
    const { facilityId } = req.params;
    const { areaType } = req.query;

    const where = { facilityId };
    if (areaType && areaType !== 'all') {
      where.areaType = areaType;
    }

    const areas = await prisma.facilityArea.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        facility: {
          select: { id: true, name: true }
        }
      }
    });

    res.json(areas);
  } catch (error) {
    console.error('Error fetching facility areas:', error);
    res.status(500).json({ error: 'Failed to fetch facility areas' });
  }
};

// Create facility area
const createFacilityArea = async (req, res) => {
  try {
    const { facilityId } = req.params;
    const {
      name,
      areaType,
      squareFeet,
      height,
      capacity,
      currentUtilization,
      maxUtilization
    } = req.body;

    const area = await prisma.facilityArea.create({
      data: {
        facilityId,
        name,
        areaType,
        squareFeet,
        height,
        capacity,
        currentUtilization,
        maxUtilization
      },
      include: {
        facility: {
          select: { id: true, name: true }
        }
      }
    });

    res.status(201).json(area);
  } catch (error) {
    console.error('Error creating facility area:', error);
    res.status(500).json({ error: 'Failed to create facility area' });
  }
};

// Update facility area
const updateFacilityArea = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const area = await prisma.facilityArea.update({
      where: { id },
      data: updateData,
      include: {
        facility: {
          select: { id: true, name: true }
        }
      }
    });

    res.json(area);
  } catch (error) {
    console.error('Error updating facility area:', error);
    res.status(500).json({ error: 'Failed to update facility area' });
  }
};

// Get utility bills
const getUtilityBills = async (req, res) => {
  try {
    const { facilityId } = req.params;
    const {
      utilityType,
      year,
      month,
      page = 1,
      limit = 20,
      sortBy = 'billDate',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { facilityId };
    
    if (utilityType && utilityType !== 'all') {
      where.utilityType = utilityType;
    }
    
    if (year) {
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year) + 1, 0, 1);
      where.billDate = {
        gte: startDate,
        lt: endDate
      };
    }
    
    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 1);
      where.billDate = {
        gte: startDate,
        lt: endDate
      };
    }

    const [bills, totalCount] = await Promise.all([
      prisma.utilityBill.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          facility: {
            select: { id: true, name: true }
          }
        }
      }),
      prisma.utilityBill.count({ where })
    ]);

    res.json({
      bills,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / take),
        totalCount,
        hasNext: skip + take < totalCount,
        hasPrev: skip > 0
      }
    });
  } catch (error) {
    console.error('Error fetching utility bills:', error);
    res.status(500).json({ error: 'Failed to fetch utility bills' });
  }
};

// Create utility bill
const createUtilityBill = async (req, res) => {
  try {
    const { facilityId } = req.params;
    const {
      utilityType,
      billDate,
      serviceStart,
      serviceEnd,
      previousReading,
      currentReading,
      usage,
      unit,
      amount,
      ratePerUnit,
      warehouseAllocation,
      officeAllocation
    } = req.body;

    const bill = await prisma.utilityBill.create({
      data: {
        facilityId,
        utilityType,
        billDate: new Date(billDate),
        serviceStart: new Date(serviceStart),
        serviceEnd: new Date(serviceEnd),
        previousReading,
        currentReading,
        usage,
        unit,
        amount,
        ratePerUnit,
        warehouseAllocation,
        officeAllocation
      },
      include: {
        facility: {
          select: { id: true, name: true }
        }
      }
    });

    res.status(201).json(bill);
  } catch (error) {
    console.error('Error creating utility bill:', error);
    res.status(500).json({ error: 'Failed to create utility bill' });
  }
};

// Get facility analytics
const getFacilityAnalytics = async (req, res) => {
  try {
    const {
      facilityId,
      year = new Date().getFullYear(),
      period = '12' // months
    } = req.query;

    const whereClause = facilityId && facilityId !== 'all' ? { facilityId } : {};
    
    const startDate = new Date(parseInt(year), 0, 1);
    const endDate = new Date(parseInt(year) + 1, 0, 1);

    const [
      totalFacilities,
      facilitiesByType,
      totalUtilityCosts,
      utilityCostsByType,
      spaceUtilization,
      monthlyUtilityCosts
    ] = await Promise.all([
      // Total facilities
      prisma.facility.count(facilityId ? { where: { id: facilityId } } : {}),
      
      // Facilities by type
      prisma.facility.groupBy({
        by: ['facilityType'],
        where: facilityId ? { id: facilityId } : {},
        _count: { facilityType: true }
      }),
      
      // Total utility costs for the year
      prisma.utilityBill.aggregate({
        where: {
          ...whereClause,
          billDate: { gte: startDate, lt: endDate }
        },
        _sum: { amount: true },
        _count: { id: true }
      }),
      
      // Utility costs by type
      prisma.utilityBill.groupBy({
        by: ['utilityType'],
        where: {
          ...whereClause,
          billDate: { gte: startDate, lt: endDate }
        },
        _sum: { amount: true, usage: true },
        _count: { utilityType: true }
      }),
      
      // Space utilization
      prisma.facilityArea.aggregate({
        where: whereClause ? { facilityId: whereClause.facilityId } : {},
        _avg: { currentUtilization: true },
        _sum: { squareFeet: true }
      }),
      
      // Monthly utility costs
      prisma.utilityBill.findMany({
        where: {
          ...whereClause,
          billDate: { gte: startDate, lt: endDate }
        },
        select: {
          billDate: true,
          amount: true,
          utilityType: true
        },
        orderBy: { billDate: 'asc' }
      })
    ]);

    // Process monthly costs
    const monthlyData = monthlyUtilityCosts.reduce((acc, bill) => {
      const month = bill.billDate.getMonth();
      const monthName = new Date(0, month).toLocaleString('default', { month: 'long' });
      
      if (!acc[monthName]) {
        acc[monthName] = 0;
      }
      acc[monthName] += parseFloat(bill.amount);
      return acc;
    }, {});

    // Calculate monthly trends and max monthly cost
    const monthlyTrends = Object.entries(monthlyData).map(([month, totalCost]) => ({
      month,
      totalCost
    }));
    const maxMonthlyCost = Math.max(...Object.values(monthlyData), 1);
    
    // Calculate average monthly cost
    const avgMonthlyCost = Object.values(monthlyData).reduce((sum, cost) => sum + cost, 0) / Math.max(Object.keys(monthlyData).length, 1);

    res.json({
      totalFacilities,
      facilitiesByType: facilitiesByType.map(item => ({
        facilityType: item.facilityType,
        _count: { facilityType: item._count.facilityType }
      })),
      totalUtilityCosts: {
        _sum: { amount: totalUtilityCosts._sum.amount || 0 },
        _count: { id: totalUtilityCosts._count.id || 0 }
      },
      utilityCostsByType: utilityCostsByType.map(item => ({
        utilityType: item.utilityType,
        _sum: { 
          amount: item._sum.amount || 0,
          usage: item._sum.usage || 0
        },
        _count: { utilityType: item._count.utilityType }
      })),
      spaceUtilization: {
        _avg: { currentUtilization: spaceUtilization._avg.currentUtilization || 0 },
        _sum: { squareFeet: spaceUtilization._sum.squareFeet || 0 }
      },
      monthlyTrends,
      maxMonthlyCost,
      avgMonthlyCost
    });
  } catch (error) {
    console.error('Error fetching facility analytics:', error);
    res.status(500).json({ error: 'Failed to fetch facility analytics' });
  }
};

// Enhanced Utility Cost Allocation Functions

// Get allocation rules for a facility
const getAllocationRules = async (req, res) => {
  try {
    const { facilityId } = req.params;
    const { utilityType, isActive } = req.query;

    const where = { facilityId };
    if (utilityType && utilityType !== 'all') {
      where.utilityType = utilityType;
    }
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const rules = await prisma.utilityCostAllocationRule.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' }
      ],
      include: {
        facility: { select: { id: true, name: true } },
        warehouse: { select: { id: true, name: true } },
        costCenter: { select: { id: true, name: true, code: true } }
      }
    });

    res.json({ rules });
  } catch (error) {
    console.error('Error fetching allocation rules:', error);
    res.status(500).json({ error: 'Failed to fetch allocation rules' });
  }
};

// Create allocation rule
const createAllocationRule = async (req, res) => {
  try {
    const { facilityId } = req.params;
    const {
      ruleName,
      utilityType,
      allocationType,
      allocationMethod,
      fixedPercentage,
      squareFootageBase,
      usageMetricType,
      warehouseId,
      costCenterId,
      priority = 1
    } = req.body;

    const rule = await prisma.utilityCostAllocationRule.create({
      data: {
        facilityId,
        ruleName,
        utilityType,
        allocationType,
        allocationMethod,
        fixedPercentage,
        squareFootageBase,
        usageMetricType,
        warehouseId,
        costCenterId,
        priority
      },
      include: {
        facility: { select: { id: true, name: true } },
        warehouse: { select: { id: true, name: true } },
        costCenter: { select: { id: true, name: true, code: true } }
      }
    });

    res.status(201).json(rule);
  } catch (error) {
    console.error('Error creating allocation rule:', error);
    res.status(500).json({ error: 'Failed to create allocation rule' });
  }
};

// Update allocation rule
const updateAllocationRule = async (req, res) => {
  try {
    const { ruleId } = req.params;
    const updateData = req.body;

    const rule = await prisma.utilityCostAllocationRule.update({
      where: { id: ruleId },
      data: updateData,
      include: {
        facility: { select: { id: true, name: true } },
        warehouse: { select: { id: true, name: true } },
        costCenter: { select: { id: true, name: true, code: true } }
      }
    });

    res.json(rule);
  } catch (error) {
    console.error('Error updating allocation rule:', error);
    res.status(500).json({ error: 'Failed to update allocation rule' });
  }
};

// Delete allocation rule
const deleteAllocationRule = async (req, res) => {
  try {
    const { ruleId } = req.params;

    await prisma.utilityCostAllocationRule.delete({
      where: { id: ruleId }
    });

    res.json({ message: 'Allocation rule deleted successfully' });
  } catch (error) {
    console.error('Error deleting allocation rule:', error);
    res.status(500).json({ error: 'Failed to delete allocation rule' });
  }
};

// Allocate utility costs based on rules
const allocateUtilityCosts = async (req, res) => {
  try {
    const { billId } = req.params;

    // Get the utility bill
    const bill = await prisma.utilityBill.findUnique({
      where: { id: billId },
      include: {
        facility: {
          include: {
            warehouses: true,
            facilityAreas: true
          }
        }
      }
    });

    if (!bill) {
      return res.status(404).json({ error: 'Utility bill not found' });
    }

    // Get allocation rules for this facility and utility type
    const rules = await prisma.utilityCostAllocationRule.findMany({
      where: {
        facilityId: bill.facilityId,
        utilityType: bill.utilityType,
        isActive: true
      },
      orderBy: { priority: 'desc' },
      include: {
        warehouse: true,
        costCenter: true
      }
    });

    if (rules.length === 0) {
      return res.status(400).json({ error: 'No allocation rules found for this utility type' });
    }

    // Clear existing allocations
    await prisma.utilityCostAllocation.deleteMany({
      where: { utilityBillId: billId }
    });

    const allocations = [];
    let totalAllocated = 0;

    // Process each rule
    for (const rule of rules) {
      let allocation = await calculateAllocation(bill, rule);
      if (allocation && allocation.amount > 0) {
        const createdAllocation = await prisma.utilityCostAllocation.create({
          data: {
            utilityBillId: billId,
            costCenterId: rule.costCenterId,
            warehouseId: rule.warehouseId,
            allocationType: rule.allocationType,
            allocationKey: rule.ruleName,
            percentage: allocation.percentage,
            amount: allocation.amount,
            allocationMethod: rule.allocationMethod,
            squareFeet: allocation.squareFeet,
            totalSquareFeet: allocation.totalSquareFeet,
            usageMetric: allocation.usageMetric,
            totalUsageMetric: allocation.totalUsageMetric
          },
          include: {
            costCenter: { select: { id: true, name: true, code: true } },
            warehouse: { select: { id: true, name: true } }
          }
        });
        allocations.push(createdAllocation);
        totalAllocated += parseFloat(allocation.amount);
      }
    }

    // Update utility bill allocation status
    await prisma.utilityBill.update({
      where: { id: billId },
      data: {
        allocatedAmount: totalAllocated,
        unallocatedAmount: parseFloat(bill.amount) - totalAllocated,
        isAllocated: true,
        allocationMethod: 'RULE_BASED'
      }
    });

    res.json({
      message: 'Utility costs allocated successfully',
      allocations,
      totalAmount: parseFloat(bill.amount),
      totalAllocated,
      unallocated: parseFloat(bill.amount) - totalAllocated
    });
  } catch (error) {
    console.error('Error allocating utility costs:', error);
    res.status(500).json({ error: 'Failed to allocate utility costs' });
  }
};

// Helper function to calculate allocation based on rule
const calculateAllocation = async (bill, rule) => {
  const totalAmount = parseFloat(bill.amount);
  let allocation = { amount: 0, percentage: 0 };

  switch (rule.allocationMethod) {
    case 'FIXED_PERCENTAGE':
      allocation.percentage = rule.fixedPercentage || 0;
      allocation.amount = (totalAmount * allocation.percentage) / 100;
      break;

    case 'SQUARE_FOOTAGE':
      // Get facility areas for calculation
      const facilityAreas = await prisma.facilityArea.findMany({
        where: { facilityId: bill.facilityId }
      });
      
      const totalSquareFeet = facilityAreas.reduce((sum, area) => sum + (area.squareFeet || 0), 0);
      
      let targetSquareFeet = 0;
      if (rule.warehouseId) {
        // Find warehouse square footage
        const warehouse = await prisma.warehouse.findUnique({
          where: { id: rule.warehouseId },
          include: { facility: true }
        });
        targetSquareFeet = warehouse?.facility?.warehouseSquareFeet || 0;
      } else if (rule.squareFootageBase) {
        // Use specific area type
        targetSquareFeet = facilityAreas
          .filter(area => area.areaType === rule.squareFootageBase)
          .reduce((sum, area) => sum + (area.squareFeet || 0), 0);
      }

      if (totalSquareFeet > 0) {
        allocation.percentage = (targetSquareFeet / totalSquareFeet) * 100;
        allocation.amount = (totalAmount * allocation.percentage) / 100;
        allocation.squareFeet = targetSquareFeet;
        allocation.totalSquareFeet = totalSquareFeet;
      }
      break;

    case 'USAGE_BASED':
      // This would require usage metrics - simplified for now
      allocation.percentage = 25; // Default for demonstration
      allocation.amount = (totalAmount * allocation.percentage) / 100;
      break;

    default:
      console.warn(`Unknown allocation method: ${rule.allocationMethod}`);
  }

  return allocation;
};

// Get utility budgets
const getUtilityBudgets = async (req, res) => {
  try {
    const { facilityId } = req.params;
    const { year = new Date().getFullYear(), utilityType } = req.query;

    const where = { facilityId, budgetYear: parseInt(year) };
    if (utilityType && utilityType !== 'all') {
      where.utilityType = utilityType;
    }

    const budgets = await prisma.utilityBudget.findMany({
      where,
      orderBy: [
        { utilityType: 'asc' },
        { budgetMonth: 'asc' }
      ],
      include: {
        facility: { select: { id: true, name: true } }
      }
    });

    res.json({ budgets });
  } catch (error) {
    console.error('Error fetching utility budgets:', error);
    res.status(500).json({ error: 'Failed to fetch utility budgets' });
  }
};

// Create utility budget
const createUtilityBudget = async (req, res) => {
  try {
    const { facilityId } = req.params;
    const {
      utilityType,
      budgetYear,
      budgetMonth,
      budgetedAmount,
      budgetedUsage,
      warehouseBudget,
      officeBudget
    } = req.body;

    const budget = await prisma.utilityBudget.create({
      data: {
        facilityId,
        utilityType,
        budgetYear: parseInt(budgetYear),
        budgetMonth: budgetMonth ? parseInt(budgetMonth) : null,
        budgetedAmount,
        budgetedUsage,
        warehouseBudget,
        officeBudget
      },
      include: {
        facility: { select: { id: true, name: true } }
      }
    });

    res.status(201).json(budget);
  } catch (error) {
    console.error('Error creating utility budget:', error);
    res.status(500).json({ error: 'Failed to create utility budget' });
  }
};

// Get variance analysis
const getVarianceAnalysis = async (req, res) => {
  try {
    const { facilityId } = req.params;
    const { 
      year = new Date().getFullYear(), 
      month,
      utilityType 
    } = req.query;

    const where = { facilityId };
    if (utilityType && utilityType !== 'all') {
      where.utilityType = utilityType;
    }

    // Date range for analysis
    if (month) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 1);
      where.analysisDate = { gte: startDate, lt: endDate };
    } else {
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year) + 1, 0, 1);
      where.analysisDate = { gte: startDate, lt: endDate };
    }

    const variances = await prisma.utilityCostVariance.findMany({
      where,
      orderBy: { analysisDate: 'desc' },
      include: {
        facility: { select: { id: true, name: true } }
      }
    });

    res.json({ variances });
  } catch (error) {
    console.error('Error fetching variance analysis:', error);
    res.status(500).json({ error: 'Failed to fetch variance analysis' });
  }
};

// Generate variance analysis
const generateVarianceAnalysis = async (req, res) => {
  try {
    const { facilityId } = req.params;
    const { 
      year = new Date().getFullYear(), 
      month = new Date().getMonth() + 1 
    } = req.body;

    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 1);

    // Get actual utility costs for the period
    const actualCosts = await prisma.utilityBill.groupBy({
      by: ['utilityType'],
      where: {
        facilityId,
        billDate: { gte: startDate, lt: endDate }
      },
      _sum: { amount: true, usage: true },
      _count: { id: true }
    });

    // Get budgets for the period
    const budgets = await prisma.utilityBudget.findMany({
      where: {
        facilityId,
        budgetYear: parseInt(year),
        budgetMonth: parseInt(month)
      }
    });

    const variances = [];

    for (const actual of actualCosts) {
      const budget = budgets.find(b => b.utilityType === actual.utilityType);
      
      if (budget) {
        const actualAmount = parseFloat(actual._sum.amount || 0);
        const budgetedAmount = parseFloat(budget.budgetedAmount);
        const variance = actualAmount - budgetedAmount;
        const variancePercent = budgetedAmount > 0 ? (variance / budgetedAmount) * 100 : 0;

        const varianceRecord = await prisma.utilityCostVariance.create({
          data: {
            facilityId,
            utilityType: actual.utilityType,
            analysisDate: new Date(),
            periodStart: startDate,
            periodEnd: endDate,
            actualAmount,
            budgetedAmount,
            variance,
            variancePercent,
            actualUsage: parseFloat(actual._sum.usage || 0),
            budgetedUsage: parseFloat(budget.budgetedUsage || 0),
            usageVariance: parseFloat(actual._sum.usage || 0) - parseFloat(budget.budgetedUsage || 0)
          },
          include: {
            facility: { select: { id: true, name: true } }
          }
        });

        variances.push(varianceRecord);
      }
    }

    res.status(201).json({ 
      message: 'Variance analysis generated successfully',
      variances 
    });
  } catch (error) {
    console.error('Error generating variance analysis:', error);
    res.status(500).json({ error: 'Failed to generate variance analysis' });
  }
};

// Get allocation summary for a facility
const getAllocationSummary = async (req, res) => {
  try {
    const { facilityId } = req.params;
    const { 
      year = new Date().getFullYear(), 
      month,
      utilityType 
    } = req.query;

    const billWhere = { facilityId };
    if (utilityType && utilityType !== 'all') {
      billWhere.utilityType = utilityType;
    }

    // Date range
    if (month) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 1);
      billWhere.billDate = { gte: startDate, lt: endDate };
    } else {
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year) + 1, 0, 1);
      billWhere.billDate = { gte: startDate, lt: endDate };
    }

    // Get utility bills with allocations
    const bills = await prisma.utilityBill.findMany({
      where: billWhere,
      include: {
        allocations: {
          include: {
            warehouse: { select: { id: true, name: true } },
            costCenter: { select: { id: true, name: true, code: true } }
          }
        }
      }
    });

    // Summarize allocations
    const summary = {
      totalBills: bills.length,
      totalAmount: bills.reduce((sum, bill) => sum + parseFloat(bill.amount), 0),
      totalAllocated: bills.reduce((sum, bill) => sum + parseFloat(bill.allocatedAmount || 0), 0),
      totalUnallocated: bills.reduce((sum, bill) => sum + parseFloat(bill.unallocatedAmount || 0), 0),
      allocationsByType: {},
      allocationsByWarehouse: {},
      allocationsByCostCenter: {}
    };

    // Process allocations
    bills.forEach(bill => {
      bill.allocations.forEach(allocation => {
        const amount = parseFloat(allocation.amount);
        
        // By allocation type
        if (!summary.allocationsByType[allocation.allocationType]) {
          summary.allocationsByType[allocation.allocationType] = 0;
        }
        summary.allocationsByType[allocation.allocationType] += amount;

        // By warehouse
        if (allocation.warehouse) {
          const warehouseName = allocation.warehouse.name;
          if (!summary.allocationsByWarehouse[warehouseName]) {
            summary.allocationsByWarehouse[warehouseName] = 0;
          }
          summary.allocationsByWarehouse[warehouseName] += amount;
        }

        // By cost center
        if (allocation.costCenter) {
          const costCenterName = `${allocation.costCenter.code} - ${allocation.costCenter.name}`;
          if (!summary.allocationsByCostCenter[costCenterName]) {
            summary.allocationsByCostCenter[costCenterName] = 0;
          }
          summary.allocationsByCostCenter[costCenterName] += amount;
        }
      });
    });

    res.json(summary);
  } catch (error) {
    console.error('Error fetching allocation summary:', error);
    res.status(500).json({ error: 'Failed to fetch allocation summary' });
  }
};

module.exports = {
  getFacilities,
  getFacilityById,
  createFacility,
  updateFacility,
  deleteFacility,
  getFacilityAreas,
  createFacilityArea,
  updateFacilityArea,
  getUtilityBills,
  createUtilityBill,
  getFacilityAnalytics,
  
  // New utility cost allocation functions
  getAllocationRules,
  createAllocationRule,
  updateAllocationRule,
  deleteAllocationRule,
  allocateUtilityCosts,
  getUtilityBudgets,
  createUtilityBudget,
  getVarianceAnalysis,
  generateVarianceAnalysis,
  getAllocationSummary
}; 