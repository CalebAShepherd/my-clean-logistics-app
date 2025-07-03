const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// === BUDGET SCENARIOS ===

/**
 * Get all budget scenarios
 */
exports.getBudgetScenarios = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { budgetYear, scenarioType, isActive } = req.query;
    
    const where = { tenantId };
    if (budgetYear) where.budgetYear = parseInt(budgetYear);
    if (scenarioType) where.scenarioType = scenarioType;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const scenarios = await prisma.budgetScenario.findMany({
      where,
      include: {
        _count: {
          select: { 
            budgetAllocations: true,
            forecasts: true,
            varianceAnalyses: true
          }
        }
      },
      orderBy: [{ budgetYear: 'desc' }, { name: 'asc' }]
    });

    // If no scenarios exist, return demo data
    if (scenarios.length === 0) {
      const mockData = [
        {
          id: 'scenario_001',
          name: '2024 Baseline Budget',
          description: 'Conservative baseline budget for 2024 operations',
          scenarioType: 'BASELINE',
          budgetYear: 2024,
          isActive: true,
          _count: { budgetAllocations: 45, forecasts: 144, varianceAnalyses: 28 },
          createdAt: '2023-12-15T00:00:00.000Z',
          updatedAt: '2024-01-10T00:00:00.000Z'
        },
        {
          id: 'scenario_002',
          name: '2024 Growth Scenario',
          description: 'Optimistic growth scenario with 25% volume increase',
          scenarioType: 'OPTIMISTIC',
          budgetYear: 2024,
          isActive: true,
          _count: { budgetAllocations: 45, forecasts: 144, varianceAnalyses: 12 },
          createdAt: '2023-12-20T00:00:00.000Z',
          updatedAt: '2024-01-15T00:00:00.000Z'
        },
        {
          id: 'scenario_003',
          name: '2024 Conservative Scenario',
          description: 'Conservative scenario accounting for economic uncertainty',
          scenarioType: 'PESSIMISTIC',
          budgetYear: 2024,
          isActive: false,
          _count: { budgetAllocations: 45, forecasts: 144, varianceAnalyses: 8 },
          createdAt: '2023-12-18T00:00:00.000Z',
          updatedAt: '2024-01-05T00:00:00.000Z'
        }
      ];
      return res.json(mockData);
    }

    return res.json(scenarios);
  } catch (err) {
    console.error('Error fetching budget scenarios:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Create a new budget scenario
 */
exports.createBudgetScenario = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const {
      name,
      description,
      scenarioType,
      budgetYear
    } = req.body;

    if (!name || !budgetYear) {
      return res.status(400).json({ 
        error: 'Name and budget year are required' 
      });
    }

    const scenario = await prisma.budgetScenario.create({
      data: {
        name,
        description,
        scenarioType: scenarioType || 'BASELINE',
        budgetYear,
        tenantId
      }
    });

    return res.status(201).json(scenario);
  } catch (err) {
    console.error('Error creating budget scenario:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update a budget scenario
 */
exports.updateBudgetScenario = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.user;
    const {
      name,
      description,
      isActive
    } = req.body;

    const scenario = await prisma.budgetScenario.update({
      where: { id, tenantId },
      data: {
        name,
        description,
        isActive
      }
    });

    return res.json(scenario);
  } catch (err) {
    console.error('Error updating budget scenario:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// === BUDGET FORECASTS ===

/**
 * Get budget forecasts
 */
exports.getBudgetForecasts = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { 
      budgetScenarioId, 
      costCenterId,
      accountId,
      forecastPeriod,
      startDate, 
      endDate,
      page = 1,
      limit = 50
    } = req.query;

    const where = { tenantId };
    if (budgetScenarioId) where.budgetScenarioId = budgetScenarioId;
    if (costCenterId) where.costCenterId = costCenterId;
    if (accountId) where.accountId = accountId;
    if (forecastPeriod) where.forecastPeriod = forecastPeriod;
    if (startDate && endDate) {
      where.forecastDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const [forecasts, total] = await Promise.all([
      prisma.budgetForecast.findMany({
        where,
        include: {
          budgetScenario: { select: { id: true, name: true, scenarioType: true } },
          costCenter: { select: { id: true, code: true, name: true } },
          account: { select: { id: true, accountCode: true, accountName: true } }
        },
        orderBy: { forecastDate: 'desc' },
        skip: (page - 1) * limit,
        take: parseInt(limit)
      }),
      prisma.budgetForecast.count({ where })
    ]);

    // If no forecasts exist, return mock data
    if (forecasts.length === 0) {
      const mockData = [
        {
          id: 'forecast_001',
          budgetScenario: { id: 'scenario_001', name: '2024 Baseline Budget', scenarioType: 'BASELINE' },
          costCenter: { id: 'cc_ops', code: 'OPS', name: 'Operations' },
          account: { id: 'acc_5000', accountCode: '5000', accountName: 'Operating Expenses' },
          forecastDate: '2024-02-01T00:00:00.000Z',
          forecastPeriod: 'MONTHLY',
          forecastAmount: 125000.00,
          actualAmount: 118750.00,
          variance: -6250.00,
          variancePercent: -5.0,
          confidence: 'HIGH',
          notes: 'Lower than expected due to efficiency improvements'
        },
        {
          id: 'forecast_002',
          budgetScenario: { id: 'scenario_001', name: '2024 Baseline Budget', scenarioType: 'BASELINE' },
          costCenter: { id: 'cc_ops', code: 'OPS', name: 'Operations' },
          account: { id: 'acc_4000', accountCode: '4000', accountName: 'Service Revenue' },
          forecastDate: '2024-02-01T00:00:00.000Z',
          forecastPeriod: 'MONTHLY',
          forecastAmount: 485000.00,
          actualAmount: 492750.00,
          variance: 7750.00,
          variancePercent: 1.60,
          confidence: 'HIGH',
          notes: 'Exceeding forecast due to new customer acquisition'
        },
        {
          id: 'forecast_003',
          budgetScenario: { id: 'scenario_002', name: '2024 Growth Scenario', scenarioType: 'OPTIMISTIC' },
          costCenter: { id: 'cc_adm', code: 'ADM', name: 'Administration' },
          account: { id: 'acc_5100', accountCode: '5100', accountName: 'Administrative Expenses' },
          forecastDate: '2024-02-01T00:00:00.000Z',
          forecastPeriod: 'MONTHLY',
          forecastAmount: 45000.00,
          actualAmount: 0.00,
          variance: 0.00,
          variancePercent: 0.00,
          confidence: 'MEDIUM',
          notes: 'Forecast for future period'
        }
      ];
      return res.json({ data: mockData, total: mockData.length, page: 1, totalPages: 1 });
    }

    return res.json({
      data: forecasts,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('Error fetching budget forecasts:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Create budget forecast
 */
exports.createBudgetForecast = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const {
      budgetScenarioId,
      costCenterId,
      accountId,
      forecastDate,
      forecastPeriod,
      forecastAmount,
      confidence,
      notes
    } = req.body;

    if (!budgetScenarioId || !forecastDate || !forecastAmount) {
      return res.status(400).json({ 
        error: 'Budget scenario ID, forecast date, and forecast amount are required' 
      });
    }

    const forecast = await prisma.budgetForecast.create({
      data: {
        budgetScenarioId,
        costCenterId,
        accountId,
        forecastDate: new Date(forecastDate),
        forecastPeriod: forecastPeriod || 'MONTHLY',
        forecastAmount,
        confidence: confidence || 'MEDIUM',
        notes,
        tenantId
      },
      include: {
        budgetScenario: { select: { id: true, name: true, scenarioType: true } },
        costCenter: { select: { id: true, code: true, name: true } },
        account: { select: { id: true, accountCode: true, accountName: true } }
      }
    });

    return res.status(201).json(forecast);
  } catch (err) {
    console.error('Error creating budget forecast:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update budget forecast with actual amounts
 */
exports.updateBudgetForecast = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.user;
    const {
      actualAmount,
      notes
    } = req.body;

    // Calculate variance if actual amount is provided
    const currentForecast = await prisma.budgetForecast.findUnique({
      where: { id, tenantId }
    });

    if (!currentForecast) {
      return res.status(404).json({ error: 'Budget forecast not found' });
    }

    const variance = actualAmount ? 
      actualAmount - currentForecast.forecastAmount : 
      currentForecast.variance;
    
    const variancePercent = currentForecast.forecastAmount > 0 ? 
      ((variance / currentForecast.forecastAmount) * 100) : 0;

    const forecast = await prisma.budgetForecast.update({
      where: { id, tenantId },
      data: {
        actualAmount: actualAmount || currentForecast.actualAmount,
        variance,
        variancePercent,
        notes
      },
      include: {
        budgetScenario: { select: { id: true, name: true, scenarioType: true } },
        costCenter: { select: { id: true, code: true, name: true } },
        account: { select: { id: true, accountCode: true, accountName: true } }
      }
    });

    return res.json(forecast);
  } catch (err) {
    console.error('Error updating budget forecast:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// === CASH FLOW FORECASTS ===

/**
 * Get cash flow forecasts
 */
exports.getCashFlowForecasts = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { 
      forecastPeriod,
      startDate, 
      endDate,
      page = 1,
      limit = 12
    } = req.query;

    const where = { tenantId };
    if (forecastPeriod) where.forecastPeriod = forecastPeriod;
    if (startDate && endDate) {
      where.forecastDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const [forecasts, total] = await Promise.all([
      prisma.cashFlowForecast.findMany({
        where,
        orderBy: { forecastDate: 'desc' },
        skip: (page - 1) * limit,
        take: parseInt(limit)
      }),
      prisma.cashFlowForecast.count({ where })
    ]);

    // If no forecasts exist, return mock data
    if (forecasts.length === 0) {
      const mockData = [
        {
          id: 'cf_001',
          forecastDate: '2024-02-01T00:00:00.000Z',
          forecastPeriod: 'MONTHLY',
          operatingRevenue: 875000.00,
          operatingExpenses: 648500.00,
          operatingCashFlow: 226500.00,
          investingInflow: 0.00,
          investingOutflow: 45000.00,
          investingCashFlow: -45000.00,
          financingInflow: 0.00,
          financingOutflow: 25000.00,
          financingCashFlow: -25000.00,
          netCashFlow: 156500.00,
          beginningCash: 245000.00,
          endingCash: 401500.00,
          actualCash: 395750.00,
          variance: -5750.00,
          confidence: 'HIGH',
          notes: 'Strong operating performance offset by equipment purchase'
        },
        {
          id: 'cf_002',
          forecastDate: '2024-01-01T00:00:00.000Z',
          forecastPeriod: 'MONTHLY',
          operatingRevenue: 825000.00,
          operatingExpenses: 612750.00,
          operatingCashFlow: 212250.00,
          investingInflow: 0.00,
          investingOutflow: 15000.00,
          investingCashFlow: -15000.00,
          financingInflow: 0.00,
          financingOutflow: 25000.00,
          financingCashFlow: -25000.00,
          netCashFlow: 172250.00,
          beginningCash: 185000.00,
          endingCash: 357250.00,
          actualCash: 245000.00,
          variance: -112250.00,
          confidence: 'MEDIUM',
          notes: 'Lower than forecast due to delayed customer payments'
        }
      ];
      return res.json({ data: mockData, total: mockData.length, page: 1, totalPages: 1 });
    }

    return res.json({
      data: forecasts,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('Error fetching cash flow forecasts:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Create cash flow forecast
 */
exports.createCashFlowForecast = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const {
      forecastDate,
      forecastPeriod,
      operatingRevenue,
      operatingExpenses,
      investingInflow,
      investingOutflow,
      financingInflow,
      financingOutflow,
      beginningCash,
      confidence,
      notes
    } = req.body;

    if (!forecastDate || !operatingRevenue || !operatingExpenses || !beginningCash) {
      return res.status(400).json({ 
        error: 'Forecast date, operating revenue, operating expenses, and beginning cash are required' 
      });
    }

    // Calculate cash flows
    const operatingCashFlow = operatingRevenue - operatingExpenses;
    const investingCashFlow = (investingInflow || 0) - (investingOutflow || 0);
    const financingCashFlow = (financingInflow || 0) - (financingOutflow || 0);
    const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow;
    const endingCash = beginningCash + netCashFlow;

    const forecast = await prisma.cashFlowForecast.create({
      data: {
        forecastDate: new Date(forecastDate),
        forecastPeriod: forecastPeriod || 'MONTHLY',
        operatingRevenue,
        operatingExpenses,
        operatingCashFlow,
        investingInflow: investingInflow || 0,
        investingOutflow: investingOutflow || 0,
        investingCashFlow,
        financingInflow: financingInflow || 0,
        financingOutflow: financingOutflow || 0,
        financingCashFlow,
        netCashFlow,
        beginningCash,
        endingCash,
        confidence: confidence || 'MEDIUM',
        notes,
        tenantId
      }
    });

    return res.status(201).json(forecast);
  } catch (err) {
    console.error('Error creating cash flow forecast:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update cash flow forecast with actuals
 */
exports.updateCashFlowForecast = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.user;
    const {
      actualCash,
      notes
    } = req.body;

    const currentForecast = await prisma.cashFlowForecast.findUnique({
      where: { id, tenantId }
    });

    if (!currentForecast) {
      return res.status(404).json({ error: 'Cash flow forecast not found' });
    }

    const variance = actualCash ? 
      actualCash - currentForecast.endingCash : 
      currentForecast.variance;

    const forecast = await prisma.cashFlowForecast.update({
      where: { id, tenantId },
      data: {
        actualCash: actualCash || currentForecast.actualCash,
        variance,
        notes
      }
    });

    return res.json(forecast);
  } catch (err) {
    console.error('Error updating cash flow forecast:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// === VARIANCE ANALYSIS ===

/**
 * Get variance analyses
 */
exports.getVarianceAnalyses = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { 
      analysisType,
      varianceRating,
      budgetScenarioId,
      costCenterId,
      startDate, 
      endDate,
      page = 1,
      limit = 20
    } = req.query;

    const where = { tenantId };
    if (analysisType) where.analysisType = analysisType;
    if (varianceRating) where.varianceRating = varianceRating;
    if (budgetScenarioId) where.budgetScenarioId = budgetScenarioId;
    if (costCenterId) where.costCenterId = costCenterId;
    if (startDate && endDate) {
      where.analysisDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const [analyses, total] = await Promise.all([
      prisma.varianceAnalysis.findMany({
        where,
        include: {
          budgetScenario: { select: { id: true, name: true, scenarioType: true } },
          costCenter: { select: { id: true, code: true, name: true } },
          account: { select: { id: true, accountCode: true, accountName: true } }
        },
        orderBy: { analysisDate: 'desc' },
        skip: (page - 1) * limit,
        take: parseInt(limit)
      }),
      prisma.varianceAnalysis.count({ where })
    ]);

    // If no analyses exist, return mock data
    if (analyses.length === 0) {
      const mockData = [
        {
          id: 'var_001',
          analysisDate: '2024-02-01T00:00:00.000Z',
          analysisType: 'BUDGET_VS_ACTUAL',
          budgetScenario: { id: 'scenario_001', name: '2024 Baseline Budget', scenarioType: 'BASELINE' },
          costCenter: { id: 'cc_ops', code: 'OPS', name: 'Operations' },
          account: { id: 'acc_5000', accountCode: '5000', accountName: 'Operating Expenses' },
          budgetAmount: 125000.00,
          actualAmount: 132750.00,
          variance: 7750.00,
          variancePercent: 6.20,
          varianceRating: 'UNFAVORABLE_MINOR',
          explanation: 'Higher than budgeted due to increased overtime costs',
          actionRequired: true,
          actionNotes: 'Review staffing levels and overtime policies'
        },
        {
          id: 'var_002',
          analysisDate: '2024-02-01T00:00:00.000Z',
          analysisType: 'BUDGET_VS_ACTUAL',
          budgetScenario: { id: 'scenario_001', name: '2024 Baseline Budget', scenarioType: 'BASELINE' },
          costCenter: { id: 'cc_ops', code: 'OPS', name: 'Operations' },
          account: { id: 'acc_4000', accountCode: '4000', accountName: 'Service Revenue' },
          budgetAmount: 485000.00,
          actualAmount: 492750.00,
          variance: 7750.00,
          variancePercent: 1.60,
          varianceRating: 'FAVORABLE_MINOR',
          explanation: 'Revenue exceeded budget due to new customer acquisitions',
          actionRequired: false,
          actionNotes: null
        },
        {
          id: 'var_003',
          analysisDate: '2024-01-01T00:00:00.000Z',
          analysisType: 'PRIOR_PERIOD_COMPARISON',
          budgetScenario: null,
          costCenter: { id: 'cc_adm', code: 'ADM', name: 'Administration' },
          account: { id: 'acc_5100', accountCode: '5100', accountName: 'Administrative Expenses' },
          budgetAmount: 42000.00,
          actualAmount: 38500.00,
          variance: -3500.00,
          variancePercent: -8.33,
          varianceRating: 'FAVORABLE_MINOR',
          explanation: 'Cost reduction initiatives showing positive impact',
          actionRequired: false,
          actionNotes: 'Continue monitoring to ensure sustainability'
        }
      ];
      return res.json({ data: mockData, total: mockData.length, page: 1, totalPages: 1 });
    }

    return res.json({
      data: analyses,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('Error fetching variance analyses:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Create variance analysis
 */
exports.createVarianceAnalysis = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const {
      analysisType,
      budgetScenarioId,
      costCenterId,
      accountId,
      budgetAmount,
      actualAmount,
      explanation,
      actionRequired,
      actionNotes
    } = req.body;

    if (!analysisType || !budgetAmount || !actualAmount) {
      return res.status(400).json({ 
        error: 'Analysis type, budget amount, and actual amount are required' 
      });
    }

    const variance = actualAmount - budgetAmount;
    const variancePercent = budgetAmount > 0 ? 
      ((variance / budgetAmount) * 100) : 0;

    // Determine variance rating
    let varianceRating;
    const absPercent = Math.abs(variancePercent);
    
    if (absPercent >= 15) {
      varianceRating = variance > 0 ? 'UNFAVORABLE_SIGNIFICANT' : 'FAVORABLE_SIGNIFICANT';
    } else if (absPercent >= 5) {
      varianceRating = variance > 0 ? 'UNFAVORABLE_MINOR' : 'FAVORABLE_MINOR';
    } else {
      varianceRating = 'WITHIN_TOLERANCE';
    }

    const analysis = await prisma.varianceAnalysis.create({
      data: {
        analysisDate: new Date(),
        analysisType,
        budgetScenarioId,
        costCenterId,
        accountId,
        budgetAmount,
        actualAmount,
        variance,
        variancePercent,
        varianceRating,
        explanation,
        actionRequired: actionRequired || false,
        actionNotes,
        tenantId
      },
      include: {
        budgetScenario: { select: { id: true, name: true, scenarioType: true } },
        costCenter: { select: { id: true, code: true, name: true } },
        account: { select: { id: true, accountCode: true, accountName: true } }
      }
    });

    return res.status(201).json(analysis);
  } catch (err) {
    console.error('Error creating variance analysis:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update variance analysis
 */
exports.updateVarianceAnalysis = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.user;
    const {
      explanation,
      actionRequired,
      actionNotes
    } = req.body;

    const analysis = await prisma.varianceAnalysis.update({
      where: { id, tenantId },
      data: {
        explanation,
        actionRequired,
        actionNotes
      },
      include: {
        budgetScenario: { select: { id: true, name: true, scenarioType: true } },
        costCenter: { select: { id: true, code: true, name: true } },
        account: { select: { id: true, accountCode: true, accountName: true } }
      }
    });

    return res.json(analysis);
  } catch (err) {
    console.error('Error updating variance analysis:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete variance analysis
 */
exports.deleteVarianceAnalysis = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.user;

    await prisma.varianceAnalysis.delete({
      where: { id, tenantId }
    });

    return res.json({ message: 'Variance analysis deleted successfully' });
  } catch (err) {
    console.error('Error deleting variance analysis:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// === INDIVIDUAL GETTERS ===

/**
 * Get individual budget scenario by ID
 */
exports.getBudgetScenario = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.user;

    const scenario = await prisma.budgetScenario.findFirst({
      where: { id, tenantId },
      include: {
        budgetForecasts: true,
        costCenter: { select: { id: true, code: true, name: true } }
      }
    });

    if (!scenario) {
      return res.status(404).json({ error: 'Budget scenario not found' });
    }

    return res.json(scenario);
  } catch (err) {
    console.error('Error fetching budget scenario:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete budget scenario
 */
exports.deleteBudgetScenario = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.user;

    await prisma.budgetScenario.delete({
      where: { id, tenantId }
    });

    return res.json({ message: 'Budget scenario deleted successfully' });
  } catch (err) {
    console.error('Error deleting budget scenario:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get individual budget forecast by ID
 */
exports.getBudgetForecast = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.user;

    const forecast = await prisma.budgetForecast.findFirst({
      where: { id, tenantId },
      include: {
        budgetScenario: { select: { id: true, name: true, scenarioType: true } },
        costCenter: { select: { id: true, code: true, name: true } },
        account: { select: { id: true, accountCode: true, accountName: true } }
      }
    });

    if (!forecast) {
      return res.status(404).json({ error: 'Budget forecast not found' });
    }

    return res.json(forecast);
  } catch (err) {
    console.error('Error fetching budget forecast:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete budget forecast
 */
exports.deleteBudgetForecast = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.user;

    await prisma.budgetForecast.delete({
      where: { id, tenantId }
    });

    return res.json({ message: 'Budget forecast deleted successfully' });
  } catch (err) {
    console.error('Error deleting budget forecast:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get individual cash flow forecast by ID
 */
exports.getCashFlowForecast = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.user;

    const forecast = await prisma.cashFlowForecast.findFirst({
      where: { id, tenantId },
      include: {
        budgetScenario: { select: { id: true, name: true, scenarioType: true } }
      }
    });

    if (!forecast) {
      return res.status(404).json({ error: 'Cash flow forecast not found' });
    }

    return res.json(forecast);
  } catch (err) {
    console.error('Error fetching cash flow forecast:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete cash flow forecast
 */
exports.deleteCashFlowForecast = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.user;

    await prisma.cashFlowForecast.delete({
      where: { id, tenantId }
    });

    return res.json({ message: 'Cash flow forecast deleted successfully' });
  } catch (err) {
    console.error('Error deleting cash flow forecast:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get variance analysis (alias for getVarianceAnalyses for consistency)
 */
exports.getVarianceAnalysis = async (req, res) => {
  // Delegate to existing function
  return exports.getVarianceAnalyses(req, res);
};

/**
 * Get individual variance analysis by ID
 */
exports.getVarianceAnalysisById = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.user;

    const analysis = await prisma.varianceAnalysis.findFirst({
      where: { id, tenantId },
      include: {
        budgetScenario: { select: { id: true, name: true, scenarioType: true } },
        costCenter: { select: { id: true, code: true, name: true } },
        account: { select: { id: true, accountCode: true, accountName: true } }
      }
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Variance analysis not found' });
    }

    return res.json(analysis);
  } catch (err) {
    console.error('Error fetching variance analysis:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// === ANALYSIS FUNCTIONS ===

/**
 * Get budget performance analysis for a scenario
 */
exports.getBudgetPerformance = async (req, res) => {
  try {
    const { scenarioId } = req.params;
    const { tenantId } = req.user;

    // Mock budget performance data
    const performance = {
      scenarioId,
      totalBudget: 850000,
      totalSpent: 725000,
      totalVariance: -125000,
      utilizationRate: 85.3,
      categoryBreakdown: [
        {
          category: 'Labor',
          budgetAmount: 450000,
          actualAmount: 465000,
          variance: 15000,
          utilizationRate: 103.3
        },
        {
          category: 'Equipment',
          budgetAmount: 200000,
          actualAmount: 180000,  
          variance: -20000,
          utilizationRate: 90.0
        },
        {
          category: 'Facilities',
          budgetAmount: 100000,
          actualAmount: 80000,
          variance: -20000,
          utilizationRate: 80.0
        },
        {
          category: 'Other',
          budgetAmount: 100000,
          actualAmount: 0,
          variance: -100000,
          utilizationRate: 0.0
        }
      ],
      monthlyTrend: [
        { month: 'Jan', budgetAmount: 70833, actualAmount: 60417 },
        { month: 'Feb', budgetAmount: 70833, actualAmount: 72500 },
        { month: 'Mar', budgetAmount: 70833, actualAmount: 68750 },
        { month: 'Apr', budgetAmount: 70833, actualAmount: 75200 },
        { month: 'May', budgetAmount: 70833, actualAmount: 69800 },
        { month: 'Jun', budgetAmount: 70833, actualAmount: 78333 }
      ]
    };

    return res.json(performance);
  } catch (err) {
    console.error('Error fetching budget performance:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get cash flow analysis for a forecast
 */
exports.getCashFlowAnalysis = async (req, res) => {
  try {
    const { forecastId } = req.params;
    const { tenantId } = req.user;

    // Mock cash flow analysis data
    const analysis = {
      forecastId,
      totalInflow: 1250000,
      totalOutflow: 1125000,
      netCashFlow: 125000,
      operatingCashFlow: 200000,
      investingCashFlow: -50000,
      financingCashFlow: -25000,
      monthlyProjections: [
        {
          month: 'Jan',
          inflow: 200000,
          outflow: 185000,
          netFlow: 15000,
          cumulativeFlow: 15000
        },
        {
          month: 'Feb', 
          inflow: 220000,
          outflow: 195000,
          netFlow: 25000,
          cumulativeFlow: 40000
        },
        {
          month: 'Mar',
          inflow: 210000,
          outflow: 190000,
          netFlow: 20000,
          cumulativeFlow: 60000
        },
        {
          month: 'Apr',
          inflow: 205000,
          outflow: 180000,
          netFlow: 25000,
          cumulativeFlow: 85000
        },
        {
          month: 'May',
          inflow: 215000,
          outflow: 185000,
          netFlow: 30000,
          cumulativeFlow: 115000
        },
        {
          month: 'Jun',
          inflow: 200000,
          outflow: 190000,
          netFlow: 10000,
          cumulativeFlow: 125000
        }
      ],
      riskFactors: [
        {
          factor: 'Seasonal Demand Variation',
          impact: 'MEDIUM',
          probability: 70,
          mitigation: 'Maintain higher cash reserves during low seasons'
        },
        {
          factor: 'Customer Payment Delays',
          impact: 'HIGH',
          probability: 35,
          mitigation: 'Implement stricter credit terms and follow-up procedures'
        }
      ]
    };

    return res.json(analysis);
  } catch (err) {
    console.error('Error fetching cash flow analysis:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get variance summary across all analyses
 */
exports.getVarianceSummary = async (req, res) => {
  try {
    const { tenantId } = req.user;

    // Mock variance summary data
    const summary = {
      totalVariances: 15,
      significantVariances: 4,
      favorableVariances: 8,
      unfavorableVariances: 7,
      totalVarianceAmount: -25500,
      averageVariancePercent: -3.2,
      categoryBreakdown: [
        {
          category: 'Labor Costs',
          count: 6,
          totalVariance: 18500,
          avgVariancePercent: 8.5,
          status: 'UNFAVORABLE'
        },
        {
          category: 'Equipment Costs',
          count: 4,
          totalVariance: -12000,
          avgVariancePercent: -15.2,
          status: 'FAVORABLE'
        },
        {
          category: 'Facility Costs',
          count: 3,
          totalVariance: -8000,
          avgVariancePercent: -12.0,
          status: 'FAVORABLE'
        },
        {
          category: 'Other',
          count: 2,
          totalVariance: -24000,
          avgVariancePercent: -20.0,
          status: 'FAVORABLE'
        }
      ],
      trendAnalysis: {
        improvingVariances: 3,
        worseningVariances: 2,
        stableVariances: 10
      },
      actionItems: [
        {
          priority: 'HIGH',
          category: 'Labor Costs',
          description: 'Review overtime policies and staffing levels',
          dueDate: '2024-02-15'
        },
        {
          priority: 'MEDIUM',
          category: 'Equipment Costs',
          description: 'Optimize maintenance schedules to maintain savings',
          dueDate: '2024-02-28'
        }
      ]
    };

    return res.json(summary);
  } catch (err) {
    console.error('Error fetching variance summary:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// === DASHBOARD ===

/**
 * Get budgeting and forecasting dashboard data
 */
exports.getBudgetingForecastingDashboard = async (req, res) => {
  try {
    const { tenantId } = req.user;

    // Mock dashboard data for demonstration
    const dashboardData = {
      totalBudgetVariance: -12500,
      budgetUtilization: 85.2,
      cashFlowProjection: {
        nextMonth: 125000,
        quarterProjection: 385000,
        yearProjection: 1540000
      },
      activeBudgetScenarios: 3,
      scenarios: [
        { name: 'Baseline', totalBudget: 850000, utilized: 725000, variance: -15000 },
        { name: 'Optimistic', totalBudget: 920000, utilized: 725000, variance: 195000 },
        { name: 'Pessimistic', totalBudget: 780000, utilized: 725000, variance: 55000 }
      ],
      significantVariances: [
        {
          id: 1,
          category: 'Labor Costs',
          budgetAmount: 125000,
          actualAmount: 138500,
          variance: 13500,
          varianceRating: 'UNFAVORABLE_SIGNIFICANT',
          account: { accountName: 'Labor Costs' }
        },
        {
          id: 2,
          category: 'Equipment Maintenance',
          budgetAmount: 25000,
          actualAmount: 21000,
          variance: -4000,
          varianceRating: 'FAVORABLE_MINOR',
          account: { accountName: 'Equipment Maintenance' }
        }
      ],
      recentForecasts: [
        {
          id: 1,
          type: 'Cash Flow',
          period: 'Q1 2024',
          amount: 105000,
          confidence: 85,
          createdAt: '2 days ago'
        },
        {
          id: 2,
          type: 'Budget',
          period: 'March 2024',
          amount: 285000,
          confidence: 92,
          createdAt: '5 days ago'
        }
      ]
    };

    return res.json(dashboardData);
  } catch (err) {
    console.error('Error fetching budgeting forecasting dashboard:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 