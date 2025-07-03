const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all cycle counts for a warehouse
const getCycleCounts = async (req, res) => {
  try {
    const { warehouseId } = req.params;
    const { status, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const skip = (page - 1) * limit;
    const orderBy = { [sortBy]: sortOrder };

    const where = {
      warehouseId,
      ...(status && { status })
    };

    const [cycleCounts, totalCount] = await Promise.all([
      prisma.cycleCount.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy,
        include: {
          warehouse: { select: { name: true } },
          createdBy: { select: { id: true, username: true, email: true } },
          assignedTo: { select: { id: true, username: true, email: true } },
          tasks: {
            include: {
              _count: { select: { items: true } },
              assignedTo: { select: { id: true, username: true } }
            }
          },
          _count: { select: { tasks: true } }
        }
      }),
      prisma.cycleCount.count({ where })
    ]);

    res.json({
      cycleCounts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching cycle counts:', error);
    res.status(500).json({ error: 'Failed to fetch cycle counts' });
  }
};

// Get a specific cycle count with detailed information
const getCycleCountById = async (req, res) => {
  try {
    const { id } = req.params;

    const cycleCount = await prisma.cycleCount.findUnique({
      where: { id },
      include: {
        warehouse: { select: { id: true, name: true, address: true } },
        createdBy: { select: { id: true, username: true, email: true } },
        assignedTo: { select: { id: true, username: true, email: true } },
        tasks: {
          include: {
            location: {
              select: { id: true, zone: true, aisle: true, shelf: true, bin: true }
            },
            assignedTo: { select: { id: true, username: true, email: true } },
            items: {
              include: {
                item: { select: { id: true, sku: true, name: true, unit: true } },
                location: { select: { zone: true, aisle: true, shelf: true, bin: true } },
                countedBy: { select: { id: true, username: true } }
              }
            },
            _count: { select: { items: true } }
          }
        }
      }
    });

    if (!cycleCount) {
      return res.status(404).json({ error: 'Cycle count not found' });
    }

    // Calculate summary statistics
    const summary = {
      totalTasks: cycleCount.tasks.length,
      completedTasks: cycleCount.tasks.filter(task => task.status === 'COMPLETED').length,
      totalItems: cycleCount.tasks.reduce((sum, task) => sum + task.items.length, 0),
      countedItems: cycleCount.tasks.reduce((sum, task) => 
        sum + task.items.filter(item => item.status === 'COUNTED' || item.status === 'APPROVED').length, 0
      ),
      varianceItems: cycleCount.tasks.reduce((sum, task) => 
        sum + task.items.filter(item => item.variance !== 0 && item.variance !== null).length, 0
      ),
      accuracy: 0
    };

    if (summary.countedItems > 0) {
      const accurateItems = cycleCount.tasks.reduce((sum, task) => 
        sum + task.items.filter(item => item.variance === 0).length, 0
      );
      summary.accuracy = Math.round((accurateItems / summary.countedItems) * 100);
    }

    res.json({ ...cycleCount, summary });
  } catch (error) {
    console.error('Error fetching cycle count:', error);
    res.status(500).json({ error: 'Failed to fetch cycle count' });
  }
};

// Create a new cycle count
const createCycleCount = async (req, res) => {
  try {
    const {
      name,
      description,
      warehouseId,
      countType,
      frequency,
      scheduledDate,
      assignedToId,
      settings
    } = req.body;

    const createdById = req.user.id;

    // Validate warehouse exists
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId }
    });

    if (!warehouse) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }

    // Create the cycle count
    const cycleCount = await prisma.cycleCount.create({
      data: {
        name,
        description,
        warehouseId,
        countType,
        frequency,
        scheduledDate: new Date(scheduledDate),
        createdById,
        assignedToId,
        settings,
        nextCountDate: calculateNextCountDate(frequency, new Date(scheduledDate))
      },
      include: {
        warehouse: { select: { name: true } },
        createdBy: { select: { id: true, username: true, email: true } },
        assignedTo: { select: { id: true, username: true, email: true } }
      }
    });

    res.status(201).json(cycleCount);
  } catch (error) {
    console.error('Error creating cycle count:', error);
    res.status(500).json({ error: 'Failed to create cycle count' });
  }
};

// Generate cycle count tasks based on count type and settings
const generateTasks = async (req, res) => {
  try {
    const { id } = req.params;
    const { locationFilters, itemFilters, taskCount = 10 } = req.body;

    const cycleCount = await prisma.cycleCount.findUnique({
      where: { id },
      include: { warehouse: true }
    });

    if (!cycleCount) {
      return res.status(404).json({ error: 'Cycle count not found' });
    }

    if (cycleCount.status !== 'SCHEDULED') {
      return res.status(400).json({ error: 'Can only generate tasks for scheduled cycle counts' });
    }

    // Get items to count based on count type
    const itemsToCount = await getItemsForCounting(
      cycleCount.warehouseId,
      cycleCount.countType,
      { locationFilters, itemFilters, taskCount }
    );

    // Group items by location to create tasks
    const locationGroups = {};
    itemsToCount.forEach(item => {
      const locationKey = item.locationId;
      if (!locationGroups[locationKey]) {
        locationGroups[locationKey] = {
          locationId: item.locationId,
          zone: item.location.zone,
          items: []
        };
      }
      locationGroups[locationKey].items.push(item);
    });

    // Create tasks and items
    const tasks = [];
    for (const [locationKey, group] of Object.entries(locationGroups)) {
      const task = await prisma.cycleCountTask.create({
        data: {
          cycleCountId: id,
          locationId: group.locationId,
          zone: group.zone,
          items: {
            create: group.items.map(item => ({
              itemId: item.itemId,
              locationId: item.locationId,
              expectedQty: item.quantity
            }))
          }
        },
        include: {
          location: { select: { zone: true, aisle: true, shelf: true, bin: true } },
          items: {
            include: {
              item: { select: { sku: true, name: true, unit: true } }
            }
          }
        }
      });
      tasks.push(task);
    }

    // Update cycle count status
    await prisma.cycleCount.update({
      where: { id },
      data: { status: 'IN_PROGRESS' }
    });

    res.json({ 
      message: 'Tasks generated successfully',
      tasksCreated: tasks.length,
      itemsToCount: itemsToCount.length,
      tasks
    });
  } catch (error) {
    console.error('Error generating tasks:', error);
    res.status(500).json({ error: 'Failed to generate tasks' });
  }
};

// Get warehouse workers for task assignment
const getWarehouseWorkers = async (req, res) => {
  try {
    const { warehouseId } = req.params;

    const workers = await prisma.user.findMany({
      where: {
        role: 'warehouse_worker',
        warehouseId: warehouseId
      },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true
      },
      orderBy: {
        username: 'asc'
      }
    });

    res.json(workers);
  } catch (error) {
    console.error('Error fetching warehouse workers:', error);
    res.status(500).json({ error: 'Failed to fetch warehouse workers' });
  }
};

// Enhanced assign tasks to support bulk assignment
const assignTasks = async (req, res) => {
  try {
    const { cycleCountId } = req.params;
    const { assignments } = req.body; // [{ taskId, assignedToId }] or [{ taskIds: [], assignedToId }]

    // Flatten task assignments for bulk operations
    const taskAssignments = [];
    for (const assignment of assignments) {
      if (assignment.taskIds && Array.isArray(assignment.taskIds)) {
        // Bulk assignment - multiple tasks to one user
        assignment.taskIds.forEach(taskId => {
          taskAssignments.push({
            taskId,
            assignedToId: assignment.assignedToId
          });
        });
      } else if (assignment.taskId) {
        // Single task assignment
        taskAssignments.push({
          taskId: assignment.taskId,
          assignedToId: assignment.assignedToId
        });
      }
    }

    // Validate all tasks belong to the cycle count
    const taskIds = taskAssignments.map(a => a.taskId);
    const validTasks = await prisma.cycleCountTask.findMany({
      where: {
        id: { in: taskIds },
        cycleCountId
      },
      select: { id: true }
    });

    if (validTasks.length !== taskIds.length) {
      return res.status(400).json({ error: 'Some tasks do not belong to this cycle count' });
    }

    // Update task assignments
    const updatePromises = taskAssignments.map(assignment =>
      prisma.cycleCountTask.update({
        where: { id: assignment.taskId },
        data: { 
          assignedToId: assignment.assignedToId,
          status: assignment.assignedToId ? 'ASSIGNED' : 'PENDING'
        },
        include: {
          assignedTo: { select: { id: true, username: true } },
          location: { select: { zone: true, aisle: true, shelf: true, bin: true } }
        }
      })
    );

    const updatedTasks = await Promise.all(updatePromises);

    res.json({ 
      message: 'Tasks assigned successfully',
      assignedCount: taskAssignments.length,
      tasks: updatedTasks
    });
  } catch (error) {
    console.error('Error assigning tasks:', error);
    res.status(500).json({ error: 'Failed to assign tasks' });
  }
};

// Get individual task details
const getTaskById = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await prisma.cycleCountTask.findUnique({
      where: { id: taskId },
      include: {
        cycleCount: {
          select: { 
            id: true, 
            name: true, 
            description: true,
            warehouse: { select: { id: true, name: true } }
          }
        },
        location: {
          select: { id: true, zone: true, aisle: true, shelf: true, bin: true }
        },
        assignedTo: { 
          select: { id: true, username: true, email: true } 
        },
        items: {
          include: {
            item: { 
              select: { id: true, sku: true, name: true, unit: true } 
            },
            location: { 
              select: { zone: true, aisle: true, shelf: true, bin: true } 
            },
            countedBy: { 
              select: { id: true, username: true } 
            }
          },
          orderBy: { item: { sku: 'asc' } }
        }
      }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Calculate task statistics
    const stats = {
      totalItems: task.items.length,
      countedItems: task.items.filter(item => 
        item.status === 'COUNTED' || item.status === 'APPROVED'
      ).length,
      varianceItems: task.items.filter(item => 
        item.variance !== null && item.variance !== 0
      ).length,
      accurateItems: task.items.filter(item => 
        item.variance === 0 && item.status === 'COUNTED'
      ).length
    };

    stats.progress = stats.totalItems > 0 ? 
      Math.round((stats.countedItems / stats.totalItems) * 100) : 0;
    stats.accuracy = stats.countedItems > 0 ? 
      Math.round((stats.accurateItems / stats.countedItems) * 100) : 0;

    res.json({ ...task, stats });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Failed to fetch task details' });
  }
};

// Get tasks for a specific user (mobile interface)
const getMyTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, warehouseId } = req.query;
    
    console.log('🔍 getMyTasks: Request from user:', userId);
    console.log('🔍 getMyTasks: Query params:', { status, warehouseId });

    const where = {
      assignedToId: userId,
      ...(status && { status }),
      ...(warehouseId && { cycleCount: { warehouseId } })
    };
    
    console.log('🔍 getMyTasks: Prisma where clause:', JSON.stringify(where, null, 2));

    const tasks = await prisma.cycleCountTask.findMany({
      where,
      include: {
        cycleCount: { 
          select: { id: true, name: true, warehouse: { select: { name: true } } }
        },
        location: { select: { zone: true, aisle: true, shelf: true, bin: true } },
        items: {
          include: {
            item: { select: { id: true, sku: true, name: true, unit: true } }
          },
          orderBy: { item: { sku: 'asc' } }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log('📊 getMyTasks: Found', tasks.length, 'tasks for user', userId);
    tasks.forEach((task, index) => {
      console.log(`📋 getMyTasks: Task ${index + 1}: ID=${task.id}, Status=${task.status}, CycleCount=${task.cycleCountId}, Items=${task.items.length}`);
    });

    res.json(tasks);
  } catch (error) {
    console.error('❌ getMyTasks: Error fetching user tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

// Start a counting task
const startTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;

    const task = await prisma.cycleCountTask.findUnique({
      where: { id: taskId },
      include: {
        items: {
          include: {
            item: { select: { sku: true, name: true, unit: true } }
          }
        }
      }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.assignedToId !== userId) {
      return res.status(403).json({ error: 'Not authorized to start this task' });
    }

    if (task.status !== 'ASSIGNED' && task.status !== 'PAUSED') {
      return res.status(400).json({ error: 'Task cannot be started' });
    }

    const updatedTask = await prisma.cycleCountTask.update({
      where: { id: taskId },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date()
      },
      include: {
        items: {
          include: {
            item: { select: { sku: true, name: true, unit: true } }
          }
        }
      }
    });

    res.json(updatedTask);
  } catch (error) {
    console.error('Error starting task:', error);
    res.status(500).json({ error: 'Failed to start task' });
  }
};

// Count an item
const countItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { countedQty, notes } = req.body;
    const userId = req.user.id;

    const item = await prisma.cycleCountItem.findUnique({
      where: { id: itemId },
      include: {
        task: { select: { assignedToId: true, status: true } }
      }
    });

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    if (item.task.assignedToId !== userId) {
      return res.status(403).json({ error: 'Not authorized to count this item' });
    }

    if (item.task.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Task is not in progress' });
    }

    const variance = countedQty - item.expectedQty;
    const variancePercent = item.expectedQty > 0 ? 
      Math.round((variance / item.expectedQty) * 100 * 100) / 100 : 0;

    const updatedItem = await prisma.cycleCountItem.update({
      where: { id: itemId },
      data: {
        countedQty: parseInt(countedQty),
        variance,
        variancePercent,
        status: Math.abs(variance) > 0 ? 'VARIANCE_REVIEW' : 'COUNTED',
        notes,
        countedById: userId,
        countedAt: new Date()
      },
      include: {
        item: { select: { sku: true, name: true, unit: true } },
        countedBy: { select: { username: true } }
      }
    });

    // Check if all items in the task are counted
    const taskItems = await prisma.cycleCountItem.findMany({
      where: { taskId: item.taskId }
    });

    const allCounted = taskItems.every(item => 
      item.status === 'COUNTED' || item.status === 'VARIANCE_REVIEW' || item.status === 'APPROVED'
    );

    if (allCounted) {
      // Calculate task accuracy
      const accurateItems = taskItems.filter(item => item.variance === 0).length;
      const accuracyRate = Math.round((accurateItems / taskItems.length) * 100);
      const hasVariances = taskItems.some(item => Math.abs(item.variance || 0) > 0);

      await prisma.cycleCountTask.update({
        where: { id: item.taskId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          accuracyRate,
          varianceFlag: hasVariances
        }
      });
    }

    res.json(updatedItem);
  } catch (error) {
    console.error('Error counting item:', error);
    res.status(500).json({ error: 'Failed to count item' });
  }
};

// Review and approve/reject variance items
const reviewVariance = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { action, reason, adjustInventory = false } = req.body; // action: 'APPROVE' | 'REJECT' | 'RECOUNT'

    const item = await prisma.cycleCountItem.findUnique({
      where: { id: itemId },
      include: {
        item: { select: { id: true, sku: true, name: true } },
        location: { select: { id: true } },
        task: { 
          select: { 
            cycleCount: { select: { warehouseId: true } } 
          } 
        }
      }
    });

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    let status;
    let updateData = { reason };

    switch (action) {
      case 'APPROVE':
        status = 'APPROVED';
        
        // Adjust inventory if requested
        if (adjustInventory && item.variance !== 0) {
          await adjustInventoryQuantity(
            item.task.cycleCount.warehouseId,
            item.itemId,
            item.locationId,
            item.variance,
            `Cycle count adjustment - ${reason || 'Approved variance'}`
          );
        }
        break;
        
      case 'REJECT':
        status = 'REJECTED';
        break;
        
      case 'RECOUNT':
        status = 'PENDING';
        updateData = { 
          countedQty: null, 
          variance: null, 
          variancePercent: null,
          countedById: null,
          countedAt: null,
          notes: null,
          reason 
        };
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    const updatedItem = await prisma.cycleCountItem.update({
      where: { id: itemId },
      data: { status, ...updateData }
    });

    res.json(updatedItem);
  } catch (error) {
    console.error('Error reviewing variance:', error);
    res.status(500).json({ error: 'Failed to review variance' });
  }
};

// Complete a cycle count
const completeCycleCount = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if all tasks are completed
    const pendingTasks = await prisma.cycleCountTask.count({
      where: {
        cycleCountId: id,
        status: { notIn: ['COMPLETED', 'CANCELLED'] }
      }
    });

    if (pendingTasks > 0) {
      return res.status(400).json({ 
        error: `Cannot complete cycle count. ${pendingTasks} tasks are still pending.` 
      });
    }

    const cycleCount = await prisma.cycleCount.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        lastCountDate: new Date()
      },
      include: {
        tasks: {
          include: {
            items: true
          }
        }
      }
    });

    // Calculate overall statistics
    const totalItems = cycleCount.tasks.reduce((sum, task) => sum + task.items.length, 0);
    const accurateItems = cycleCount.tasks.reduce((sum, task) => 
      sum + task.items.filter(item => item.variance === 0).length, 0
    );
    const overallAccuracy = totalItems > 0 ? Math.round((accurateItems / totalItems) * 100) : 0;

    res.json({
      ...cycleCount,
      summary: {
        totalItems,
        accurateItems,
        overallAccuracy,
        completedTasks: cycleCount.tasks.length
      }
    });
  } catch (error) {
    console.error('Error completing cycle count:', error);
    res.status(500).json({ error: 'Failed to complete cycle count' });
  }
};

// Helper function to get items for counting based on count type
const getItemsForCounting = async (warehouseId, countType, options) => {
  const { locationFilters, itemFilters, taskCount } = options;

  let where = {
    warehouseId,
    quantity: { gt: 0 }
  };

  // Apply location filters
  if (locationFilters?.zones?.length) {
    where.Location = {
      zone: { in: locationFilters.zones }
    };
  }

  let orderBy = [];
  let take = parseInt(taskCount) || 10;

  switch (countType) {
    case 'ABC_ANALYSIS':
      // Prioritize high-value items (assuming unitCost * quantity)
      orderBy = [{ quantity: 'desc' }];
      break;
      
    case 'VELOCITY_BASED':
      // This would require movement history - simplified for now
      orderBy = [{ quantity: 'asc' }]; // Items with lower stock first
      break;
      
    case 'LOCATION_BASED':
      orderBy = [
        { Location: { zone: 'asc' } },
        { Location: { aisle: 'asc' } }
      ];
      break;
      
    case 'RANDOM':
    default:
      // Random selection - simplified by using itemId ordering
      orderBy = [{ itemId: 'asc' }];
      break;
  }

  const warehouseItems = await prisma.warehouseItem.findMany({
    where,
    take,
    orderBy,
    include: {
      InventoryItem: { select: { id: true, sku: true, name: true, unit: true } },
      Location: { select: { id: true, zone: true, aisle: true, shelf: true, bin: true } }
    }
  });

  // Transform the data to match what generateTasks expects
  return warehouseItems.map(item => ({
    itemId: item.itemId,
    locationId: item.locationId,
    quantity: item.quantity,
    location: item.Location,
    item: item.InventoryItem
  }));
};

// Helper function to calculate next count date
const calculateNextCountDate = (frequency, scheduledDate) => {
  const date = new Date(scheduledDate);
  
  switch (frequency) {
    case 'DAILY':
      date.setDate(date.getDate() + 1);
      break;
    case 'WEEKLY':
      date.setDate(date.getDate() + 7);
      break;
    case 'MONTHLY':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'QUARTERLY':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'ANNUALLY':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      return null;
  }
  
  return date;
};

// Helper function to adjust inventory quantities
const adjustInventoryQuantity = async (warehouseId, itemId, locationId, adjustmentQty, notes) => {
  // Update warehouse item quantity
  await prisma.warehouseItem.update({
    where: {
      warehouseId_itemId_locationId: {
        warehouseId,
        itemId,
        locationId
      }
    },
    data: {
      quantity: {
        increment: adjustmentQty
      }
    }
  });

  // Create stock movement record
  await prisma.stockMovement.create({
    data: {
      id: `adj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      warehouseId,
      itemId,
      type: 'ADJUSTMENT',
      quantity: adjustmentQty,
      notes,
      timestamp: new Date()
    }
  });
};

// Get cycle count analytics
const getCycleCountAnalytics = async (req, res) => {
  try {
    const { warehouseId } = req.params;
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const where = {
      warehouseId,
      ...(Object.keys(dateFilter).length && { createdAt: dateFilter })
    };

    const [
      totalCounts,
      completedCounts,
      totalItems,
      accurateItems,
      totalVariances,
      recentCounts
    ] = await Promise.all([
      prisma.cycleCount.count({ where }),
      prisma.cycleCount.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.cycleCountItem.count({
        where: { task: { cycleCount: where } }
      }),
      prisma.cycleCountItem.count({
        where: { 
          task: { cycleCount: where },
          variance: 0
        }
      }),
      prisma.cycleCountItem.count({
        where: { 
          task: { cycleCount: where },
          variance: { not: 0 }
        }
      }),
      prisma.cycleCount.findMany({
        where,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { tasks: true } },
          createdBy: { select: { username: true } }
        }
      })
    ]);

    const overallAccuracy = totalItems > 0 ? Math.round((accurateItems / totalItems) * 100) : 0;

    res.json({
      summary: {
        totalCounts,
        completedCounts,
        totalItems,
        accurateItems,
        totalVariances,
        overallAccuracy,
        completionRate: totalCounts > 0 ? Math.round((completedCounts / totalCounts) * 100) : 0
      },
      recentCounts
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

module.exports = {
  getCycleCounts,
  getCycleCountById,
  createCycleCount,
  generateTasks,
  assignTasks,
  getWarehouseWorkers,
  getTaskById,
  getMyTasks,
  startTask,
  countItem,
  reviewVariance,
  completeCycleCount,
  getCycleCountAnalytics
}; 