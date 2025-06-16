const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get all pick lists with filtering and pagination
 */
exports.getPickLists = async (req, res) => {
  try {
    const { 
      warehouseId, 
      status, 
      assignedPickerId, 
      waveId,
      page = 1, 
      limit = 10 
    } = req.query;

    const where = {};
    if (warehouseId) where.warehouseId = warehouseId;
    if (status) where.status = status;
    if (assignedPickerId) where.assignedPickerId = assignedPickerId;
    if (waveId) where.waveId = waveId;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [pickLists, total] = await Promise.all([
      prisma.pickList.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          wave: { 
            select: { 
              id: true, 
              waveNumber: true, 
              status: true,
              totalOrders: true 
            } 
          },
          warehouse: { select: { id: true, name: true } },
          assignedPicker: { select: { id: true, username: true, email: true } },
          pickTasks: {
            select: { 
              id: true, 
              status: true, 
              quantityRequired: true, 
              quantityPicked: true 
            }
          }
        }
      }),
      prisma.pickList.count({ where })
    ]);

    res.json({
      pickLists,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching pick lists:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get a specific pick list by ID
 */
exports.getPickList = async (req, res) => {
  try {
    const { id } = req.params;

    const pickList = await prisma.pickList.findUnique({
      where: { id },
      include: {
        wave: {
          include: {
            warehouse: { select: { id: true, name: true } },
            creator: { select: { id: true, username: true, email: true } }
          }
        },
        warehouse: true,
        assignedPicker: { select: { id: true, username: true, email: true } },
        pickTasks: {
          include: {
            shipment: { 
              select: { 
                id: true, 
                reference: true, 
                clientId: true,
                client: { select: { username: true, email: true } }
              } 
            },
            inventoryItem: true,
            location: true,
            picker: { select: { id: true, username: true } },
            verifier: { select: { id: true, username: true } }
          },
          orderBy: { pickSequence: 'asc' }
        }
      }
    });

    if (!pickList) {
      return res.status(404).json({ error: 'Pick list not found' });
    }

    res.json(pickList);
  } catch (error) {
    console.error('Error fetching pick list:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Assign picker to pick list
 */
exports.assignPicker = async (req, res) => {
  try {
    const { id } = req.params;
    const { pickerId } = req.body;

    if (!pickerId) {
      return res.status(400).json({ error: 'Picker ID is required' });
    }

    // Verify picker exists
    const picker = await prisma.user.findUnique({
      where: { id: pickerId },
      select: { id: true, username: true, role: true }
    });

    if (!picker) {
      return res.status(404).json({ error: 'Picker not found' });
    }

    const updatedPickList = await prisma.pickList.update({
      where: { id },
      data: { 
        assignedPickerId: pickerId,
        status: 'ASSIGNED'
      },
      include: {
        wave: { select: { id: true, waveNumber: true } },
        assignedPicker: { select: { id: true, username: true, email: true } },
        pickTasks: { select: { id: true, status: true } }
      }
    });

    res.json(updatedPickList);
  } catch (error) {
    console.error('Error assigning picker:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Start picking a pick list
 */
exports.startPicking = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const pickList = await prisma.pickList.findUnique({
      where: { id },
      select: { status: true, assignedPickerId: true }
    });

    if (!pickList) {
      return res.status(404).json({ error: 'Pick list not found' });
    }

    if (pickList.status !== 'ASSIGNED' && pickList.status !== 'PENDING') {
      return res.status(400).json({ error: 'Pick list cannot be started in current status' });
    }

    // If no picker assigned, assign current user
    const assignedPickerId = pickList.assignedPickerId || userId;

    const updatedPickList = await prisma.pickList.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        assignedPickerId,
        actualStartTime: new Date()
      },
      include: {
        wave: { select: { id: true, waveNumber: true } },
        assignedPicker: { select: { id: true, username: true, email: true } },
        pickTasks: {
          include: {
            inventoryItem: true,
            location: true,
            shipment: { select: { id: true, reference: true } }
          },
          orderBy: { pickSequence: 'asc' }
        }
      }
    });

    res.json(updatedPickList);
  } catch (error) {
    console.error('Error starting picking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Complete a pick task
 */
exports.completePickTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { 
      quantityPicked, 
      notes, 
      barcodeScanned = false,
      damageQuantity = 0,
      substitutionId 
    } = req.body;
    const userId = req.user.id;

    if (quantityPicked === undefined || quantityPicked < 0) {
      return res.status(400).json({ error: 'Valid quantity picked is required' });
    }

    const pickTask = await prisma.pickTask.findUnique({
      where: { id: taskId },
      include: { 
        pickList: true,
        inventoryItem: true 
      }
    });

    if (!pickTask) {
      return res.status(404).json({ error: 'Pick task not found' });
    }

    if (pickTask.status !== 'PENDING' && pickTask.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Pick task cannot be completed in current status' });
    }

    // Validate picked quantity
    if (quantityPicked > pickTask.quantityRequired) {
      return res.status(400).json({ 
        error: 'Picked quantity cannot exceed required quantity' 
      });
    }

    // Update pick task
    const updateData = {
      quantityPicked,
      damageQuantity,
      notes,
      barcodeScanned,
      pickerId: userId,
      pickedAt: new Date(),
      status: quantityPicked === pickTask.quantityRequired ? 'PICKED' : 'COMPLETED'
    };

    if (substitutionId) {
      updateData.substitutionId = substitutionId;
    }

    const updatedTask = await prisma.pickTask.update({
      where: { id: taskId },
      data: updateData,
      include: {
        pickList: true,
        inventoryItem: true,
        location: true,
        picker: { select: { id: true, username: true } },
        substitution: true
      }
    });

    // Update warehouse inventory
    if (quantityPicked > 0) {
      await prisma.warehouseItem.updateMany({
        where: {
          warehouseId: pickTask.pickList.warehouseId,
          itemId: pickTask.inventoryItemId,
          locationId: pickTask.locationId
        },
        data: {
          quantity: { decrement: quantityPicked }
        }
      });
    }

    // Check if pick list is complete
    const pickListTasks = await prisma.pickTask.findMany({
      where: { pickListId: pickTask.pickListId },
      select: { status: true }
    });

    const completedTasks = pickListTasks.filter(
      task => task.status === 'PICKED' || task.status === 'COMPLETED'
    ).length;

    if (completedTasks === pickListTasks.length) {
      await prisma.pickList.update({
        where: { id: pickTask.pickListId },
        data: {
          status: 'PICKING_COMPLETE',
          completedTasks,
          actualEndTime: new Date()
        }
      });
    } else {
      await prisma.pickList.update({
        where: { id: pickTask.pickListId },
        data: { completedTasks }
      });
    }

    res.json(updatedTask);
  } catch (error) {
    console.error('Error completing pick task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get next pick task for a picker
 */
exports.getNextPickTask = async (req, res) => {
  try {
    const { pickListId } = req.params;
    const userId = req.user.id;

    const nextTask = await prisma.pickTask.findFirst({
      where: {
        pickListId,
        status: 'PENDING',
        OR: [
          { pickerId: null },
          { pickerId: userId }
        ]
      },
      include: {
        inventoryItem: true,
        location: true,
        shipment: { 
          select: { 
            id: true, 
            reference: true,
            client: { select: { username: true } }
          } 
        }
      },
      orderBy: { pickSequence: 'asc' }
    });

    if (!nextTask) {
      return res.status(404).json({ error: 'No pending pick tasks found' });
    }

    // Mark task as in progress and assign to current user
    const updatedTask = await prisma.pickTask.update({
      where: { id: nextTask.id },
      data: {
        status: 'IN_PROGRESS',
        pickerId: userId
      },
      include: {
        inventoryItem: true,
        location: true,
        shipment: { 
          select: { 
            id: true, 
            reference: true,
            client: { select: { username: true } }
          } 
        }
      }
    });

    res.json(updatedTask);
  } catch (error) {
    console.error('Error getting next pick task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Quality control check for pick list
 */
exports.performQC = async (req, res) => {
  try {
    const { id } = req.params;
    const { qcPassed, qcNotes, taskQCResults = {} } = req.body;
    const userId = req.user.id;

    const pickList = await prisma.pickList.findUnique({
      where: { id },
      include: { pickTasks: true }
    });

    if (!pickList) {
      return res.status(404).json({ error: 'Pick list not found' });
    }

    if (pickList.status !== 'PICKING_COMPLETE') {
      return res.status(400).json({ error: 'Pick list must be picking complete for QC' });
    }

    // Update individual task QC results
    const qcPromises = Object.entries(taskQCResults).map(([taskId, result]) => {
      return prisma.pickTask.update({
        where: { id: taskId },
        data: {
          qcPassed: result.passed,
          qcNotes: result.notes,
          verifiedBy: userId,
          verifiedAt: new Date(),
          status: result.passed ? 'QC_PASSED' : 'QC_FAILED'
        }
      });
    });

    await Promise.all(qcPromises);

    // Update pick list status
    const updatedPickList = await prisma.pickList.update({
      where: { id },
      data: {
        status: qcPassed ? 'QC_COMPLETE' : 'QC_PENDING'
      },
      include: {
        wave: { select: { id: true, waveNumber: true } },
        assignedPicker: { select: { id: true, username: true } },
        pickTasks: {
          include: {
            inventoryItem: true,
            location: true,
            verifier: { select: { id: true, username: true } }
          }
        }
      }
    });

    res.json(updatedPickList);
  } catch (error) {
    console.error('Error performing QC:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Generate optimized pick route
 */
exports.optimizePickRoute = async (req, res) => {
  try {
    const { id } = req.params;

    const pickList = await prisma.pickList.findUnique({
      where: { id },
      include: {
        pickTasks: {
          include: {
            location: true,
            inventoryItem: true
          }
        }
      }
    });

    if (!pickList) {
      return res.status(404).json({ error: 'Pick list not found' });
    }

    // Simple optimization: sort by zone, aisle, shelf, bin
    const optimizedTasks = pickList.pickTasks.sort((a, b) => {
      const locA = a.location;
      const locB = b.location;
      
      // Sort by zone first
      if (locA.zone !== locB.zone) {
        return (locA.zone || '').localeCompare(locB.zone || '');
      }
      
      // Then by aisle
      if (locA.aisle !== locB.aisle) {
        return (locA.aisle || '').localeCompare(locB.aisle || '');
      }
      
      // Then by shelf
      if (locA.shelf !== locB.shelf) {
        return (locA.shelf || '').localeCompare(locB.shelf || '');
      }
      
      // Finally by bin
      return (locA.bin || '').localeCompare(locB.bin || '');
    });

    // Update pick sequence
    const updatePromises = optimizedTasks.map((task, index) => {
      return prisma.pickTask.update({
        where: { id: task.id },
        data: { pickSequence: index + 1 }
      });
    });

    await Promise.all(updatePromises);

    // Store optimized route in pick list
    const routeData = optimizedTasks.map((task, index) => ({
      taskId: task.id,
      sequence: index + 1,
      location: {
        zone: task.location.zone,
        aisle: task.location.aisle,
        shelf: task.location.shelf,
        bin: task.location.bin
      }
    }));

    const updatedPickList = await prisma.pickList.update({
      where: { id },
      data: {
        optimizedRoute: routeData
      },
      include: {
        pickTasks: {
          include: {
            location: true,
            inventoryItem: true
          },
          orderBy: { pickSequence: 'asc' }
        }
      }
    });

    res.json(updatedPickList);
  } catch (error) {
    console.error('Error optimizing pick route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get pick list statistics
 */
exports.getPickListStats = async (req, res) => {
  try {
    const { warehouseId } = req.query;

    const where = warehouseId ? { warehouseId } : {};

    const stats = await prisma.pickList.groupBy({
      by: ['status'],
      where,
      _count: { status: true }
    });

    const totalStats = await prisma.pickList.aggregate({
      where,
      _count: { id: true },
      _avg: { 
        totalTasks: true,
        completedTasks: true
      }
    });

    const recentActivity = await prisma.pickList.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        listNumber: true,
        status: true,
        totalTasks: true,
        completedTasks: true,
        updatedAt: true,
        assignedPicker: { select: { username: true } }
      }
    });

    res.json({
      statusBreakdown: stats.reduce((acc, stat) => {
        acc[stat.status] = stat._count.status;
        return acc;
      }, {}),
      totals: {
        totalPickLists: totalStats._count.id,
        avgTasksPerList: totalStats._avg.totalTasks,
        avgCompletionRate: totalStats._avg.completedTasks && totalStats._avg.totalTasks 
          ? (totalStats._avg.completedTasks / totalStats._avg.totalTasks) * 100 
          : 0
      },
      recentActivity
    });
  } catch (error) {
    console.error('Error fetching pick list stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 