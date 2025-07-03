const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// =============================================
// FACILITY MAINTENANCE OPERATIONS
// =============================================

// Get all facility maintenance logs
const getFacilityMaintenanceLogs = async (req, res) => {
  try {
    const {
      facilityId,
      status,
      maintenanceType,
      priority,
      assignedTo,
      page = 1,
      limit = 20,
      sortBy = 'scheduledDate',
      sortOrder = 'asc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    
    if (facilityId && facilityId !== 'all') where.facilityId = facilityId;
    if (status && status !== 'all') where.status = status;
    if (maintenanceType && maintenanceType !== 'all') where.maintenanceType = maintenanceType;
    if (priority && priority !== 'all') where.priority = priority;
    if (assignedTo && assignedTo !== 'all') where.assignedTo = assignedTo;

    const [logs, totalCount] = await Promise.all([
      prisma.facilityMaintenanceLog.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          facility: {
            select: { id: true, name: true, address: true }
          },
          area: {
            select: { id: true, name: true, areaType: true }
          },
          assignedUser: {
            select: { id: true, username: true, email: true }
          },
          performedByUser: {
            select: { id: true, username: true, email: true }
          }
        }
      }),
      prisma.facilityMaintenanceLog.count({ where })
    ]);

    res.json({
      logs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / take),
        totalCount,
        hasNext: skip + take < totalCount,
        hasPrev: skip > 0
      }
    });
  } catch (error) {
    console.error('Error fetching facility maintenance logs:', error);
    res.status(500).json({ error: 'Failed to fetch facility maintenance logs' });
  }
};

// Get facility maintenance log by ID
const getFacilityMaintenanceLogById = async (req, res) => {
  try {
    const { id } = req.params;

    const log = await prisma.facilityMaintenanceLog.findUnique({
      where: { id },
      include: {
        facility: true,
        area: true,
        assignedUser: {
          select: { id: true, username: true, email: true }
        },
        performedByUser: {
          select: { id: true, username: true, email: true }
        }
      }
    });

    if (!log) {
      return res.status(404).json({ error: 'Facility maintenance log not found' });
    }

    res.json(log);
  } catch (error) {
    console.error('Error fetching facility maintenance log:', error);
    res.status(500).json({ error: 'Failed to fetch facility maintenance log' });
  }
};

// Create facility maintenance log
const createFacilityMaintenanceLog = async (req, res) => {
  try {
    const {
      facilityId,
      areaId,
      maintenanceType,
      title,
      description,
      priority = 'MEDIUM',
      scheduledDate,
      assignedTo,
      estimatedCost,
      isComplianceRequired = false,
      complianceNotes
    } = req.body;

    const log = await prisma.facilityMaintenanceLog.create({
      data: {
        facilityId,
        areaId,
        maintenanceType,
        title,
        description,
        priority,
        scheduledDate: new Date(scheduledDate),
        assignedTo,
        estimatedCost,
        isComplianceRequired,
        complianceNotes
      },
      include: {
        facility: {
          select: { id: true, name: true }
        },
        area: {
          select: { id: true, name: true, areaType: true }
        },
        assignedUser: {
          select: { id: true, username: true, email: true }
        }
      }
    });

    res.status(201).json(log);
  } catch (error) {
    console.error('Error creating facility maintenance log:', error);
    res.status(500).json({ error: 'Failed to create facility maintenance log' });
  }
};

// Update facility maintenance log
const updateFacilityMaintenanceLog = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.scheduledDate) {
      updateData.scheduledDate = new Date(updateData.scheduledDate);
    }
    if (updateData.completedDate) {
      updateData.completedDate = new Date(updateData.completedDate);
    }

    const log = await prisma.facilityMaintenanceLog.update({
      where: { id },
      data: updateData,
      include: {
        facility: {
          select: { id: true, name: true }
        },
        area: {
          select: { id: true, name: true, areaType: true }
        },
        assignedUser: {
          select: { id: true, username: true, email: true }
        },
        performedByUser: {
          select: { id: true, username: true, email: true }
        }
      }
    });

    res.json(log);
  } catch (error) {
    console.error('Error updating facility maintenance log:', error);
    res.status(500).json({ error: 'Failed to update facility maintenance log' });
  }
};

// Complete facility maintenance log
const completeFacilityMaintenanceLog = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      actualCost,
      laborHours,
      complianceNotes,
      afterPhotos,
      documentsUrls
    } = req.body;

    const performedBy = req.user?.id;
    const completedDate = new Date();

    const log = await prisma.facilityMaintenanceLog.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedDate,
        performedBy,
        actualCost,
        laborHours,
        complianceNotes,
        afterPhotos: afterPhotos || [],
        documentsUrls: documentsUrls || []
      },
      include: {
        facility: true,
        area: true,
        assignedUser: {
          select: { id: true, username: true, email: true }
        },
        performedByUser: {
          select: { id: true, username: true, email: true }
        }
      }
    });

    res.json({ message: 'Facility maintenance completed successfully', log });
  } catch (error) {
    console.error('Error completing facility maintenance log:', error);
    res.status(500).json({ error: 'Failed to complete facility maintenance log' });
  }
};

// Delete facility maintenance log
const deleteFacilityMaintenanceLog = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.facilityMaintenanceLog.delete({
      where: { id }
    });

    res.json({ message: 'Facility maintenance log deleted successfully' });
  } catch (error) {
    console.error('Error deleting facility maintenance log:', error);
    res.status(500).json({ error: 'Failed to delete facility maintenance log' });
  }
};

// =============================================
// FACILITY COMPLIANCE OPERATIONS
// =============================================

// Get all facility compliance records
const getFacilityCompliance = async (req, res) => {
  try {
    const {
      facilityId,
      complianceType,
      status,
      complianceLevel,
      page = 1,
      limit = 20,
      sortBy = 'nextCheckDate',
      sortOrder = 'asc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    
    if (facilityId && facilityId !== 'all') where.facilityId = facilityId;
    if (complianceType && complianceType !== 'all') where.complianceType = complianceType;
    if (status && status !== 'all') where.status = status;
    if (complianceLevel && complianceLevel !== 'all') where.complianceLevel = complianceLevel;

    const [compliance, totalCount] = await Promise.all([
      prisma.facilityCompliance.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          facility: {
            select: { id: true, name: true, address: true }
          },
          responsible: {
            select: { id: true, username: true, email: true }
          },
          audits: {
            select: {
              id: true,
              auditDate: true,
              auditType: true,
              passed: true,
              overallScore: true
            },
            orderBy: { auditDate: 'desc' },
            take: 3
          }
        }
      }),
      prisma.facilityCompliance.count({ where })
    ]);

    res.json({
      compliance,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / take),
        totalCount,
        hasNext: skip + take < totalCount,
        hasPrev: skip > 0
      }
    });
  } catch (error) {
    console.error('Error fetching facility compliance:', error);
    res.status(500).json({ error: 'Failed to fetch facility compliance' });
  }
};

// Get facility compliance record by ID
const getFacilityComplianceById = async (req, res) => {
  try {
    const { id } = req.params;

    const compliance = await prisma.facilityCompliance.findUnique({
      where: { id },
      include: {
        facility: true,
        responsible: {
          select: { id: true, username: true, email: true }
        },
        audits: {
          include: {
            auditorUser: {
              select: { id: true, username: true, email: true }
            },
            followUpUser: {
              select: { id: true, username: true, email: true }
            }
          },
          orderBy: { auditDate: 'desc' }
        }
      }
    });

    if (!compliance) {
      return res.status(404).json({ error: 'Facility compliance record not found' });
    }

    res.json(compliance);
  } catch (error) {
    console.error('Error fetching facility compliance:', error);
    res.status(500).json({ error: 'Failed to fetch facility compliance' });
  }
};

// Create facility compliance record
const createFacilityCompliance = async (req, res) => {
  try {
    const {
      facilityId,
      complianceType,
      name,
      description,
      regulatoryBody,
      requirements,
      frequency,
      nextCheckDate,
      responsiblePerson,
      isRequired = true
    } = req.body;

    const compliance = await prisma.facilityCompliance.create({
      data: {
        facilityId,
        complianceType,
        name,
        description,
        regulatoryBody,
        requirements,
        frequency,
        nextCheckDate: new Date(nextCheckDate),
        responsiblePerson,
        isRequired
      },
      include: {
        facility: {
          select: { id: true, name: true }
        },
        responsible: {
          select: { id: true, username: true, email: true }
        }
      }
    });

    res.status(201).json(compliance);
  } catch (error) {
    console.error('Error creating facility compliance:', error);
    res.status(500).json({ error: 'Failed to create facility compliance' });
  }
};

// Update facility compliance record
const updateFacilityCompliance = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.nextCheckDate) {
      updateData.nextCheckDate = new Date(updateData.nextCheckDate);
    }
    if (updateData.lastCheckDate) {
      updateData.lastCheckDate = new Date(updateData.lastCheckDate);
    }

    const compliance = await prisma.facilityCompliance.update({
      where: { id },
      data: updateData,
      include: {
        facility: {
          select: { id: true, name: true }
        },
        responsible: {
          select: { id: true, username: true, email: true }
        }
      }
    });

    res.json(compliance);
  } catch (error) {
    console.error('Error updating facility compliance:', error);
    res.status(500).json({ error: 'Failed to update facility compliance' });
  }
};

// Delete facility compliance record
const deleteFacilityCompliance = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.facilityCompliance.delete({
      where: { id }
    });

    res.json({ message: 'Facility compliance record deleted successfully' });
  } catch (error) {
    console.error('Error deleting facility compliance:', error);
    res.status(500).json({ error: 'Failed to delete facility compliance' });
  }
};

// =============================================
// COMPLIANCE AUDIT OPERATIONS
// =============================================

// Get compliance audits
const getComplianceAudits = async (req, res) => {
  try {
    const {
      facilityId,
      complianceId,
      auditType,
      passed,
      page = 1,
      limit = 20,
      sortBy = 'auditDate',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    
    if (facilityId && facilityId !== 'all') where.facilityId = facilityId;
    if (complianceId && complianceId !== 'all') where.complianceId = complianceId;
    if (auditType && auditType !== 'all') where.auditType = auditType;
    if (passed !== undefined) where.passed = passed === 'true';

    const [audits, totalCount] = await Promise.all([
      prisma.complianceAudit.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          facility: {
            select: { id: true, name: true }
          },
          compliance: {
            select: { id: true, name: true, complianceType: true }
          },
          auditorUser: {
            select: { id: true, username: true, email: true }
          },
          followUpUser: {
            select: { id: true, username: true, email: true }
          }
        }
      }),
      prisma.complianceAudit.count({ where })
    ]);

    res.json({
      audits,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / take),
        totalCount,
        hasNext: skip + take < totalCount,
        hasPrev: skip > 0
      }
    });
  } catch (error) {
    console.error('Error fetching compliance audits:', error);
    res.status(500).json({ error: 'Failed to fetch compliance audits' });
  }
};

// Create compliance audit
const createComplianceAudit = async (req, res) => {
  try {
    const {
      facilityId,
      complianceId,
      auditDate,
      auditType = 'INTERNAL',
      auditor,
      overallScore,
      passed = false,
      findings,
      criticalIssues = 0,
      majorIssues = 0,
      minorIssues = 0,
      correctiveActions,
      followUpDate,
      followUpBy
    } = req.body;

    const audit = await prisma.complianceAudit.create({
      data: {
        facilityId,
        complianceId,
        auditDate: new Date(auditDate),
        auditType,
        auditor,
        overallScore,
        passed,
        findings,
        criticalIssues,
        majorIssues,
        minorIssues,
        correctiveActions,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        followUpBy
      },
      include: {
        facility: {
          select: { id: true, name: true }
        },
        compliance: {
          select: { id: true, name: true, complianceType: true }
        },
        auditorUser: {
          select: { id: true, username: true, email: true }
        }
      }
    });

    // Update compliance status based on audit results
    await prisma.facilityCompliance.update({
      where: { id: complianceId },
      data: {
        status: passed ? 'COMPLIANT' : 'NON_COMPLIANT',
        complianceLevel: overallScore >= 90 ? 'FULL' : overallScore >= 70 ? 'PARTIAL' : 'NON_COMPLIANT',
        lastCheckDate: new Date(auditDate)
      }
    });

    res.status(201).json(audit);
  } catch (error) {
    console.error('Error creating compliance audit:', error);
    res.status(500).json({ error: 'Failed to create compliance audit' });
  }
};

// =============================================
// SAFETY INCIDENT OPERATIONS
// =============================================

// Get safety incidents
const getSafetyIncidents = async (req, res) => {
  try {
    const {
      facilityId,
      incidentType,
      severity,
      status,
      page = 1,
      limit = 20,
      sortBy = 'incidentDate',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    
    if (facilityId && facilityId !== 'all') where.facilityId = facilityId;
    if (incidentType && incidentType !== 'all') where.incidentType = incidentType;
    if (severity && severity !== 'all') where.severity = severity;
    if (status && status !== 'all') where.status = status;

    const [incidents, totalCount] = await Promise.all([
      prisma.safetyIncident.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          facility: {
            select: { id: true, name: true }
          },
          area: {
            select: { id: true, name: true, areaType: true }
          },
          reporter: {
            select: { id: true, username: true, email: true }
          },
          investigator: {
            select: { id: true, username: true, email: true }
          }
        }
      }),
      prisma.safetyIncident.count({ where })
    ]);

    res.json({
      incidents,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / take),
        totalCount,
        hasNext: skip + take < totalCount,
        hasPrev: skip > 0
      }
    });
  } catch (error) {
    console.error('Error fetching safety incidents:', error);
    res.status(500).json({ error: 'Failed to fetch safety incidents' });
  }
};

// Create safety incident
const createSafetyIncident = async (req, res) => {
  try {
    const {
      facilityId,
      areaId,
      incidentType,
      severity = 'LOW',
      title,
      description,
      incidentDate,
      incidentTime,
      location,
      involvedPersons = [],
      witnesses = [],
      injuryType,
      bodyPartAffected,
      medicalAttention = false,
      lostTime = false
    } = req.body;

    const reportedBy = req.user?.id;

    const incident = await prisma.safetyIncident.create({
      data: {
        facilityId,
        areaId,
        incidentType,
        severity,
        title,
        description,
        incidentDate: new Date(incidentDate),
        incidentTime,
        location,
        reportedBy,
        involvedPersons,
        witnesses,
        injuryType,
        bodyPartAffected,
        medicalAttention,
        lostTime
      },
      include: {
        facility: {
          select: { id: true, name: true }
        },
        area: {
          select: { id: true, name: true, areaType: true }
        },
        reporter: {
          select: { id: true, username: true, email: true }
        }
      }
    });

    res.status(201).json(incident);
  } catch (error) {
    console.error('Error creating safety incident:', error);
    res.status(500).json({ error: 'Failed to create safety incident' });
  }
};

// =============================================
// ENVIRONMENTAL MONITORING OPERATIONS
// =============================================

// Get environmental monitoring records
const getEnvironmentalMonitoring = async (req, res) => {
  try {
    const {
      facilityId,
      monitoringType,
      alertLevel,
      page = 1,
      limit = 50,
      sortBy = 'readingDate',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    
    if (facilityId && facilityId !== 'all') where.facilityId = facilityId;
    if (monitoringType && monitoringType !== 'all') where.monitoringType = monitoringType;
    if (alertLevel && alertLevel !== 'all') where.alertLevel = alertLevel;

    const [records, totalCount] = await Promise.all([
      prisma.environmentalMonitoring.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          facility: {
            select: { id: true, name: true }
          },
          area: {
            select: { id: true, name: true, areaType: true }
          },
          recorder: {
            select: { id: true, username: true, email: true }
          }
        }
      }),
      prisma.environmentalMonitoring.count({ where })
    ]);

    res.json({
      records,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / take),
        totalCount,
        hasNext: skip + take < totalCount,
        hasPrev: skip > 0
      }
    });
  } catch (error) {
    console.error('Error fetching environmental monitoring:', error);
    res.status(500).json({ error: 'Failed to fetch environmental monitoring' });
  }
};

// Create environmental monitoring record
const createEnvironmentalMonitoring = async (req, res) => {
  try {
    const {
      facilityId,
      areaId,
      monitoringType,
      parameter,
      value,
      unit,
      readingDate,
      minThreshold,
      maxThreshold,
      alertMessage
    } = req.body;

    const recordedBy = req.user?.id;

    // Determine if reading is within limits
    let isWithinLimits = true;
    let alertLevel = 'NORMAL';

    if (minThreshold !== undefined && value < minThreshold) {
      isWithinLimits = false;
      alertLevel = 'WARNING';
    }
    if (maxThreshold !== undefined && value > maxThreshold) {
      isWithinLimits = false;
      alertLevel = value > maxThreshold * 1.2 ? 'CRITICAL' : 'WARNING';
    }

    const record = await prisma.environmentalMonitoring.create({
      data: {
        facilityId,
        areaId,
        monitoringType,
        parameter,
        value,
        unit,
        readingDate: new Date(readingDate),
        minThreshold,
        maxThreshold,
        isWithinLimits,
        alertLevel,
        alertMessage,
        recordedBy
      },
      include: {
        facility: {
          select: { id: true, name: true }
        },
        area: {
          select: { id: true, name: true, areaType: true }
        },
        recorder: {
          select: { id: true, username: true, email: true }
        }
      }
    });

    res.status(201).json(record);
  } catch (error) {
    console.error('Error creating environmental monitoring record:', error);
    res.status(500).json({ error: 'Failed to create environmental monitoring record' });
  }
};

// =============================================
// ANALYTICS & DASHBOARD
// =============================================

// Get facility maintenance and compliance analytics
const getFacilityMaintenanceAnalytics = async (req, res) => {
  try {
    console.log('Analytics request received:', req.query);
    const { facilityId, period = '30' } = req.query;
    
    const whereClause = facilityId && facilityId !== 'all' ? { facilityId } : {};
    const dateFilter = {
      gte: new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000)
    };

    const [
      totalMaintenanceLogs,
      maintenanceByStatus,
      maintenanceByType,
      maintenanceByPriority,
      completedMaintenance,
      totalMaintenanceCost,
      averageCostPerJob,
      complianceByStatus,
      complianceByType,
      overdueCompliance,
      recentSafetyIncidents,
      incidentsBySeverity,
      incidentsByType,
      environmentalAlerts,
      environmentalByType,
      costTrends,
      upcomingMaintenance,
      facilities
    ] = await Promise.all([
      // Total maintenance logs
      prisma.facilityMaintenanceLog.count({ where: whereClause }),
      
      // Maintenance by status
      prisma.facilityMaintenanceLog.groupBy({
        by: ['status'],
        where: whereClause,
        _count: { status: true }
      }),
      
      // Maintenance by type
      prisma.facilityMaintenanceLog.groupBy({
        by: ['maintenanceType'],
        where: whereClause,
        _count: { maintenanceType: true }
      }),
      
      // Maintenance by priority
      prisma.facilityMaintenanceLog.groupBy({
        by: ['priority'],
        where: whereClause,
        _count: { priority: true }
      }),
      
      // Completed maintenance in period
      prisma.facilityMaintenanceLog.count({
        where: {
          ...whereClause,
          status: 'COMPLETED',
          completedDate: dateFilter
        }
      }),
      
      // Total maintenance cost
      prisma.facilityMaintenanceLog.aggregate({
        where: {
          ...whereClause,
          status: 'COMPLETED',
          completedDate: dateFilter
        },
        _sum: { actualCost: true },
        _avg: { actualCost: true }
      }),
      
      // Average cost per job
      prisma.facilityMaintenanceLog.aggregate({
        where: {
          ...whereClause,
          status: 'COMPLETED'
        },
        _avg: { actualCost: true }
      }),
      
      // Compliance by status
      prisma.facilityCompliance.groupBy({
        by: ['status'],
        where: whereClause,
        _count: { status: true }
      }),
      
      // Compliance by type
      prisma.facilityCompliance.groupBy({
        by: ['complianceType'],
        where: whereClause,
        _count: { complianceType: true }
      }),
      
      // Overdue compliance
      prisma.facilityCompliance.count({
        where: {
          ...whereClause,
          nextCheckDate: { lt: new Date() },
          status: { notIn: ['COMPLIANT'] }
        }
      }),
      
      // Recent safety incidents
      prisma.safetyIncident.count({
        where: {
          ...whereClause,
          incidentDate: dateFilter
        }
      }),
      
      // Incidents by severity
      prisma.safetyIncident.groupBy({
        by: ['severity'],
        where: {
          ...whereClause,
          incidentDate: dateFilter
        },
        _count: { severity: true }
      }),
      
      // Incidents by type
      prisma.safetyIncident.groupBy({
        by: ['incidentType'],
        where: {
          ...whereClause,
          incidentDate: dateFilter
        },
        _count: { incidentType: true }
      }),
      
      // Environmental alerts
      prisma.environmentalMonitoring.count({
        where: {
          ...whereClause,
          alertLevel: { in: ['WARNING', 'CRITICAL', 'EMERGENCY'] },
          readingDate: dateFilter
        }
      }),
      
      // Environmental monitoring by type
      prisma.environmentalMonitoring.groupBy({
        by: ['monitoringType', 'alertLevel'],
        where: {
          ...whereClause,
          readingDate: dateFilter
        },
        _count: { monitoringType: true }
      }),
      
      // Cost trends (simplified - get recent completed maintenance)
      prisma.facilityMaintenanceLog.findMany({
        where: {
          ...whereClause,
          status: 'COMPLETED',
          completedDate: {
            gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) // Last 6 months
          }
        },
        select: {
          completedDate: true,
          actualCost: true
        },
        orderBy: { completedDate: 'desc' },
        take: 50
      }),
      
      // Upcoming maintenance
      prisma.facilityMaintenanceLog.findMany({
        where: {
          ...whereClause,
          status: 'SCHEDULED',
          scheduledDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Next 30 days
          }
        },
        include: {
          facility: { select: { name: true } },
          area: { select: { name: true } }
        },
        orderBy: { scheduledDate: 'asc' },
        take: 10
      }),
      
      // Facilities for filtering
      prisma.facility.findMany({
        select: { id: true, name: true }
      })
    ]);

    // Calculate KPIs
    const mttr = totalMaintenanceLogs > 0 ? 72 : 0; // Mock MTTR calculation
    const mtbf = totalMaintenanceLogs > 0 ? 720 : 0; // Mock MTBF calculation
    const maintenanceEfficiency = completedMaintenance > 0 ? ((completedMaintenance / totalMaintenanceLogs) * 100) : 0;
    const complianceRate = complianceByStatus.length > 0 ? 
      ((complianceByStatus.find(s => s.status === 'COMPLIANT')?._count?.status || 0) / 
       complianceByStatus.reduce((sum, s) => sum + s._count.status, 0) * 100) : 0;

    const responseData = {
      kpis: {
        totalMaintenanceLogs,
        completedInPeriod: completedMaintenance,
        totalCost: totalMaintenanceCost._sum.actualCost || 0,
        averageCostPerJob: averageCostPerJob._avg.actualCost || 0,
        mttr, // Mean Time To Repair (hours)
        mtbf, // Mean Time Between Failures (hours)
        maintenanceEfficiency: Math.round(maintenanceEfficiency),
        complianceRate: Math.round(complianceRate),
        overdueCompliance,
        recentSafetyIncidents,
        environmentalAlerts
      },
      maintenance: {
        totalLogs: totalMaintenanceLogs,
        byStatus: maintenanceByStatus.map(item => ({
          status: item.status,
          count: item._count.status
        })),
        byType: maintenanceByType.map(item => ({
          type: item.maintenanceType,
          count: item._count.maintenanceType
        })),
        byPriority: maintenanceByPriority.map(item => ({
          priority: item.priority,
          count: item._count.priority
        })),
        completedInPeriod: completedMaintenance,
        totalCost: totalMaintenanceCost._sum.actualCost || 0,
        costTrends: costTrends.slice(0, 6).map((trend, index) => ({
          month: trend.completedDate,
          totalCost: parseFloat(trend.actualCost || 0),
          jobCount: 1
        })),
        upcomingMaintenance: upcomingMaintenance.map(maintenance => ({
          id: maintenance.id,
          title: maintenance.title,
          facility: maintenance.facility.name,
          area: maintenance.area?.name,
          scheduledDate: maintenance.scheduledDate,
          priority: maintenance.priority,
          estimatedCost: maintenance.estimatedCost
        }))
      },
      compliance: {
        byStatus: complianceByStatus.map(item => ({
          status: item.status,
          count: item._count.status
        })),
        byType: complianceByType.map(item => ({
          type: item.complianceType,
          count: item._count.complianceType
        })),
        overdueCount: overdueCompliance,
        complianceRate: Math.round(complianceRate)
      },
      safety: {
        recentIncidents: recentSafetyIncidents,
        incidentsBySeverity: incidentsBySeverity.map(item => ({
          severity: item.severity,
          count: item._count.severity
        })),
        incidentsByType: incidentsByType.map(item => ({
          type: item.incidentType,
          count: item._count.incidentType
        }))
      },
      environmental: {
        alertsCount: environmentalAlerts,
        byTypeAndLevel: environmentalByType.map(item => ({
          type: item.monitoringType,
          alertLevel: item.alertLevel,
          count: item._count.monitoringType
        }))
      },
      facilities: facilities.map(f => ({
        id: f.id,
        name: f.name
      }))
    };

    console.log('Sending analytics response:', JSON.stringify(responseData, null, 2));
    res.json(responseData);
  } catch (error) {
    console.error('Error fetching facility maintenance analytics:', error);
    res.status(500).json({ error: 'Failed to fetch facility maintenance analytics' });
  }
};

module.exports = {
  // Facility Maintenance
  getFacilityMaintenanceLogs,
  getFacilityMaintenanceLogById,
  createFacilityMaintenanceLog,
  updateFacilityMaintenanceLog,
  completeFacilityMaintenanceLog,
  deleteFacilityMaintenanceLog,
  
  // Facility Compliance
  getFacilityCompliance,
  getFacilityComplianceById,
  createFacilityCompliance,
  updateFacilityCompliance,
  deleteFacilityCompliance,
  
  // Compliance Audits
  getComplianceAudits,
  createComplianceAudit,
  
  // Safety Incidents
  getSafetyIncidents,
  createSafetyIncident,
  
  // Environmental Monitoring
  getEnvironmentalMonitoring,
  createEnvironmentalMonitoring,
  
  // Analytics
  getFacilityMaintenanceAnalytics
}; 