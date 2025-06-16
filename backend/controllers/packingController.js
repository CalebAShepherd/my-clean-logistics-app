const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Create packing slip from pick list
 */
exports.createPackingSlip = async (req, res) => {
  try {
    const { pickListId, shipmentId, packingMethod = 'MANUAL' } = req.body;

    if (!pickListId && !shipmentId) {
      return res.status(400).json({ error: 'Pick list ID or shipment ID is required' });
    }

    let pickList = null;
    let shipment = null;

    if (pickListId) {
      pickList = await prisma.pickList.findUnique({
        where: { id: pickListId },
        include: { 
          pickTasks: {
            include: {
              inventoryItem: true
            }
          }
        }
      });

      if (!pickList) {
        return res.status(404).json({ error: 'Pick list not found' });
      }

      if (pickList.status !== 'QC_COMPLETE' && pickList.status !== 'PICKING_COMPLETE') {
        return res.status(400).json({ error: 'Pick list must be completed for packing' });
      }

      // Get the first shipment from pick tasks
      const firstTask = pickList.pickTasks[0];
      if (firstTask) {
        shipment = await prisma.shipment.findUnique({
          where: { id: firstTask.shipmentId }
        });
      }
    } else {
      shipment = await prisma.shipment.findUnique({
        where: { id: shipmentId }
      });

      if (!shipment) {
        return res.status(404).json({ error: 'Shipment not found' });
      }
    }

    if (!shipment) {
      return res.status(400).json({ error: 'Unable to determine shipment for packing slip' });
    }

    // Generate packing slip number
    const packingSlipCount = await prisma.packingSlip.count({
      where: { warehouseId: shipment.warehouseId }
    });
    const slipNumber = `PS${shipment.warehouseId.slice(-4).toUpperCase()}-${String(packingSlipCount + 1).padStart(4, '0')}`;

    // Create packing slip
    const packingSlip = await prisma.packingSlip.create({
      data: {
        slipNumber,
        pickListId: pickListId || null,
        shipmentId: shipment.id,
        warehouseId: shipment.warehouseId,
        packingMethod,
        status: 'PENDING'
      },
      include: {
        pickList: {
          include: {
            pickTasks: {
              include: {
                inventoryItem: true
              }
            }
          }
        },
        shipment: {
          include: {
            client: { select: { username: true, email: true } }
          }
        },
        warehouse: { select: { id: true, name: true } }
      }
    });

    // Create packing tasks from pick tasks
    if (pickList && pickList.pickTasks.length > 0) {
      const packingTasks = pickList.pickTasks
        .filter(task => task.status === 'QC_PASSED' || task.status === 'PICKED')
        .map(task => ({
          packingSlipId: packingSlip.id,
          inventoryItemId: task.inventoryItemId,
          quantityToPack: task.quantityPicked,
          status: 'PENDING'
        }));

      if (packingTasks.length > 0) {
        await prisma.packingTask.createMany({
          data: packingTasks
        });

        // Update packing slip with item count
        await prisma.packingSlip.update({
          where: { id: packingSlip.id },
          data: { totalItems: packingTasks.length }
        });
      }
    }

    res.status(201).json(packingSlip);
  } catch (error) {
    console.error('Error creating packing slip:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get all packing slips with filtering and pagination
 */
exports.getPackingSlips = async (req, res) => {
  try {
    const { 
      warehouseId, 
      status, 
      packerId, 
      page = 1, 
      limit = 10 
    } = req.query;

    const where = {};
    if (warehouseId) where.warehouseId = warehouseId;
    if (status) where.status = status;
    if (packerId) where.packerId = packerId;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [packingSlips, total] = await Promise.all([
      prisma.packingSlip.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          pickList: { select: { id: true, listNumber: true } },
          shipment: { 
            select: { 
              id: true, 
              reference: true,
              client: { select: { username: true } }
            } 
          },
          warehouse: { select: { id: true, name: true } },
          packer: { select: { id: true, username: true, email: true } },
          packingTasks: {
            select: { 
              id: true, 
              status: true, 
              quantityToPack: true, 
              quantityPacked: true 
            }
          },
          packages: { select: { id: true, status: true } }
        }
      }),
      prisma.packingSlip.count({ where })
    ]);

    res.json({
      packingSlips,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching packing slips:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get a specific packing slip by ID
 */
exports.getPackingSlip = async (req, res) => {
  try {
    const { id } = req.params;

    const packingSlip = await prisma.packingSlip.findUnique({
      where: { id },
      include: {
        pickList: { 
          select: { 
            id: true, 
            listNumber: true,
            assignedPicker: { select: { username: true } }
          } 
        },
        shipment: {
          include: {
            client: { select: { username: true, email: true } }
          }
        },
        warehouse: true,
        packer: { select: { id: true, username: true, email: true } },
        packingTasks: {
          include: {
            inventoryItem: true,
            package: { select: { id: true, packageNumber: true, status: true } }
          }
        },
        packages: {
          include: {
            packingTasks: {
              include: {
                inventoryItem: { select: { sku: true, name: true } }
              }
            }
          }
        }
      }
    });

    if (!packingSlip) {
      return res.status(404).json({ error: 'Packing slip not found' });
    }

    res.json(packingSlip);
  } catch (error) {
    console.error('Error fetching packing slip:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Assign packer to packing slip
 */
exports.assignPacker = async (req, res) => {
  try {
    const { id } = req.params;
    const { packerId } = req.body;

    if (!packerId) {
      return res.status(400).json({ error: 'Packer ID is required' });
    }

    // Verify packer exists
    const packer = await prisma.user.findUnique({
      where: { id: packerId },
      select: { id: true, username: true, role: true }
    });

    if (!packer) {
      return res.status(404).json({ error: 'Packer not found' });
    }

    const updatedPackingSlip = await prisma.packingSlip.update({
      where: { id },
      data: { 
        packerId: packerId,
        status: 'IN_PROGRESS',
        packingStartedAt: new Date()
      },
      include: {
        shipment: { 
          select: { 
            id: true, 
            reference: true,
            client: { select: { username: true } }
          } 
        },
        packer: { select: { id: true, username: true, email: true } },
        packingTasks: {
          include: {
            inventoryItem: true
          }
        }
      }
    });

    res.json(updatedPackingSlip);
  } catch (error) {
    console.error('Error assigning packer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Start packing process
 */
exports.startPacking = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const packingSlip = await prisma.packingSlip.findUnique({
      where: { id },
      select: { status: true, packerId: true }
    });

    if (!packingSlip) {
      return res.status(404).json({ error: 'Packing slip not found' });
    }

    if (packingSlip.status !== 'PENDING') {
      return res.status(400).json({ error: 'Packing slip cannot be started in current status' });
    }

    // If no packer assigned, assign current user
    const packerId = packingSlip.packerId || userId;

    const updatedPackingSlip = await prisma.packingSlip.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        packerId,
        packingStartedAt: new Date()
      },
      include: {
        shipment: { 
          select: { 
            id: true, 
            reference: true,
            client: { select: { username: true } }
          } 
        },
        packer: { select: { id: true, username: true, email: true } },
        packingTasks: {
          include: {
            inventoryItem: true
          }
        }
      }
    });

    res.json(updatedPackingSlip);
  } catch (error) {
    console.error('Error starting packing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Create a new package
 */
exports.createPackage = async (req, res) => {
  try {
    const { packingSlipId } = req.params;
    const { 
      packageType = 'BOX', 
      dimensions, 
      maxWeight 
    } = req.body;

    // Generate package number
    const packageCount = await prisma.package.count({
      where: { packingSlipId }
    });
    const packageNumber = `PKG${packingSlipId.slice(-4).toUpperCase()}-${String(packageCount + 1).padStart(3, '0')}`;

    const package = await prisma.package.create({
      data: {
        packageNumber,
        packingSlipId,
        packageType,
        dimensions: dimensions || null,
        maxWeight,
        status: 'OPEN'
      },
      include: {
        packingSlip: { 
          select: { 
            id: true, 
            slipNumber: true,
            shipment: { select: { reference: true } }
          } 
        }
      }
    });

    res.status(201).json(package);
  } catch (error) {
    console.error('Error creating package:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Pack item into package
 */
exports.packItem = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { 
      packageId, 
      quantityPacked, 
      notes 
    } = req.body;

    if (!packageId || quantityPacked === undefined) {
      return res.status(400).json({ error: 'Package ID and quantity packed are required' });
    }

    const packingTask = await prisma.packingTask.findUnique({
      where: { id: taskId },
      include: { 
        packingSlip: true,
        inventoryItem: true 
      }
    });

    if (!packingTask) {
      return res.status(404).json({ error: 'Packing task not found' });
    }

    if (packingTask.status !== 'PENDING' && packingTask.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Packing task cannot be packed in current status' });
    }

    // Validate quantity
    if (quantityPacked > packingTask.quantityToPack) {
      return res.status(400).json({ 
        error: 'Packed quantity cannot exceed quantity to pack' 
      });
    }

    // Verify package exists and is open
    const package = await prisma.package.findUnique({
      where: { id: packageId },
      select: { status: true, packingSlipId: true }
    });

    if (!package) {
      return res.status(404).json({ error: 'Package not found' });
    }

    if (package.status !== 'OPEN') {
      return res.status(400).json({ error: 'Package is not open for packing' });
    }

    if (package.packingSlipId !== packingTask.packingSlipId) {
      return res.status(400).json({ error: 'Package does not belong to this packing slip' });
    }

    // Update packing task
    const updatedTask = await prisma.packingTask.update({
      where: { id: taskId },
      data: {
        packageId,
        quantityPacked,
        notes,
        status: quantityPacked === packingTask.quantityToPack ? 'PACKED' : 'IN_PROGRESS',
        packedAt: new Date()
      },
      include: {
        inventoryItem: true,
        package: true
      }
    });

    // Update packing slip progress
    const allTasks = await prisma.packingTask.findMany({
      where: { packingSlipId: packingTask.packingSlipId },
      select: { status: true }
    });

    const packedTasks = allTasks.filter(
      task => task.status === 'PACKED' || task.status === 'COMPLETED'
    ).length;

    await prisma.packingSlip.update({
      where: { id: packingTask.packingSlipId },
      data: { packedItems: packedTasks }
    });

    res.json(updatedTask);
  } catch (error) {
    console.error('Error packing item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Seal a package
 */
exports.sealPackage = async (req, res) => {
  try {
    const { packageId } = req.params;
    const { weight, trackingNumber } = req.body;

    const package = await prisma.package.findUnique({
      where: { id: packageId },
      include: {
        packingTasks: {
          include: {
            inventoryItem: true
          }
        }
      }
    });

    if (!package) {
      return res.status(404).json({ error: 'Package not found' });
    }

    if (package.status !== 'OPEN') {
      return res.status(400).json({ error: 'Package is not open for sealing' });
    }

    // Update package
    const updatedPackage = await prisma.package.update({
      where: { id: packageId },
      data: {
        status: 'SEALED',
        weight,
        trackingNumber,
        sealedAt: new Date()
      },
      include: {
        packingSlip: { 
          select: { 
            id: true, 
            slipNumber: true,
            shipment: { select: { reference: true } }
          } 
        },
        packingTasks: {
          include: {
            inventoryItem: true
          }
        }
      }
    });

    res.json(updatedPackage);
  } catch (error) {
    console.error('Error sealing package:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Complete packing slip
 */
exports.completePackingSlip = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      totalWeight, 
      totalDimensions, 
      trackingNumber, 
      shippingLabelGenerated = false 
    } = req.body;

    const packingSlip = await prisma.packingSlip.findUnique({
      where: { id },
      include: {
        packingTasks: true,
        packages: true
      }
    });

    if (!packingSlip) {
      return res.status(404).json({ error: 'Packing slip not found' });
    }

    // Verify all tasks are packed
    const unpackedTasks = packingSlip.packingTasks.filter(
      task => task.status !== 'PACKED' && task.status !== 'COMPLETED'
    );

    if (unpackedTasks.length > 0) {
      return res.status(400).json({ 
        error: 'All packing tasks must be completed before finishing packing slip' 
      });
    }

    // Verify all packages are sealed
    const unsealedPackages = packingSlip.packages.filter(
      pkg => pkg.status === 'OPEN'
    );

    if (unsealedPackages.length > 0) {
      return res.status(400).json({ 
        error: 'All packages must be sealed before completing packing slip' 
      });
    }

    const updatedPackingSlip = await prisma.packingSlip.update({
      where: { id },
      data: {
        status: 'PACKED',
        totalWeight,
        totalDimensions,
        trackingNumber,
        shippingLabelGenerated,
        packingCompletedAt: new Date()
      },
      include: {
        shipment: { 
          select: { 
            id: true, 
            reference: true,
            client: { select: { username: true } }
          } 
        },
        packer: { select: { id: true, username: true } },
        packages: {
          include: {
            packingTasks: {
              include: {
                inventoryItem: true
              }
            }
          }
        }
      }
    });

    res.json(updatedPackingSlip);
  } catch (error) {
    console.error('Error completing packing slip:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Quality control check for packing slip
 */
exports.performPackingQC = async (req, res) => {
  try {
    const { id } = req.params;
    const { qcPassed, qcNotes } = req.body;
    const userId = req.user.id;

    const packingSlip = await prisma.packingSlip.findUnique({
      where: { id }
    });

    if (!packingSlip) {
      return res.status(404).json({ error: 'Packing slip not found' });
    }

    if (packingSlip.status !== 'PACKED') {
      return res.status(400).json({ error: 'Packing slip must be packed for QC' });
    }

    const updatedPackingSlip = await prisma.packingSlip.update({
      where: { id },
      data: {
        status: qcPassed ? 'QC_PASSED' : 'QC_FAILED',
        qcCompletedAt: new Date()
      },
      include: {
        shipment: { 
          select: { 
            id: true, 
            reference: true,
            client: { select: { username: true } }
          } 
        },
        packer: { select: { id: true, username: true } },
        packages: true
      }
    });

    res.json(updatedPackingSlip);
  } catch (error) {
    console.error('Error performing packing QC:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get packing statistics
 */
exports.getPackingStats = async (req, res) => {
  try {
    const { warehouseId } = req.query;

    const where = warehouseId ? { warehouseId } : {};

    const stats = await prisma.packingSlip.groupBy({
      by: ['status'],
      where,
      _count: { status: true }
    });

    const totalStats = await prisma.packingSlip.aggregate({
      where,
      _count: { id: true },
      _avg: { 
        totalItems: true,
        packedItems: true,
        totalWeight: true
      }
    });

    const recentActivity = await prisma.packingSlip.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        slipNumber: true,
        status: true,
        totalItems: true,
        packedItems: true,
        updatedAt: true,
        packer: { select: { username: true } }
      }
    });

    res.json({
      statusBreakdown: stats.reduce((acc, stat) => {
        acc[stat.status] = stat._count.status;
        return acc;
      }, {}),
      totals: {
        totalPackingSlips: totalStats._count.id,
        avgItemsPerSlip: totalStats._avg.totalItems,
        avgPackingRate: totalStats._avg.packedItems && totalStats._avg.totalItems 
          ? (totalStats._avg.packedItems / totalStats._avg.totalItems) * 100 
          : 0,
        avgWeight: totalStats._avg.totalWeight
      },
      recentActivity
    });
  } catch (error) {
    console.error('Error fetching packing stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 