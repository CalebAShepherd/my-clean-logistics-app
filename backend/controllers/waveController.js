const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Create a new wave
 */
exports.createWave = async (req, res) => {
  try {
    const { 
      warehouseId, 
      priority = 1, 
      plannedStartTime, 
      plannedEndTime,
      notes 
    } = req.body;
    const userId = req.user.id;

    if (!warehouseId) {
      return res.status(400).json({ error: 'Warehouse ID is required' });
    }

    // Generate wave number
    const waveCount = await prisma.wave.count({
      where: { warehouseId }
    });
    const waveNumber = `W${warehouseId.slice(-4).toUpperCase()}-${String(waveCount + 1).padStart(4, '0')}`;

    const wave = await prisma.wave.create({
      data: {
        waveNumber,
        warehouseId,
        priority,
        plannedStartTime: plannedStartTime ? new Date(plannedStartTime) : null,
        plannedEndTime: plannedEndTime ? new Date(plannedEndTime) : null,
        createdBy: userId,
        notes,
      },
      include: {
        warehouse: true,
        creator: { select: { id: true, username: true, email: true } },
        assignedPicker: { select: { id: true, username: true, email: true } },
        waveOrders: {
          include: {
            shipment: true
          }
        }
      }
    });

    res.status(201).json(wave);
  } catch (error) {
    console.error('Error creating wave:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get all waves with filtering and pagination
 */
exports.getWaves = async (req, res) => {
  try {
    const { 
      warehouseId, 
      status, 
      assignedPickerId, 
      page = 1, 
      limit = 10 
    } = req.query;

    const where = {};
    if (warehouseId) where.warehouseId = warehouseId;
    if (status) where.status = status;
    if (assignedPickerId) where.assignedPickerId = assignedPickerId;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [waves, total] = await Promise.all([
      prisma.wave.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          warehouse: { select: { id: true, name: true } },
          creator: { select: { id: true, username: true, email: true } },
          assignedPicker: { select: { id: true, username: true, email: true } },
          waveOrders: {
            include: {
              shipment: { select: { id: true, reference: true, status: true } }
            }
          },
          pickLists: { select: { id: true, status: true } }
        }
      }),
      prisma.wave.count({ where })
    ]);

    res.json({
      waves,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching waves:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get a specific wave by ID
 */
exports.getWave = async (req, res) => {
  try {
    const { id } = req.params;

    const wave = await prisma.wave.findUnique({
      where: { id },
      include: {
        warehouse: true,
        creator: { select: { id: true, username: true, email: true } },
        assignedPicker: { select: { id: true, username: true, email: true } },
        waveOrders: {
          include: {
            shipment: {
              include: {
                client: { select: { id: true, username: true, email: true } }
              }
            }
          },
          orderBy: { priority: 'asc' }
        },
        pickLists: {
          include: {
            assignedPicker: { select: { id: true, username: true, email: true } },
            pickTasks: { select: { id: true, status: true } }
          }
        }
      }
    });

    if (!wave) {
      return res.status(404).json({ error: 'Wave not found' });
    }

    res.json(wave);
  } catch (error) {
    console.error('Error fetching wave:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Add orders/shipments to a wave
 */
exports.addOrdersToWave = async (req, res) => {
  try {
    const { id } = req.params;
    const { shipmentIds, priorities = {} } = req.body;

    if (!Array.isArray(shipmentIds) || shipmentIds.length === 0) {
      return res.status(400).json({ error: 'Shipment IDs array is required' });
    }

    // Check if wave exists and is in valid status
    const wave = await prisma.wave.findUnique({
      where: { id },
      include: { waveOrders: true }
    });

    if (!wave) {
      return res.status(404).json({ error: 'Wave not found' });
    }

    if (wave.status !== 'CREATED' && wave.status !== 'PLANNED') {
      return res.status(400).json({ error: 'Cannot add orders to wave in current status' });
    }

    // Check for duplicate shipments
    const existingShipments = wave.waveOrders.map(wo => wo.shipmentId);
    const duplicates = shipmentIds.filter(id => existingShipments.includes(id));
    
    if (duplicates.length > 0) {
      return res.status(400).json({ 
        error: 'Some shipments are already in this wave',
        duplicates 
      });
    }

    // Verify shipments exist and are eligible
    const shipments = await prisma.shipment.findMany({
      where: {
        id: { in: shipmentIds },
        warehouseId: wave.warehouseId,
        status: { in: ['CREATED', 'ASSIGNED'] }
      }
    });

    if (shipments.length !== shipmentIds.length) {
      return res.status(400).json({ error: 'Some shipments are not eligible for picking' });
    }

    // Create wave order entries
    const waveOrderData = shipmentIds.map(shipmentId => ({
      waveId: id,
      shipmentId,
      priority: priorities[shipmentId] || 1
    }));

    await prisma.waveOrder.createMany({
      data: waveOrderData
    });

    // Update wave totals
    const updatedWave = await prisma.wave.update({
      where: { id },
      data: {
        totalOrders: wave.totalOrders + shipmentIds.length,
        status: 'PLANNED' // Automatically move to planned when orders are added
      },
      include: {
        warehouse: { select: { id: true, name: true } },
        creator: { select: { id: true, username: true, email: true } },
        waveOrders: {
          include: {
            shipment: { select: { id: true, reference: true, status: true } }
          }
        }
      }
    });

    res.json(updatedWave);
  } catch (error) {
    console.error('Error adding orders to wave:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Release wave for picking (creates pick lists)
 */
exports.releaseWave = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      pickingMethod = 'BATCH', 
      assignedPickerId,
      zones = [] 
    } = req.body;

    const wave = await prisma.wave.findUnique({
      where: { id },
      include: {
        waveOrders: {
          include: {
            shipment: {
              include: {
                pickTasks: true // Check if already has pick tasks
              }
            }
          }
        }
      }
    });

    if (!wave) {
      return res.status(404).json({ error: 'Wave not found' });
    }

    if (wave.status !== 'PLANNED') {
      return res.status(400).json({ error: 'Wave must be in PLANNED status to release' });
    }

    if (wave.waveOrders.length === 0) {
      return res.status(400).json({ error: 'Wave has no orders to pick' });
    }

    // Generate pick list number
    const pickListCount = await prisma.pickList.count({
      where: { warehouseId: wave.warehouseId }
    });
    const listNumber = `PL${wave.warehouseId.slice(-4).toUpperCase()}-${String(pickListCount + 1).padStart(4, '0')}`;

    // Create pick list
    const pickList = await prisma.pickList.create({
      data: {
        listNumber,
        waveId: id,
        warehouseId: wave.warehouseId,
        assignedPickerId,
        pickingMethod,
        zone: zones.length > 0 ? zones[0] : null,
        status: 'PENDING'
      }
    });

    // Create pick tasks for each item in each shipment
    const pickTasks = [];
    let taskSequence = 1;

    for (const waveOrder of wave.waveOrders) {
      const shipment = waveOrder.shipment;
      
      // For now, create a simple pick task based on shipment quantity
      // In a real system, you'd break this down by actual inventory items and locations
      const warehouseItems = await prisma.warehouseItem.findMany({
        where: { warehouseId: wave.warehouseId },
        include: { 
          inventoryItem: true,
          location: true 
        },
        take: 5 // Simplified - just pick first few items
      });

      for (const warehouseItem of warehouseItems) {
        if (warehouseItem.quantity > 0) {
          pickTasks.push({
            pickListId: pickList.id,
            shipmentId: shipment.id,
            inventoryItemId: warehouseItem.inventoryItem.id,
            locationId: warehouseItem.locationId,
            quantityRequired: Math.min(shipment.quantity, warehouseItem.quantity, 1),
            pickSequence: taskSequence++,
            status: 'PENDING'
          });
        }
      }
    }

    if (pickTasks.length > 0) {
      await prisma.pickTask.createMany({
        data: pickTasks
      });

      // Update pick list with task count
      await prisma.pickList.update({
        where: { id: pickList.id },
        data: { totalTasks: pickTasks.length }
      });
    }

    // Update wave status
    const updatedWave = await prisma.wave.update({
      where: { id },
      data: {
        status: 'RELEASED',
        actualStartTime: new Date(),
        totalItems: pickTasks.length
      },
      include: {
        warehouse: { select: { id: true, name: true } },
        creator: { select: { id: true, username: true, email: true } },
        assignedPicker: { select: { id: true, username: true, email: true } },
        pickLists: {
          include: {
            assignedPicker: { select: { id: true, username: true, email: true } },
            pickTasks: true
          }
        }
      }
    });

    res.json(updatedWave);
  } catch (error) {
    console.error('Error releasing wave:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Assign picker to wave
 */
exports.assignPicker = async (req, res) => {
  try {
    const { id } = req.params;
    const { pickerId } = req.body;

    if (!pickerId) {
      return res.status(400).json({ error: 'Picker ID is required' });
    }

    // Verify picker exists and has appropriate role
    const picker = await prisma.user.findUnique({
      where: { id: pickerId },
      select: { id: true, username: true, role: true }
    });

    if (!picker) {
      return res.status(404).json({ error: 'Picker not found' });
    }

    const updatedWave = await prisma.wave.update({
      where: { id },
      data: { assignedPickerId: pickerId },
      include: {
        warehouse: { select: { id: true, name: true } },
        creator: { select: { id: true, username: true, email: true } },
        assignedPicker: { select: { id: true, username: true, email: true } },
        waveOrders: {
          include: {
            shipment: { select: { id: true, reference: true, status: true } }
          }
        }
      }
    });

    res.json(updatedWave);
  } catch (error) {
    console.error('Error assigning picker to wave:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update wave status
 */
exports.updateWaveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['CREATED', 'PLANNED', 'RELEASED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updateData = { status };
    if (notes) updateData.notes = notes;
    
    if (status === 'IN_PROGRESS' && !await prisma.wave.findFirst({ where: { id, actualStartTime: { not: null } } })) {
      updateData.actualStartTime = new Date();
    }
    
    if (status === 'COMPLETED') {
      updateData.actualEndTime = new Date();
    }

    const updatedWave = await prisma.wave.update({
      where: { id },
      data: updateData,
      include: {
        warehouse: { select: { id: true, name: true } },
        creator: { select: { id: true, username: true, email: true } },
        assignedPicker: { select: { id: true, username: true, email: true } },
        waveOrders: {
          include: {
            shipment: { select: { id: true, reference: true, status: true } }
          }
        },
        pickLists: {
          include: {
            assignedPicker: { select: { id: true, username: true, email: true } },
            pickTasks: { select: { id: true, status: true } }
          }
        }
      }
    });

    res.json(updatedWave);
  } catch (error) {
    console.error('Error updating wave status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete a wave (only if not started)
 */
exports.deleteWave = async (req, res) => {
  try {
    const { id } = req.params;

    const wave = await prisma.wave.findUnique({
      where: { id },
      select: { status: true }
    });

    if (!wave) {
      return res.status(404).json({ error: 'Wave not found' });
    }

    if (wave.status !== 'CREATED' && wave.status !== 'PLANNED') {
      return res.status(400).json({ error: 'Cannot delete wave that has been started' });
    }

    await prisma.wave.delete({
      where: { id }
    });

    res.json({ message: 'Wave deleted successfully' });
  } catch (error) {
    console.error('Error deleting wave:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get wave statistics/summary
 */
exports.getWaveStats = async (req, res) => {
  try {
    const { warehouseId } = req.query;

    const where = warehouseId ? { warehouseId } : {};

    const stats = await prisma.wave.groupBy({
      by: ['status'],
      where,
      _count: { status: true }
    });

    const totalStats = await prisma.wave.aggregate({
      where,
      _count: { id: true },
      _avg: { 
        totalOrders: true,
        totalItems: true,
        completedItems: true 
      }
    });

    const recentActivity = await prisma.wave.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        waveNumber: true,
        status: true,
        totalOrders: true,
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
        totalWaves: totalStats._count.id,
        avgOrdersPerWave: totalStats._avg.totalOrders,
        avgItemsPerWave: totalStats._avg.totalItems,
        avgCompletionRate: totalStats._avg.completedItems && totalStats._avg.totalItems 
          ? (totalStats._avg.completedItems / totalStats._avg.totalItems) * 100 
          : 0
      },
      recentActivity
    });
  } catch (error) {
    console.error('Error fetching wave stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 