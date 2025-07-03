const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all maintenance schedules
const getMaintenanceSchedules = async (req, res) => {
  try {
    const {
      assetId,
      warehouseId,
      maintenanceType,
      priority,
      isActive,
      page = 1,
      limit = 20,
      sortBy = 'nextMaintenanceDate',
      sortOrder = 'asc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    
    if (assetId) where.assetId = assetId;
    if (maintenanceType && maintenanceType !== 'all') where.maintenanceType = maintenanceType;
    if (priority && priority !== 'all') where.priority = priority;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    
    if (warehouseId && warehouseId !== 'all') {
      where.asset = { warehouseId };
    }

    const [schedules, totalCount] = await Promise.all([
      prisma.maintenanceSchedule.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          asset: {
            select: {
              id: true,
              assetNumber: true,
              name: true,
              category: true,
              status: true,
              warehouse: {
                select: { id: true, name: true }
              }
            }
          },
          workOrders: {
            where: { status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] } },
            select: {
              id: true,
              workOrderNumber: true,
              status: true,
              priority: true,
              dueDate: true
            }
          }
        }
      }),
      prisma.maintenanceSchedule.count({ where })
    ]);

    res.json({
      schedules,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / take),
        totalCount,
        hasNext: skip + take < totalCount,
        hasPrev: skip > 0
      }
    });
  } catch (error) {
    console.error('Error fetching maintenance schedules:', error);
    res.status(500).json({ error: 'Failed to fetch maintenance schedules' });
  }
};

// Get maintenance schedule by ID
const getMaintenanceScheduleById = async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await prisma.maintenanceSchedule.findUnique({
      where: { id },
      include: {
        asset: {
          include: {
            warehouse: true,
            location: true
          }
        },
        workOrders: {
          include: {
            assignedUser: {
              select: { id: true, username: true, email: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Maintenance schedule not found' });
    }

    res.json(schedule);
  } catch (error) {
    console.error('Error fetching maintenance schedule:', error);
    res.status(500).json({ error: 'Failed to fetch maintenance schedule' });
  }
};

// Create maintenance schedule
const createMaintenanceSchedule = async (req, res) => {
  try {
    const {
      assetId,
      name,
      description,
      maintenanceType,
      frequency,
      intervalDays,
      intervalHours,
      intervalMiles,
      nextMaintenanceDate,
      priority = 'MEDIUM',
      estimatedDuration,
      estimatedCost,
      instructions,
      requiredSkills,
      requiredTools,
      safetyNotes
    } = req.body;

    const schedule = await prisma.maintenanceSchedule.create({
      data: {
        assetId,
        name,
        description,
        maintenanceType,
        frequency,
        intervalDays,
        intervalHours,
        intervalMiles,
        nextMaintenanceDate: new Date(nextMaintenanceDate),
        priority,
        estimatedDuration,
        estimatedCost,
        instructions,
        requiredSkills: requiredSkills || [],
        requiredTools: requiredTools || [],
        safetyNotes
      },
      include: {
        asset: {
          select: {
            id: true,
            assetNumber: true,
            name: true,
            category: true
          }
        }
      }
    });

    res.status(201).json(schedule);
  } catch (error) {
    console.error('Error creating maintenance schedule:', error);
    res.status(500).json({ error: 'Failed to create maintenance schedule' });
  }
};

// Update maintenance schedule
const updateMaintenanceSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.nextMaintenanceDate) {
      updateData.nextMaintenanceDate = new Date(updateData.nextMaintenanceDate);
    }
    if (updateData.lastMaintenanceDate) {
      updateData.lastMaintenanceDate = new Date(updateData.lastMaintenanceDate);
    }

    const schedule = await prisma.maintenanceSchedule.update({
      where: { id },
      data: updateData,
      include: {
        asset: {
          select: {
            id: true,
            assetNumber: true,
            name: true,
            category: true
          }
        }
      }
    });

    res.json(schedule);
  } catch (error) {
    console.error('Error updating maintenance schedule:', error);
    res.status(500).json({ error: 'Failed to update maintenance schedule' });
  }
};

// Delete maintenance schedule
const deleteMaintenanceSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.maintenanceSchedule.delete({
      where: { id }
    });

    res.json({ message: 'Maintenance schedule deleted successfully' });
  } catch (error) {
    console.error('Error deleting maintenance schedule:', error);
    res.status(500).json({ error: 'Failed to delete maintenance schedule' });
  }
};

// Get all work orders
const getWorkOrders = async (req, res) => {
  try {
    const {
      assetId,
      warehouseId,
      status,
      priority,
      workType,
      assignedTo,
      dueSoon,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    
    if (assetId) where.assetId = assetId;
    if (status && status !== 'all') where.status = status;
    if (priority && priority !== 'all') where.priority = priority;
    if (workType && workType !== 'all') where.workType = workType;
    if (assignedTo && assignedTo !== 'all') where.assignedTo = assignedTo;
    
    if (warehouseId && warehouseId !== 'all') {
      where.asset = { warehouseId };
    }
    
    if (dueSoon === 'true') {
      where.dueDate = {
        lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };
    }

    const [workOrders, totalCount] = await Promise.all([
      prisma.workOrder.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          asset: {
            select: {
              id: true,
              assetNumber: true,
              name: true,
              category: true,
              warehouse: {
                select: { id: true, name: true }
              }
            }
          },
          assignedUser: {
            select: { id: true, username: true, email: true }
          },
          reporter: {
            select: { id: true, username: true, email: true }
          },
          schedule: {
            select: { id: true, name: true, maintenanceType: true }
          },
          partsUsed: true
        }
      }),
      prisma.workOrder.count({ where })
    ]);

    res.json({
      workOrders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / take),
        totalCount,
        hasNext: skip + take < totalCount,
        hasPrev: skip > 0
      }
    });
  } catch (error) {
    console.error('Error fetching work orders:', error);
    res.status(500).json({ error: 'Failed to fetch work orders' });
  }
};

// Get work order by ID
const getWorkOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const workOrder = await prisma.workOrder.findUnique({
      where: { id },
      include: {
        asset: {
          include: {
            warehouse: true,
            location: true
          }
        },
        schedule: true,
        assignedUser: {
          select: { id: true, username: true, email: true, role: true }
        },
        reporter: {
          select: { id: true, username: true, email: true, role: true }
        },
        partsUsed: true,
        maintenanceLog: {
          include: {
            performedByUser: {
              select: { id: true, username: true, email: true }
            }
          }
        }
      }
    });

    if (!workOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    res.json(workOrder);
  } catch (error) {
    console.error('Error fetching work order:', error);
    res.status(500).json({ error: 'Failed to fetch work order' });
  }
};

// Create work order
const createWorkOrder = async (req, res) => {
  try {
    const {
      assetId,
      scheduleId,
      title,
      description,
      workType,
      priority = 'MEDIUM',
      assignedTo,
      assignedTeam,
      scheduledDate,
      dueDate,
      estimatedCost,
      expectedDowntime
    } = req.body;

    const workOrderNumber = `WO-${Date.now()}`;
    const reportedBy = req.user?.id;

    const workOrder = await prisma.workOrder.create({
      data: {
        workOrderNumber,
        assetId,
        scheduleId,
        title,
        description,
        workType,
        priority,
        assignedTo,
        assignedTeam,
        reportedBy,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        estimatedCost,
        expectedDowntime
      },
      include: {
        asset: {
          select: {
            id: true,
            assetNumber: true,
            name: true,
            category: true
          }
        },
        assignedUser: {
          select: { id: true, username: true, email: true }
        }
      }
    });

    res.status(201).json(workOrder);
  } catch (error) {
    console.error('Error creating work order:', error);
    res.status(500).json({ error: 'Failed to create work order' });
  }
};

// Update work order
const updateWorkOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Convert date strings to Date objects
    if (updateData.scheduledDate) {
      updateData.scheduledDate = new Date(updateData.scheduledDate);
    }
    if (updateData.dueDate) {
      updateData.dueDate = new Date(updateData.dueDate);
    }
    if (updateData.startedAt) {
      updateData.startedAt = new Date(updateData.startedAt);
    }
    if (updateData.completedAt) {
      updateData.completedAt = new Date(updateData.completedAt);
    }

    const workOrder = await prisma.workOrder.update({
      where: { id },
      data: updateData,
      include: {
        asset: {
          select: {
            id: true,
            assetNumber: true,
            name: true,
            category: true
          }
        },
        assignedUser: {
          select: { id: true, username: true, email: true }
        }
      }
    });

    res.json(workOrder);
  } catch (error) {
    console.error('Error updating work order:', error);
    res.status(500).json({ error: 'Failed to update work order' });
  }
};

// Complete work order
const completeWorkOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      completionNotes,
      failureAnalysis,
      recommendedActions,
      actualCost,
      laborHours,
      actualDowntime,
      partsUsed,
      assetCondition,
      nextServiceDate
    } = req.body;

    const performedBy = req.user?.id;
    const completedAt = new Date();

    const workOrder = await prisma.workOrder.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt,
        completionNotes,
        failureAnalysis,
        recommendedActions,
        actualCost,
        laborHours,
        actualDowntime
      },
      include: {
        asset: true,
        schedule: true
      }
    });

    if (partsUsed && partsUsed.length > 0) {
      await prisma.workOrderPart.createMany({
        data: partsUsed.map(part => ({
          workOrderId: id,
          ...part
        }))
      });
    }

    await prisma.maintenanceLog.create({
      data: {
        assetId: workOrder.assetId,
        workOrderId: id,
        maintenanceDate: completedAt,
        maintenanceType: workOrder.workType.includes('PREVENTIVE') ? 'PREVENTIVE' : 'CORRECTIVE',
        description: workOrder.title,
        performedBy,
        durationMinutes: laborHours ? laborHours * 60 : null,
        downtime: actualDowntime,
        totalCost: actualCost,
        condition: assetCondition,
        nextServiceDate: nextServiceDate ? new Date(nextServiceDate) : null,
        notes: completionNotes
      }
    });

    if (assetCondition) {
      await prisma.asset.update({
        where: { id: workOrder.assetId },
        data: { condition: assetCondition }
      });
    }

    res.json({ message: 'Work order completed successfully', workOrder });
  } catch (error) {
    console.error('Error completing work order:', error);
    res.status(500).json({ error: 'Failed to complete work order' });
  }
};

// Get maintenance analytics
const getMaintenanceAnalytics = async (req, res) => {
  try {
    const { warehouseId, period = '30' } = req.query;
    
    const whereClause = warehouseId && warehouseId !== 'all' ? { asset: { warehouseId } } : {};
    const dateFilter = {
      gte: new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000)
    };

    const [
      totalWorkOrders,
      workOrdersByStatus,
      workOrdersByType,
      workOrdersByPriority,
      completedWorkOrders,
      averageCompletionTime,
      totalMaintenanceCost,
      upcomingMaintenance,
      overdueMaintenance
    ] = await Promise.all([
      // Total work orders
      prisma.workOrder.count({ where: whereClause }),
      
      // Work orders by status
      prisma.workOrder.groupBy({
        by: ['status'],
        where: whereClause,
        _count: { status: true }
      }),
      
      // Work orders by type
      prisma.workOrder.groupBy({
        by: ['workType'],
        where: whereClause,
        _count: { workType: true }
      }),
      
      // Work orders by priority
      prisma.workOrder.groupBy({
        by: ['priority'],
        where: whereClause,
        _count: { priority: true }
      }),
      
      // Completed work orders in period
      prisma.workOrder.count({
        where: {
          ...whereClause,
          status: 'COMPLETED',
          completedAt: dateFilter
        }
      }),
      
      // Average completion time
      prisma.workOrder.aggregate({
        where: {
          ...whereClause,
          status: 'COMPLETED',
          completedAt: dateFilter,
          startedAt: { not: null }
        },
        _avg: { laborHours: true }
      }),
      
      // Total maintenance cost
      prisma.workOrder.aggregate({
        where: {
          ...whereClause,
          completedAt: dateFilter
        },
        _sum: { actualCost: true }
      }),
      
      // Upcoming maintenance (next 30 days)
      prisma.maintenanceSchedule.count({
        where: {
          ...whereClause,
          isActive: true,
          nextMaintenanceDate: {
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Overdue maintenance
      prisma.maintenanceSchedule.count({
        where: {
          ...whereClause,
          isActive: true,
          nextMaintenanceDate: {
            lt: new Date()
          }
        }
      })
    ]);

    res.json({
      totalWorkOrders,
      workOrdersByStatus: workOrdersByStatus.map(item => ({
        status: item.status,
        count: item._count.status
      })),
      workOrdersByType: workOrdersByType.map(item => ({
        type: item.workType,
        count: item._count.workType
      })),
      workOrdersByPriority: workOrdersByPriority.map(item => ({
        priority: item.priority,
        count: item._count.priority
      })),
      completedWorkOrders,
      averageCompletionTime: averageCompletionTime._avg.laborHours || 0,
      totalMaintenanceCost: totalMaintenanceCost._sum.actualCost || 0,
      upcomingMaintenance,
      overdueMaintenance
    });
  } catch (error) {
    console.error('Error fetching maintenance analytics:', error);
    res.status(500).json({ error: 'Failed to fetch maintenance analytics' });
  }
};

// Helper function to calculate next maintenance date
const calculateNextMaintenanceDate = (schedule, lastDate) => {
  const nextDate = new Date(lastDate);
  
  switch (schedule.frequency) {
    case 'DAILY':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'WEEKLY':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'MONTHLY':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'QUARTERLY':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'SEMI_ANNUALLY':
      nextDate.setMonth(nextDate.getMonth() + 6);
      break;
    case 'ANNUALLY':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    case 'CUSTOM':
      if (schedule.intervalDays) {
        nextDate.setDate(nextDate.getDate() + schedule.intervalDays);
      }
      break;
    default:
      nextDate.setDate(nextDate.getDate() + 30); // Default to 30 days
  }
  
  return nextDate;
};

module.exports = {
  getMaintenanceSchedules,
  getMaintenanceScheduleById,
  createMaintenanceSchedule,
  updateMaintenanceSchedule,
  deleteMaintenanceSchedule,
  getWorkOrders,
  getWorkOrderById,
  createWorkOrder,
  updateWorkOrder,
  completeWorkOrder,
  getMaintenanceAnalytics
}; 