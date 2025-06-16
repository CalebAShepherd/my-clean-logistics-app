const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all put-away tasks for a warehouse with filtering
const getPutAwayTasks = async (req, res) => {
  try {
    const {
      warehouseId,
      status,
      assignedTo,
      priority,
      putAwayMethod,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    if (!warehouseId) {
      return res.status(400).json({ error: 'Warehouse ID is required' });
    }

    const skip = (page - 1) * limit;
    const where = { warehouseId };

    if (status) where.status = status;
    if (assignedTo) where.assignedTo = assignedTo;
    if (priority) where.priority = parseInt(priority);
    if (putAwayMethod) where.putAwayMethod = putAwayMethod;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [tasks, totalCount] = await Promise.all([
      prisma.putAwayTask.findMany({
        where,
        include: {
          receipt: { 
            select: { 
              id: true, 
              receiptNumber: true,
              asn: { select: { id: true, asnNumber: true } }
            } 
          },
          receiptItem: {
            include: {
              inventoryItem: { select: { id: true, name: true, sku: true } }
            }
          },
          warehouse: { select: { id: true, name: true } },
          fromLocation: { select: { id: true, zone: true, aisle: true, shelf: true, bin: true } },
          toLocation: { select: { id: true, zone: true, aisle: true, shelf: true, bin: true } },
          inventoryItem: { select: { id: true, name: true, sku: true, description: true } },
          assignedUser: { select: { id: true, username: true } }
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { [sortBy]: sortOrder }
      }),
      prisma.putAwayTask.count({ where })
    ]);

    res.json({
      tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching put-away tasks:', error);
    res.status(500).json({ error: 'Failed to fetch put-away tasks' });
  }
};

// Get single put-away task by ID
const getPutAwayTaskById = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await prisma.putAwayTask.findUnique({
      where: { id },
      include: {
        receipt: {
          include: {
            asn: { 
              select: { 
                id: true, 
                asnNumber: true,
                supplier: { select: { id: true, name: true } }
              } 
            },
            receiver: { select: { id: true, username: true } }
          }
        },
        receiptItem: {
          include: {
            inventoryItem: { 
              select: { 
                id: true, 
                name: true, 
                sku: true, 
                description: true,
                unit: true
              } 
            }
          }
        },
        warehouse: { select: { id: true, name: true } },
        fromLocation: { select: { id: true, zone: true, aisle: true, shelf: true, bin: true } },
        toLocation: { select: { id: true, zone: true, aisle: true, shelf: true, bin: true } },
        inventoryItem: { select: { id: true, name: true, sku: true, description: true } },
        assignedUser: { select: { id: true, username: true } }
      }
    });

    if (!task) {
      return res.status(404).json({ error: 'Put-away task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error('Error fetching put-away task:', error);
    res.status(500).json({ error: 'Failed to fetch put-away task' });
  }
};

// Assign put-away task to user
const assignPutAwayTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;

    if (!assignedTo) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const task = await prisma.putAwayTask.update({
      where: { id },
      data: {
        assignedTo,
        status: 'ASSIGNED'
      },
      include: {
        assignedUser: { select: { id: true, username: true } },
        inventoryItem: { select: { id: true, name: true, sku: true } }
      }
    });

    res.json(task);
  } catch (error) {
    console.error('Error assigning put-away task:', error);
    res.status(500).json({ error: 'Failed to assign put-away task' });
  }
};

// Start put-away task
const startPutAwayTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { fromLocationId, equipment } = req.body;

    const updates = {
      status: 'IN_PROGRESS',
      startTime: new Date()
    };

    if (fromLocationId) updates.fromLocationId = fromLocationId;
    if (equipment) updates.equipment = equipment;

    const task = await prisma.putAwayTask.update({
      where: { id },
      data: updates,
      include: {
        receiptItem: {
          include: {
            inventoryItem: { select: { id: true, name: true, sku: true } }
          }
        },
        fromLocation: { select: { id: true, zone: true, aisle: true, shelf: true, bin: true } },
        toLocation: { select: { id: true, zone: true, aisle: true, shelf: true, bin: true } },
        assignedUser: { select: { id: true, username: true } }
      }
    });

    res.json(task);
  } catch (error) {
    console.error('Error starting put-away task:', error);
    res.status(500).json({ error: 'Failed to start put-away task' });
  }
};

// Complete put-away task
const completePutAwayTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { toLocationId, actualQuantity, notes } = req.body;

    const task = await prisma.putAwayTask.findUnique({
      where: { id },
      include: {
        receiptItem: {
          include: {
            inventoryItem: true
          }
        }
      }
    });

    if (!task) {
      return res.status(404).json({ error: 'Put-away task not found' });
    }

    if (!toLocationId) {
      return res.status(400).json({ error: 'Destination location is required' });
    }

    // Update task completion
    const updates = {
      status: 'COMPLETED',
      endTime: new Date(),
      toLocationId
    };

    if (notes) updates.notes = notes;

    const updatedTask = await prisma.putAwayTask.update({
      where: { id },
      data: updates,
      include: {
        receiptItem: {
          include: {
            inventoryItem: { select: { id: true, name: true, sku: true } }
          }
        },
        toLocation: { select: { id: true, zone: true, aisle: true, shelf: true, bin: true } },
        assignedUser: { select: { id: true, username: true } }
      }
    });

    // Update or create warehouse item inventory
    const quantityToPutAway = actualQuantity || task.quantity;
    
    const existingWarehouseItem = await prisma.warehouseItem.findUnique({
      where: {
        warehouseId_itemId_locationId: {
          warehouseId: task.warehouseId,
          itemId: task.inventoryItemId,
          locationId: toLocationId
        }
      }
    });

    if (existingWarehouseItem) {
      await prisma.warehouseItem.update({
        where: {
          warehouseId_itemId_locationId: {
            warehouseId: task.warehouseId,
            itemId: task.inventoryItemId,
            locationId: toLocationId
          }
        },
        data: {
          quantity: existingWarehouseItem.quantity + quantityToPutAway
        }
      });
    } else {
      await prisma.warehouseItem.create({
        data: {
          warehouseId: task.warehouseId,
          itemId: task.inventoryItemId,
          locationId: toLocationId,
          quantity: quantityToPutAway
        }
      });
    }

    // Create stock movement record
    await prisma.stockMovement.create({
      data: {
        id: `SM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        warehouseId: task.warehouseId,
        itemId: task.inventoryItemId,
        type: 'INBOUND',
        quantity: quantityToPutAway,
        relatedId: task.id,
        notes: `Put-away completed for task ${task.taskNumber}`
      }
    });

    res.json(updatedTask);
  } catch (error) {
    console.error('Error completing put-away task:', error);
    res.status(500).json({ error: 'Failed to complete put-away task' });
  }
};

// Suggest optimal locations for put-away
const suggestPutAwayLocations = async (req, res) => {
  try {
    const { warehouseId, inventoryItemId, quantity } = req.query;

    if (!warehouseId || !inventoryItemId) {
      return res.status(400).json({ 
        error: 'Warehouse ID and inventory item ID are required' 
      });
    }

    // Get available locations with capacity
    const locations = await prisma.location.findMany({
      where: { warehouseId },
      include: {
        WarehouseItem: {
          where: { itemId: inventoryItemId }
        }
      }
    });

    // Simple location suggestion logic
    // In a real system, this would include more sophisticated algorithms
    const suggestions = locations
      .map(location => {
        const existingItem = location.WarehouseItem[0];
        const currentQuantity = existingItem ? existingItem.quantity : 0;
        
        return {
          locationId: location.id,
          zone: location.zone,
          aisle: location.aisle,
          shelf: location.shelf,
          bin: location.bin,
          currentQuantity,
          availableCapacity: 1000 - currentQuantity, // Mock capacity
          suitabilityScore: existingItem ? 100 : 80 // Prefer existing locations
        };
      })
      .filter(loc => loc.availableCapacity >= (parseInt(quantity) || 0))
      .sort((a, b) => b.suitabilityScore - a.suitabilityScore)
      .slice(0, 5);

    res.json({ suggestions });
  } catch (error) {
    console.error('Error suggesting put-away locations:', error);
    res.status(500).json({ error: 'Failed to suggest put-away locations' });
  }
};

// Get put-away statistics
const getPutAwayStats = async (req, res) => {
  try {
    const { warehouseId } = req.params;
    const { dateFrom, dateTo } = req.query;

    const where = { warehouseId };
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [
      totalTasks,
      statusCounts,
      todayTasks,
      overdueTasks,
      avgCompletionTime,
      userPerformance
    ] = await Promise.all([
      prisma.putAwayTask.count({ where }),
      prisma.putAwayTask.groupBy({
        by: ['status'],
        where,
        _count: { status: true }
      }),
      prisma.putAwayTask.count({
        where: {
          ...where,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999))
          }
        }
      }),
      prisma.putAwayTask.count({
        where: {
          ...where,
          status: { in: ['PENDING', 'ASSIGNED'] },
          createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Older than 24 hours
        }
      }),
      prisma.putAwayTask.aggregate({
        _avg: {
          // This would need a calculated field for completion time
        },
        where: {
          ...where,
          status: 'COMPLETED',
          startTime: { not: null },
          endTime: { not: null }
        }
      }),
      prisma.putAwayTask.groupBy({
        by: ['assignedTo'],
        where: {
          ...where,
          assignedTo: { not: null }
        },
        _count: { assignedTo: true }
      })
    ]);

    const stats = {
      totalTasks,
      statusBreakdown: statusCounts.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {}),
      todayTasks,
      overdueTasks,
      userPerformance: userPerformance.reduce((acc, item) => {
        acc[item.assignedTo] = item._count.assignedTo;
        return acc;
      }, {})
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching put-away statistics:', error);
    res.status(500).json({ error: 'Failed to fetch put-away statistics' });
  }
};

// Cancel put-away task
const cancelPutAwayTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const task = await prisma.putAwayTask.findUnique({
      where: { id }
    });

    if (!task) {
      return res.status(404).json({ error: 'Put-away task not found' });
    }

    if (task.status === 'COMPLETED') {
      return res.status(400).json({ 
        error: 'Cannot cancel completed put-away task' 
      });
    }

    const updatedTask = await prisma.putAwayTask.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        notes: task.notes ? `${task.notes}\n\nCancelled: ${reason}` : `Cancelled: ${reason}`
      }
    });

    res.json(updatedTask);
  } catch (error) {
    console.error('Error cancelling put-away task:', error);
    res.status(500).json({ error: 'Failed to cancel put-away task' });
  }
};

// Batch assign put-away tasks
const batchAssignPutAwayTasks = async (req, res) => {
  try {
    const { taskIds, assignedTo } = req.body;

    if (!taskIds || !Array.isArray(taskIds) || !assignedTo) {
      return res.status(400).json({ 
        error: 'Task IDs array and assigned user are required' 
      });
    }

    const updatedTasks = await prisma.putAwayTask.updateMany({
      where: {
        id: { in: taskIds },
        status: 'PENDING'
      },
      data: {
        assignedTo,
        status: 'ASSIGNED'
      }
    });

    res.json({ 
      message: `${updatedTasks.count} tasks assigned successfully`,
      assignedCount: updatedTasks.count
    });
  } catch (error) {
    console.error('Error batch assigning put-away tasks:', error);
    res.status(500).json({ error: 'Failed to batch assign put-away tasks' });
  }
};

module.exports = {
  getPutAwayTasks,
  getPutAwayTaskById,
  assignPutAwayTask,
  startPutAwayTask,
  completePutAwayTask,
  suggestPutAwayLocations,
  getPutAwayStats,
  cancelPutAwayTask,
  batchAssignPutAwayTasks
}; 