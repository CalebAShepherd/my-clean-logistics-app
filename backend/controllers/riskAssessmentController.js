const prisma = require('../services/prisma');

// Get risk assessments with filtering
exports.getRiskAssessments = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const {
      category,
      riskLevel,
      status,
      assessmentDate,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { tenantId };
    if (category && category !== 'all') where.category = category;
    if (riskLevel && riskLevel !== 'all') where.riskLevel = riskLevel;
    if (status && status !== 'all') where.status = status;
    if (assessmentDate) {
      const date = new Date(assessmentDate);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));
      where.assessmentDate = { gte: startOfDay, lte: endOfDay };
    }

    const [assessments, totalCount] = await Promise.all([
      prisma.riskAssessment.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          assessor: { select: { id: true, username: true, email: true } }
        }
      }),
      prisma.riskAssessment.count({ where })
    ]);

    // Map schema fields to frontend expected fields
    const mappedAssessments = assessments.map(assessment => ({
      ...assessment,
      title: assessment.entityName,
      description: assessment.assessmentNotes,
      category: assessment.entityType, // Customer, Supplier, etc.
      riskLevel: assessment.overallRisk,
      status: 'ASSESSED', // Default status since schema doesn't have this field
      mitigation: null // Schema doesn't have mitigation field
    }));

    res.json({
      assessments: mappedAssessments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / take),
        totalCount,
        hasNext: skip + take < totalCount,
        hasPrev: skip > 0
      }
    });
  } catch (error) {
    console.error('Error fetching risk assessments:', error);
    res.status(500).json({ error: 'Failed to fetch risk assessments' });
  }
};

// Create a new risk assessment
exports.createRiskAssessment = async (req, res) => {
  try {
    const { tenantId, id: userId } = req.user;
    const {
      title,
      description,
      category,
      riskLevel,
      probability,
      impact,
      riskScore,
      mitigation,
      assignedToId,
      dueDate,
      assessmentDate
    } = req.body;

    if (!title || !category || !riskLevel) {
      return res.status(400).json({ error: 'title, category, and riskLevel are required' });
    }

    // Calculate risk score if not provided
    let calculatedRiskScore = riskScore;
    if (!calculatedRiskScore && probability && impact) {
      calculatedRiskScore = probability * impact;
    }

    const assessment = await prisma.riskAssessment.create({
      data: {
        entityType: 'Project', // Default entity type
        entityId: 'default',
        entityName: title,
        overallRisk: riskLevel,
        riskScore: calculatedRiskScore ? parseFloat(calculatedRiskScore) : (probability && impact ? probability * impact : 1.0),
        riskFactors: JSON.stringify([]),
        assessmentDate: assessmentDate ? new Date(assessmentDate) : new Date(),
        assessmentNotes: description,
        reviewDate: dueDate ? new Date(dueDate) : null,
        assessedBy: userId,
        tenantId
      },
      include: {
        assessor: { select: { id: true, username: true, email: true } }
      }
    });

    res.status(201).json(assessment);
  } catch (error) {
    console.error('Error creating risk assessment:', error);
    res.status(500).json({ error: 'Failed to create risk assessment' });
  }
};

// Update a risk assessment
exports.updateRiskAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.user;
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates.tenantId;
    delete updates.assessedBy;

    // Recalculate risk score if probability or impact changed
    if (updates.probability || updates.impact) {
      const existing = await prisma.riskAssessment.findFirst({
        where: { id, tenantId }
      });
      
      if (existing) {
        const newProbability = updates.probability || existing.probability;
        const newImpact = updates.impact || existing.impact;
        if (newProbability && newImpact) {
          updates.riskScore = newProbability * newImpact;
        }
      }
    }

    const assessment = await prisma.riskAssessment.update({
      where: { id, tenantId },
      data: updates,
      include: {
        assessor: { select: { id: true, username: true, email: true } }
      }
    });

    res.json(assessment);
  } catch (error) {
    console.error('Error updating risk assessment:', error);
    res.status(500).json({ error: 'Failed to update risk assessment' });
  }
};

// Delete a risk assessment
exports.deleteRiskAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.user;

    await prisma.riskAssessment.delete({
      where: { id, tenantId }
    });

    res.json({ message: 'Risk assessment deleted successfully' });
  } catch (error) {
    console.error('Error deleting risk assessment:', error);
    res.status(500).json({ error: 'Failed to delete risk assessment' });
  }
};

// Get credit limits with filtering
exports.getCreditLimits = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const {
      customerId,
      supplierId,
      status,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { tenantId };
    if (customerId) where.customerId = customerId;
    if (status && status !== 'all') where.status = status;

    const [creditLimits, totalCount] = await Promise.all([
      prisma.creditLimit.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          approver: { select: { id: true, username: true, email: true } }
        }
      }),
      prisma.creditLimit.count({ where })
    ]);

    res.json({
      creditLimits,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / take),
        totalCount,
        hasNext: skip + take < totalCount,
        hasPrev: skip > 0
      }
    });
  } catch (error) {
    console.error('Error fetching credit limits:', error);
    res.status(500).json({ error: 'Failed to fetch credit limits' });
  }
};

// Create or update credit limit
exports.createCreditLimit = async (req, res) => {
  try {
    const { tenantId, id: userId } = req.user;
    const {
      customerId,
      customerName,
      creditLimit,
      availableCredit,
      paymentTerms,
      interestRate,
      expiryDate
    } = req.body;

    if (!creditLimit || !customerId || !customerName) {
      return res.status(400).json({ error: 'creditLimit, customerId, and customerName are required' });
    }

    const creditLimitRecord = await prisma.creditLimit.create({
      data: {
        customerId,
        customerName,
        creditLimit: parseFloat(creditLimit),
        availableCredit: availableCredit ? parseFloat(availableCredit) : parseFloat(creditLimit),
        paymentTerms: paymentTerms ? parseInt(paymentTerms) : 30,
        interestRate: interestRate ? parseFloat(interestRate) : null,
        approvalDate: new Date(),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        status: 'ACTIVE',
        approvedBy: userId,
        tenantId
      },
      include: {
        approver: { select: { id: true, username: true, email: true } }
      }
    });

    res.status(201).json(creditLimitRecord);
  } catch (error) {
    console.error('Error creating credit limit:', error);
    res.status(500).json({ error: 'Failed to create credit limit' });
  }
};

// Update credit limit
exports.updateCreditLimit = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.user;
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates.tenantId;
    delete updates.approvedBy;

    const creditLimit = await prisma.creditLimit.update({
      where: { id, tenantId },
      data: updates,
      include: {
        approver: { select: { id: true, username: true, email: true } }
      }
    });

    res.json(creditLimit);
  } catch (error) {
    console.error('Error updating credit limit:', error);
    res.status(500).json({ error: 'Failed to update credit limit' });
  }
};

// Get risk dashboard data
exports.getRiskDashboard = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { period = 'MONTHLY' } = req.query;

    const now = new Date();
    let startDate, endDate;

    switch (period) {
      case 'MONTHLY':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'QUARTERLY':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
        break;
      case 'ANNUAL':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    const [
      riskByLevel,
      riskByCategory,
      riskByStatus,
      overdueTasks,
      highRiskItems,
      creditLimitSummary
    ] = await Promise.all([
      // Risk assessments by level
      prisma.riskAssessment.groupBy({
        by: ['overallRisk'],
        where: {
          tenantId,
          assessmentDate: { gte: startDate, lte: endDate }
        },
        _count: { overallRisk: true }
      }),

      // Risk assessments by entity type
      prisma.riskAssessment.groupBy({
        by: ['entityType'],
        where: {
          tenantId,
          assessmentDate: { gte: startDate, lte: endDate }
        },
        _count: { entityType: true }
      }),

      // Risk assessments count
      prisma.riskAssessment.count({
        where: { tenantId }
      }),

      // Overdue risk assessments
      prisma.riskAssessment.count({
        where: {
          tenantId,
          reviewDate: { lt: now }
        }
      }),

      // High risk items
      prisma.riskAssessment.findMany({
        where: {
          tenantId,
          overallRisk: 'HIGH'
        },
        take: 10,
        orderBy: { riskScore: 'desc' },
        include: {
          assessor: { select: { id: true, username: true } }
        }
      }),

      // Credit limit summary
      prisma.creditLimit.aggregate({
        where: {
          tenantId,
          status: 'ACTIVE'
        },
        _sum: {
          creditLimit: true,
          availableCredit: true
        },
        _count: true
      })
    ]);

    const dashboardData = {
      period,
      periodStart: startDate,
      periodEnd: endDate,
      riskSummary: {
        byLevel: riskByLevel.reduce((acc, item) => {
          acc[item.overallRisk] = item._count.overallRisk;
          return acc;
        }, {}),
        byEntityType: riskByCategory.reduce((acc, item) => {
          acc[item.entityType] = item._count.entityType;
          return acc;
        }, {}),
        totalAssessments: riskByStatus,
        overdueTasks,
        highRiskItems
      },
      creditSummary: {
        totalLimits: creditLimitSummary._count || 0,
        totalCreditAmount: creditLimitSummary._sum.creditLimit || 0,
        totalAvailableCredit: creditLimitSummary._sum.availableCredit || 0,
        utilizationRate: creditLimitSummary._sum.creditLimit > 0 ? 
          ((creditLimitSummary._sum.creditLimit - creditLimitSummary._sum.availableCredit) / creditLimitSummary._sum.creditLimit * 100) : 0
      }
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('Error fetching risk dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch risk dashboard data' });
  }
};

// Generate risk report
exports.generateRiskReport = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { reportType, startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    let reportData = {};

    switch (reportType) {
      case 'RISK_SUMMARY':
        reportData = await prisma.riskAssessment.findMany({
          where: {
            tenantId,
            assessmentDate: { gte: start, lte: end }
          },
          include: {
            assessor: { select: { id: true, username: true } }
          },
          orderBy: { riskScore: 'desc' }
        });
        break;

      case 'CREDIT_SUMMARY':
        reportData = await prisma.creditLimit.findMany({
          where: {
            tenantId,
            createdAt: { gte: start, lte: end }
          },
          include: {
            approver: { select: { id: true, username: true } }
          },
          orderBy: { creditLimit: 'desc' }
        });
        break;

      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    res.json({
      reportType,
      periodStart: start,
      periodEnd: end,
      data: reportData,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Error generating risk report:', error);
    res.status(500).json({ error: 'Failed to generate risk report' });
  }
}; 