const prisma = require('../services/prisma');
const { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subQuarters, subYears } = require('date-fns');

// Get compliance reports with filtering
exports.getComplianceReports = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const {
      reportType,
      reportPeriod,
      status,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { tenantId };
    if (reportType && reportType !== 'all') where.reportType = reportType;
    if (reportPeriod && reportPeriod !== 'all') where.reportPeriod = reportPeriod;
    if (status && status !== 'all') where.status = status;

    const [reports, totalCount] = await Promise.all([
      prisma.complianceReport.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
              include: {
        generator: { select: { id: true, username: true, email: true } }
      }
      }),
      prisma.complianceReport.count({ where })
    ]);

    res.json({
      reports,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / take),
        totalCount,
        hasNext: skip + take < totalCount,
        hasPrev: skip > 0
      }
    });
  } catch (error) {
    console.error('Error fetching compliance reports:', error);
    res.status(500).json({ error: 'Failed to fetch compliance reports' });
  }
};

// Generate a compliance report
exports.generateReport = async (req, res) => {
  try {
    const { tenantId, id: userId } = req.user;
    const {
      title,
      description,
      reportType,
      reportPeriod,
      startDate,
      endDate,
      includeMetrics = true
    } = req.body;

    if (!title || !reportType || !reportPeriod) {
      return res.status(400).json({ error: 'title, reportType, and reportPeriod are required' });
    }

    // Calculate period dates if not provided
    if (!startDate || !endDate) {
      const now = new Date();
      switch (reportPeriod) {
        case 'MONTHLY':
          startDate = startOfMonth(subMonths(now, 1));
          endDate = endOfMonth(subMonths(now, 1));
          break;
        case 'QUARTERLY':
          startDate = startOfQuarter(subQuarters(now, 1));
          endDate = endOfQuarter(subQuarters(now, 1));
          break;
        case 'ANNUAL':
          startDate = startOfYear(subYears(now, 1));
          endDate = endOfYear(subYears(now, 1));
          break;
        default:
          return res.status(400).json({ error: 'Invalid reportPeriod' });
      }
    }

    // Generate report data based on type
    const reportData = await generateReportData(tenantId, reportType, startDate, endDate);

    const report = await prisma.complianceReport.create({
      data: {
        title,
        description,
        reportType,
        reportPeriod,
        startDate,
        endDate,
        reportData: JSON.stringify(reportData),
        status: 'GENERATED',
        tenantId,
        generatedBy: userId
      },
      include: {
        generator: { select: { id: true, username: true, email: true } }
      }
    });

    // Generate metrics if requested
    if (includeMetrics) {
      const metrics = await generateMetrics(report.id, reportType, reportData, tenantId);
      await prisma.complianceMetric.createMany({
        data: metrics
      });
    }

    res.status(201).json(report);
  } catch (error) {
    console.error('Error generating compliance report:', error);
    res.status(500).json({ error: 'Failed to generate compliance report' });
  }
};

// Get compliance metrics
exports.getComplianceMetrics = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const {
      reportId,
      metricType,
      period,
      limit = 50
    } = req.query;

    const where = { tenantId };
    if (reportId) where.reportId = reportId;
    if (metricType && metricType !== 'all') where.metricType = metricType;
    if (period) {
      const startDate = new Date(period);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      where.periodStart = { gte: startDate };
      where.periodEnd = { lte: endDate };
    }

    const metrics = await prisma.complianceMetric.findMany({
      where,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        report: { select: { id: true, title: true, reportType: true } }
      }
    });

    res.json({ metrics });
  } catch (error) {
    console.error('Error fetching compliance metrics:', error);
    res.status(500).json({ error: 'Failed to fetch compliance metrics' });
  }
};

// Get compliance dashboard data
exports.getDashboardData = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { period = 'MONTHLY' } = req.query;

    const now = new Date();
    let startDate, endDate;

    switch (period) {
      case 'MONTHLY':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'QUARTERLY':
        startDate = startOfQuarter(now);
        endDate = endOfQuarter(now);
        break;
      case 'ANNUAL':
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        break;
      default:
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
    }

    // Build filter for upcoming document reminders (next 30 days)
    const reminderWhere = {
      isCompleted: false,
      reminderDate: {
        lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      document: {
        is: { tenantId }
      }
    };

    // Get various compliance metrics
    const [
      soxControlStats,
      soxTestStats,
      insuranceClaimsStats,
      documentStats,
      recentReports,
      upcomingReminders
    ] = await Promise.all([
      // SOX Control statistics
      prisma.soxControl.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { status: true }
      }),
      
      // SOX Test statistics
      prisma.soxTest.groupBy({
        by: ['result'],
        where: {
          tenantId,
          testDate: { gte: startDate, lte: endDate }
        },
        _count: { result: true }
      }),
      
      // Insurance Claims statistics
      prisma.insuranceClaim.groupBy({
        by: ['status'],
        where: {
          tenantId,
          dateFiled: { gte: startDate, lte: endDate }
        },
        _count: { status: true }
      }),
      
      // Document statistics
      prisma.complianceDocument.groupBy({
        by: ['documentType'],
        where: {
          tenantId,
          createdAt: { gte: startDate, lte: endDate }
        },
        _count: { documentType: true }
      }),
      
      // Recent reports
      prisma.complianceReport.findMany({
        where: { tenantId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          generator: { select: { id: true, username: true } }
        }
      }),
      
      // Upcoming reminders
      prisma.documentReminder.findMany({
        where: reminderWhere,
        take: 10,
        orderBy: { reminderDate: 'asc' },
        include: {
          document: { select: { id: true, title: true, documentType: true } },
          assignee: { select: { id: true, username: true } }
        }
      })
    ]);

    const dashboardData = {
      period,
      periodStart: startDate,
      periodEnd: endDate,
      soxControls: {
        total: soxControlStats.reduce((sum, stat) => sum + stat._count.status, 0),
        byStatus: soxControlStats.reduce((acc, stat) => {
          acc[stat.status] = stat._count.status;
          return acc;
        }, {})
      },
      soxTests: {
        total: soxTestStats.reduce((sum, stat) => sum + stat._count.result, 0),
        byResult: soxTestStats.reduce((acc, stat) => {
          acc[stat.result] = stat._count.result;
          return acc;
        }, {})
      },
      insuranceClaims: {
        total: insuranceClaimsStats.reduce((sum, stat) => sum + stat._count.status, 0),
        byStatus: insuranceClaimsStats.reduce((acc, stat) => {
          acc[stat.status] = stat._count.status;
          return acc;
        }, {})
      },
      documents: {
        total: documentStats.reduce((sum, stat) => sum + stat._count.documentType, 0),
        byType: documentStats.reduce((acc, stat) => {
          acc[stat.documentType] = stat._count.documentType;
          return acc;
        }, {})
      },
      recentReports,
      upcomingReminders
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
};

// Helper function to generate report data
async function generateReportData(tenantId, reportType, startDate, endDate) {
  const data = {};

  switch (reportType) {
    case 'SOX_COMPLIANCE':
      data.soxControls = await prisma.soxControl.findMany({
        where: { tenantId },
        include: {
          tests: {
            where: {
              testDate: { gte: startDate, lte: endDate }
            }
          }
        }
      });
      break;

    case 'INSURANCE_SUMMARY':
      data.insuranceClaims = await prisma.insuranceClaim.findMany({
        where: {
          tenantId,
          dateFiled: { gte: startDate, lte: endDate }
        }
      });
      break;

    case 'AUDIT_SUMMARY':
      data.auditLogs = await prisma.auditLog.findMany({
        where: {
          tenantId,
          timestamp: { gte: startDate, lte: endDate }
        },
        take: 1000,
        orderBy: { timestamp: 'desc' }
      });
      break;

    case 'DOCUMENT_COMPLIANCE':
      data.documents = await prisma.complianceDocument.findMany({
        where: {
          tenantId,
          OR: [
            { createdAt: { gte: startDate, lte: endDate } },
            { expiryDate: { gte: startDate, lte: endDate } }
          ]
        }
      });
      break;

    default:
      throw new Error('Unknown report type');
  }

  return data;
}

// Helper function to generate metrics
async function generateMetrics(reportId, reportType, reportData, tenantId) {
  const metrics = [];
  const now = new Date();

  switch (reportType) {
    case 'SOX_COMPLIANCE':
      if (reportData.soxControls) {
        const totalControls = reportData.soxControls.length;
        const effectiveControls = reportData.soxControls.filter(c => c.status === 'EFFECTIVE').length;
        const passedTests = reportData.soxControls.reduce((sum, c) => 
          sum + c.tests.filter(t => t.result === 'PASS').length, 0);
        const totalTests = reportData.soxControls.reduce((sum, c) => sum + c.tests.length, 0);

        metrics.push({
          reportId,
          metricType: 'CONTROL_EFFECTIVENESS',
          value: totalControls > 0 ? (effectiveControls / totalControls * 100) : 0,
          periodStart: now,
          periodEnd: now,
          tenantId
        });

        metrics.push({
          reportId,
          metricType: 'TEST_PASS_RATE',
          value: totalTests > 0 ? (passedTests / totalTests * 100) : 0,
          periodStart: now,
          periodEnd: now,
          tenantId
        });
      }
      break;

    case 'INSURANCE_SUMMARY':
      if (reportData.insuranceClaims) {
        const totalClaims = reportData.insuranceClaims.length;
        const approvedClaims = reportData.insuranceClaims.filter(c => c.status === 'APPROVED').length;
        const totalClaimAmount = reportData.insuranceClaims.reduce((sum, c) => sum + (c.claimAmount || 0), 0);

        metrics.push({
          reportId,
          metricType: 'CLAIM_APPROVAL_RATE',
          value: totalClaims > 0 ? (approvedClaims / totalClaims * 100) : 0,
          periodStart: now,
          periodEnd: now,
          tenantId
        });

        metrics.push({
          reportId,
          metricType: 'TOTAL_CLAIM_VALUE',
          value: totalClaimAmount,
          periodStart: now,
          periodEnd: now,
          tenantId
        });
      }
      break;
  }

  return metrics;
}

// Update report status
exports.updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.user;
    const { status } = req.body;

    if (!['DRAFT', 'GENERATED', 'REVIEWED', 'APPROVED', 'ARCHIVED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const report = await prisma.complianceReport.update({
      where: { id, tenantId },
      data: { status },
      include: {
        generator: { select: { id: true, username: true, email: true } }
      }
    });

    res.json(report);
  } catch (error) {
    console.error('Error updating report status:', error);
    res.status(500).json({ error: 'Failed to update report status' });
  }
}; 