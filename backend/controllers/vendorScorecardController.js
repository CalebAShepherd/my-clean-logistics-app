const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all vendor scorecards with filtering
exports.getVendorScorecards = async (req, res) => {
  try {
    const { 
      supplierId, 
      evaluatedBy,
      dateFrom,
      dateTo,
      sortBy = 'evaluationDate', 
      sortOrder = 'desc',
      page = 1,
      limit = 50 
    } = req.query;

    // Build filter conditions
    const where = {};
    
    if (supplierId) where.supplierId = supplierId;
    if (evaluatedBy) where.evaluatedBy = evaluatedBy;
    
    // Date range filter
    if (dateFrom || dateTo) {
      where.evaluationDate = {};
      if (dateFrom) where.evaluationDate.gte = new Date(dateFrom);
      if (dateTo) where.evaluationDate.lte = new Date(dateTo);
    }

    // Build sort conditions
    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    const scorecards = await prisma.vendorScorecard.findMany({
      where,
      orderBy,
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
      include: {
        supplier: {
          select: { name: true, email: true, status: true }
        },
        evaluator: {
          select: { username: true, email: true }
        }
      }
    });

    const total = await prisma.vendorScorecard.count({ where });

    return res.json({
      scorecards,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Error fetching vendor scorecards:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single vendor scorecard
exports.getVendorScorecard = async (req, res) => {
  try {
    const { id } = req.params;
    
    const scorecard = await prisma.vendorScorecard.findUnique({
      where: { id },
      include: {
        supplier: {
          include: {
            purchaseOrders: {
              where: {
                orderDate: {
                  gte: new Date(new Date().getFullYear(), 0, 1) // This year's orders
                }
              },
              select: {
                id: true,
                orderNumber: true,
                status: true,
                totalAmount: true,
                orderDate: true,
                expectedDate: true,
                deliveredDate: true
              }
            },
            _count: {
              select: { purchaseOrders: true }
            }
          }
        },
        evaluator: {
          select: { username: true, email: true, phone: true }
        }
      }
    });

    if (!scorecard) {
      return res.status(404).json({ error: 'Vendor scorecard not found' });
    }

    return res.json(scorecard);
  } catch (err) {
    console.error('Error fetching vendor scorecard:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Create vendor scorecard
exports.createVendorScorecard = async (req, res) => {
  try {
    const { 
      supplierId,
      evaluatedBy,
      qualityScore,
      deliveryScore,
      serviceScore,
      costScore,
      qualityNotes,
      deliveryNotes,
      serviceNotes,
      costNotes,
      generalNotes
    } = req.body;

    if (!supplierId) {
      return res.status(400).json({ error: 'Supplier ID is required' });
    }

    if (!evaluatedBy) {
      return res.status(400).json({ error: 'Evaluator ID is required' });
    }

    // Validate scores (0-100)
    const scores = { qualityScore, deliveryScore, serviceScore, costScore };
    for (const [key, value] of Object.entries(scores)) {
      if (value !== undefined && value !== null && (value < 0 || value > 100)) {
        return res.status(400).json({ error: `${key} must be between 0 and 100` });
      }
    }

    // Calculate overall score (weighted average)
    const validScores = Object.values(scores).filter(score => score !== undefined && score !== null);
    const overallScore = validScores.length > 0 
      ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length 
      : 0;

    const newScorecard = await prisma.vendorScorecard.create({
      data: {
        supplierId,
        evaluatedBy,
        evaluationDate: new Date(),
        qualityScore: qualityScore || 0,
        deliveryScore: deliveryScore || 0,
        serviceScore: serviceScore || 0,
        costScore: costScore || 0,
        overallScore,
        qualityNotes: qualityNotes?.trim() || null,
        deliveryNotes: deliveryNotes?.trim() || null,
        serviceNotes: serviceNotes?.trim() || null,
        costNotes: costNotes?.trim() || null,
        generalNotes: generalNotes?.trim() || null
      },
      include: {
        supplier: {
          select: { name: true, email: true }
        },
        evaluator: {
          select: { username: true, email: true }
        }
      }
    });

    // Update supplier's performance score
    await updateSupplierPerformanceScore(supplierId);

    return res.status(201).json(newScorecard);
  } catch (err) {
    console.error('Error creating vendor scorecard:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Update vendor scorecard
exports.updateVendorScorecard = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Check if scorecard exists
    const existing = await prisma.vendorScorecard.findUnique({
      where: { id },
      select: { supplierId: true }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Vendor scorecard not found' });
    }

    // Validate scores if provided
    const scores = ['qualityScore', 'deliveryScore', 'serviceScore', 'costScore'];
    for (const scoreField of scores) {
      if (updateData[scoreField] !== undefined && updateData[scoreField] !== null) {
        if (updateData[scoreField] < 0 || updateData[scoreField] > 100) {
          return res.status(400).json({ error: `${scoreField} must be between 0 and 100` });
        }
      }
    }

    // Recalculate overall score if any individual scores updated
    if (scores.some(field => updateData[field] !== undefined)) {
      const currentScorecard = await prisma.vendorScorecard.findUnique({
        where: { id },
        select: { qualityScore: true, deliveryScore: true, serviceScore: true, costScore: true }
      });

      const newScores = {
        qualityScore: updateData.qualityScore ?? currentScorecard.qualityScore,
        deliveryScore: updateData.deliveryScore ?? currentScorecard.deliveryScore,
        serviceScore: updateData.serviceScore ?? currentScorecard.serviceScore,
        costScore: updateData.costScore ?? currentScorecard.costScore
      };

      const validScores = Object.values(newScores).filter(score => score !== null && score !== undefined);
      updateData.overallScore = validScores.length > 0 
        ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length 
        : 0;
    }

    // Clean up string fields
    Object.keys(updateData).forEach(key => {
      if (typeof updateData[key] === 'string') {
        updateData[key] = updateData[key].trim() || null;
      }
    });

    const updatedScorecard = await prisma.vendorScorecard.update({
      where: { id },
      data: updateData,
      include: {
        supplier: {
          select: { name: true, email: true }
        },
        evaluator: {
          select: { username: true, email: true }
        }
      }
    });

    // Update supplier's performance score
    await updateSupplierPerformanceScore(existing.supplierId);

    return res.json(updatedScorecard);
  } catch (err) {
    console.error('Error updating vendor scorecard:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get supplier scorecard summary
exports.getSupplierScorecardSummary = async (req, res) => {
  try {
    const { supplierId } = req.params;
    const { period = '12M' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '3M':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case '6M':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        break;
      case '12M':
      default:
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        break;
    }

    // Get all scorecards for the supplier in the period
    const scorecards = await prisma.vendorScorecard.findMany({
      where: {
        supplierId,
        evaluationDate: { gte: startDate }
      },
      orderBy: { evaluationDate: 'desc' },
      include: {
        evaluator: {
          select: { username: true }
        }
      }
    });

    if (scorecards.length === 0) {
      return res.json({
        supplierId,
        period,
        summary: {
          totalEvaluations: 0,
          averageOverallScore: 0,
          averageQualityScore: 0,
          averageDeliveryScore: 0,
          averageServiceScore: 0,
          averageCostScore: 0,
          trend: 'NO_DATA'
        },
        scorecards: []
      });
    }

    // Calculate averages
    const summary = {
      totalEvaluations: scorecards.length,
      averageOverallScore: scorecards.reduce((sum, s) => sum + s.overallScore, 0) / scorecards.length,
      averageQualityScore: scorecards.reduce((sum, s) => sum + s.qualityScore, 0) / scorecards.length,
      averageDeliveryScore: scorecards.reduce((sum, s) => sum + s.deliveryScore, 0) / scorecards.length,
      averageServiceScore: scorecards.reduce((sum, s) => sum + s.serviceScore, 0) / scorecards.length,
      averageCostScore: scorecards.reduce((sum, s) => sum + s.costScore, 0) / scorecards.length
    };

    // Calculate trend (comparing first half vs second half of period)
    const midPoint = Math.floor(scorecards.length / 2);
    if (scorecards.length >= 4) {
      const recentScores = scorecards.slice(0, midPoint);
      const olderScores = scorecards.slice(midPoint);
      
      const recentAvg = recentScores.reduce((sum, s) => sum + s.overallScore, 0) / recentScores.length;
      const olderAvg = olderScores.reduce((sum, s) => sum + s.overallScore, 0) / olderScores.length;
      
      const difference = recentAvg - olderAvg;
      if (difference > 5) {
        summary.trend = 'IMPROVING';
      } else if (difference < -5) {
        summary.trend = 'DECLINING';
      } else {
        summary.trend = 'STABLE';
      }
    } else {
      summary.trend = 'INSUFFICIENT_DATA';
    }

    return res.json({
      supplierId,
      period,
      summary,
      scorecards
    });
  } catch (err) {
    console.error('Error fetching supplier scorecard summary:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete vendor scorecard
exports.deleteVendorScorecard = async (req, res) => {
  try {
    const { id } = req.params;

    const scorecard = await prisma.vendorScorecard.findUnique({
      where: { id },
      select: { supplierId: true }
    });

    if (!scorecard) {
      return res.status(404).json({ error: 'Vendor scorecard not found' });
    }

    await prisma.vendorScorecard.delete({
      where: { id }
    });

    // Update supplier's performance score
    await updateSupplierPerformanceScore(scorecard.supplierId);

    return res.status(204).end();
  } catch (err) {
    console.error('Error deleting vendor scorecard:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get scorecard analytics across all suppliers
exports.getScorecardAnalytics = async (req, res) => {
  try {
    const { period = '12M' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '3M':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case '6M':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        break;
      case '12M':
      default:
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        break;
    }

    // Overall statistics
    const overallStats = await prisma.vendorScorecard.aggregate({
      where: { evaluationDate: { gte: startDate } },
      _count: { id: true },
      _avg: {
        overallScore: true,
        qualityScore: true,
        deliveryScore: true,
        serviceScore: true,
        costScore: true
      }
    });

    // Top performing suppliers
    const topSuppliers = await prisma.vendorScorecard.groupBy({
      by: ['supplierId'],
      where: { evaluationDate: { gte: startDate } },
      _avg: { overallScore: true },
      orderBy: { _avg: { overallScore: 'desc' } },
      take: 10
    });

    // Get supplier details for top performers
    const supplierIds = topSuppliers.map(s => s.supplierId);
    const suppliers = await prisma.supplier.findMany({
      where: { id: { in: supplierIds } },
      select: { id: true, name: true, supplierType: true }
    });

    const enrichedTopSuppliers = topSuppliers.map(stat => ({
      ...stat,
      supplier: suppliers.find(s => s.id === stat.supplierId)
    }));

    // Monthly trends
    const monthlyTrends = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', "evaluationDate") as month,
        COUNT(*)::int as evaluation_count,
        AVG("overallScore")::float as avg_overall_score,
        AVG("qualityScore")::float as avg_quality_score,
        AVG("deliveryScore")::float as avg_delivery_score,
        AVG("serviceScore")::float as avg_service_score,
        AVG("costScore")::float as avg_cost_score
      FROM "VendorScorecard"
      WHERE "evaluationDate" >= ${startDate}
      GROUP BY DATE_TRUNC('month', "evaluationDate")
      ORDER BY month DESC
      LIMIT 12
    `;

    return res.json({
      period,
      overallStats,
      topSuppliers: enrichedTopSuppliers,
      monthlyTrends
    });
  } catch (err) {
    console.error('Error fetching scorecard analytics:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper function to update supplier performance score
async function updateSupplierPerformanceScore(supplierId) {
  try {
    // Get recent scorecards (last 12 months)
    const recentScorecards = await prisma.vendorScorecard.findMany({
      where: {
        supplierId,
        evaluationDate: {
          gte: new Date(new Date().getFullYear() - 1, new Date().getMonth(), 1)
        }
      },
      orderBy: { evaluationDate: 'desc' }
    });

    if (recentScorecards.length === 0) {
      return;
    }

    // Calculate weighted average (more recent scores have higher weight)
    let totalWeightedScore = 0;
    let totalWeight = 0;

    recentScorecards.forEach((scorecard, index) => {
      const weight = Math.max(1, recentScorecards.length - index); // More recent = higher weight
      totalWeightedScore += scorecard.overallScore * weight;
      totalWeight += weight;
    });

    const performanceScore = totalWeightedScore / totalWeight;
    
    // Calculate individual category averages
    const qualityRating = recentScorecards.reduce((sum, s) => sum + s.qualityScore, 0) / recentScorecards.length;
    const deliveryRating = recentScorecards.reduce((sum, s) => sum + s.deliveryScore, 0) / recentScorecards.length;
    const serviceRating = recentScorecards.reduce((sum, s) => sum + s.serviceScore, 0) / recentScorecards.length;
    const costRating = recentScorecards.reduce((sum, s) => sum + s.costScore, 0) / recentScorecards.length;

    // Update supplier
    await prisma.supplier.update({
      where: { id: supplierId },
      data: {
        performanceScore,
        qualityRating,
        deliveryRating,
        serviceRating,
        costRating
      }
    });
  } catch (err) {
    console.error('Error updating supplier performance score:', err);
  }
} 