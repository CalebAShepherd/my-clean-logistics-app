const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all cross-dock tasks for a warehouse
const getCrossDockTasks = async (req, res) => {
  try {
    console.log('getCrossDockTasks: Request received');
    console.log('getCrossDockTasks: Query params:', req.query);
    console.log('getCrossDockTasks: User:', req.user);
    
    const { 
      warehouseId, 
      status, 
      priority,
      assignedTo,
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    if (!warehouseId) {
      console.log('getCrossDockTasks: Missing warehouseId');
      return res.status(400).json({ error: 'Warehouse ID is required' });
    }

    const skip = (page - 1) * limit;
    const where = { warehouseId };

    if (status) where.status = status;
    if (priority) where.priority = parseInt(priority);
    if (assignedTo) where.assignedTo = assignedTo;

    const [tasks, totalCount] = await Promise.all([
      prisma.crossDockTask.findMany({
        where,
        include: {
          warehouse: { select: { id: true, name: true } },
          inventoryItem: { select: { id: true, name: true, sku: true } },
          inboundShipment: { 
            select: { 
              id: true, 
              trackingNumber: true,
              origin: true
            } 
          },
          outboundShipment: { 
            select: { 
              id: true, 
              trackingNumber: true,
              destination: true
            } 
          },
          assignedUser: { select: { id: true, username: true, email: true } },
          asn: { 
            select: { 
              id: true, 
              asnNumber: true,
              supplier: { select: { name: true } }
            } 
          }
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { [sortBy]: sortOrder }
      }),
      prisma.crossDockTask.count({ where })
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
    console.error('Error fetching cross-dock tasks:', error);
    res.status(500).json({ error: 'Failed to fetch cross-dock tasks' });
  }
};

// Get single cross-dock task by ID
const getCrossDockTaskById = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await prisma.crossDockTask.findUnique({
      where: { id },
      include: {
        warehouse: { select: { id: true, name: true } },
        inventoryItem: { 
          select: { 
            id: true, 
            name: true, 
            sku: true, 
            description: true,
            weight: true,
            dimensions: true
          } 
        },
        inboundShipment: { 
          include: {
            origin: true,
            carrier: { select: { name: true } }
          }
        },
        outboundShipment: { 
          include: {
            destination: true,
            carrier: { select: { name: true } }
          }
        },
        assignedUser: { select: { id: true, username: true, email: true } },
        asn: { 
          include: {
            supplier: { select: { id: true, name: true, contactInfo: true } }
          }
        }
      }
    });

    if (!task) {
      return res.status(404).json({ error: 'Cross-dock task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error('Error fetching cross-dock task:', error);
    res.status(500).json({ error: 'Failed to fetch cross-dock task' });
  }
};

// Create new cross-dock task
const createCrossDockTask = async (req, res) => {
  try {
    const {
      asnId,
      inboundShipmentId,
      outboundShipmentId,
      warehouseId,
      inventoryItemId,
      quantity,
      priority = 1,
      stagingLocation,
      notes
    } = req.body;

    if (!warehouseId || !inventoryItemId || !quantity || !outboundShipmentId) {
      return res.status(400).json({ 
        error: 'Warehouse ID, inventory item ID, quantity, and outbound shipment ID are required' 
      });
    }

    // Generate task number
    const taskCount = await prisma.crossDockTask.count({
      where: { warehouseId }
    });
    const taskNumber = `CD-${Date.now()}-${taskCount + 1}`;

    const task = await prisma.crossDockTask.create({
      data: {
        taskNumber,
        asnId,
        inboundShipmentId,
        outboundShipmentId,
        warehouseId,
        inventoryItemId,
        quantity: parseInt(quantity),
        priority: parseInt(priority),
        stagingLocation,
        notes
      },
      include: {
        warehouse: { select: { id: true, name: true } },
        inventoryItem: { select: { id: true, name: true, sku: true } },
        inboundShipment: { select: { id: true, trackingNumber: true } },
        outboundShipment: { select: { id: true, trackingNumber: true } },
        asn: { select: { id: true, asnNumber: true } }
      }
    });

    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating cross-dock task:', error);
    res.status(500).json({ error: 'Failed to create cross-dock task' });
  }
};

// Update cross-dock task
const updateCrossDockTask = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates.taskNumber;
    delete updates.createdAt;
    delete updates.updatedAt;

    if (updates.quantity) {
      updates.quantity = parseInt(updates.quantity);
    }
    if (updates.priority) {
      updates.priority = parseInt(updates.priority);
    }

    const task = await prisma.crossDockTask.update({
      where: { id },
      data: updates,
      include: {
        warehouse: { select: { id: true, name: true } },
        inventoryItem: { select: { id: true, name: true, sku: true } },
        inboundShipment: { select: { id: true, trackingNumber: true } },
        outboundShipment: { select: { id: true, trackingNumber: true } },
        assignedUser: { select: { id: true, name: true } }
      }
    });

    res.json(task);
  } catch (error) {
    console.error('Error updating cross-dock task:', error);
    res.status(500).json({ error: 'Failed to update cross-dock task' });
  }
};

// Assign worker to cross-dock task
const assignWorkerToTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { workerId } = req.body;

    if (!workerId) {
      return res.status(400).json({ error: 'Worker ID is required' });
    }

    const task = await prisma.crossDockTask.update({
      where: { id },
      data: {
        assignedTo: workerId,
        status: 'ASSIGNED'
      },
      include: {
        warehouse: { select: { id: true, name: true } },
        inventoryItem: { select: { id: true, name: true, sku: true } },
        assignedUser: { select: { id: true, name: true, email: true } }
      }
    });

    res.json(task);
  } catch (error) {
    console.error('Error assigning worker to task:', error);
    res.status(500).json({ error: 'Failed to assign worker to task' });
  }
};

// Start cross-dock task
const startCrossDockTask = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await prisma.crossDockTask.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        startTime: new Date()
      },
      include: {
        warehouse: { select: { id: true, name: true } },
        inventoryItem: { select: { id: true, name: true, sku: true } },
        assignedUser: { select: { id: true, name: true } }
      }
    });

    res.json(task);
  } catch (error) {
    console.error('Error starting cross-dock task:', error);
    res.status(500).json({ error: 'Failed to start cross-dock task' });
  }
};

// Complete cross-dock task
const completeCrossDockTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { actualQuantity, notes } = req.body;

    const updates = {
      status: 'COMPLETED',
      endTime: new Date()
    };

    if (actualQuantity) {
      updates.actualQuantity = parseInt(actualQuantity);
    }
    if (notes) {
      updates.notes = notes;
    }

    const task = await prisma.crossDockTask.update({
      where: { id },
      data: updates,
      include: {
        warehouse: { select: { id: true, name: true } },
        inventoryItem: { select: { id: true, name: true, sku: true } },
        assignedUser: { select: { id: true, name: true } }
      }
    });

    res.json(task);
  } catch (error) {
    console.error('Error completing cross-dock task:', error);
    res.status(500).json({ error: 'Failed to complete cross-dock task' });
  }
};

// Cancel cross-dock task
const cancelCrossDockTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const task = await prisma.crossDockTask.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        notes: reason ? `Cancelled: ${reason}` : 'Cancelled'
      },
      include: {
        warehouse: { select: { id: true, name: true } },
        inventoryItem: { select: { id: true, name: true, sku: true } }
      }
    });

    res.json(task);
  } catch (error) {
    console.error('Error cancelling cross-dock task:', error);
    res.status(500).json({ error: 'Failed to cancel cross-dock task' });
  }
};

// Get cross-dock statistics
const getCrossDockStats = async (req, res) => {
  try {
    console.log('getCrossDockStats: Request received');
    console.log('getCrossDockStats: Params:', req.params);
    console.log('getCrossDockStats: User:', req.user);
    
    const { warehouseId } = req.params;

    if (!warehouseId) {
      console.log('getCrossDockStats: Missing warehouseId');
      return res.status(400).json({ error: 'Warehouse ID is required' });
    }

    console.log('getCrossDockStats: Processing for warehouseId:', warehouseId);

    try {
      const [
        total,
        pending,
        assigned,
        inProgress,
        staged,
        completed,
        cancelled,
        todayTasks,
        avgCompletionTime
      ] = await Promise.all([
        prisma.crossDockTask.count({ where: { warehouseId } }),
        prisma.crossDockTask.count({ where: { warehouseId, status: 'PENDING' } }),
        prisma.crossDockTask.count({ where: { warehouseId, status: 'ASSIGNED' } }),
        prisma.crossDockTask.count({ where: { warehouseId, status: 'IN_PROGRESS' } }),
        prisma.crossDockTask.count({ where: { warehouseId, status: 'STAGED' } }),
        prisma.crossDockTask.count({ where: { warehouseId, status: 'COMPLETED' } }),
        prisma.crossDockTask.count({ where: { warehouseId, status: 'CANCELLED' } }),
        prisma.crossDockTask.count({
          where: {
            warehouseId,
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        }),
        // Skip avg completion time for now since we don't have a duration field
        Promise.resolve(null)
      ]);

      console.log('getCrossDockStats: Query results - total:', total, 'pending:', pending, 'assigned:', assigned);

      const stats = {
        total,
        pending,
        assigned,
        inProgress,
        staged,
        completed,
        cancelled,
        todayTasks,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        activeTasksCount: pending + assigned + inProgress + staged
      };

      console.log('getCrossDockStats: Sending stats:', stats);
      res.json(stats);
    } catch (dbError) {
      console.error('getCrossDockStats: Database query error:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('Error fetching cross-dock stats:', error);
    res.status(500).json({ error: 'Failed to fetch cross-dock statistics' });
  }
};

module.exports = {
  getCrossDockTasks,
  getCrossDockTaskById,
  createCrossDockTask,
  updateCrossDockTask,
  assignWorkerToTask,
  startCrossDockTask,
  completeCrossDockTask,
  cancelCrossDockTask,
  getCrossDockStats
}; 