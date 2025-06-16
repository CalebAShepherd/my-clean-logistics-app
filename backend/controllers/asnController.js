const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all ASNs for a warehouse with filtering and pagination
const getASNs = async (req, res) => {
  try {
    const { 
      warehouseId, 
      status, 
      supplierId, 
      dateFrom, 
      dateTo, 
      page = 1, 
      limit = 20,
      sortBy = 'expectedArrival',
      sortOrder = 'asc'
    } = req.query;

    if (!warehouseId) {
      return res.status(400).json({ error: 'Warehouse ID is required' });
    }

    const skip = (page - 1) * limit;
    const where = { warehouseId };

    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;
    if (dateFrom || dateTo) {
      where.expectedArrival = {};
      if (dateFrom) where.expectedArrival.gte = new Date(dateFrom);
      if (dateTo) where.expectedArrival.lte = new Date(dateTo);
    }

    const [asns, totalCount] = await Promise.all([
      prisma.aSN.findMany({
        where,
        include: {
          warehouse: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
          asnItems: {
            include: {
              inventoryItem: { select: { id: true, name: true, sku: true } }
            }
          },
          appointments: true,
          receipts: { select: { id: true, status: true } }
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { [sortBy]: sortOrder }
      }),
      prisma.aSN.count({ where })
    ]);

    res.json({
      asns,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching ASNs:', error);
    res.status(500).json({ error: 'Failed to fetch ASNs' });
  }
};

// Get single ASN by ID
const getASNById = async (req, res) => {
  try {
    const { id } = req.params;

    const asn = await prisma.aSN.findUnique({
      where: { id },
      include: {
        warehouse: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true, contactInfo: true } },
        asnItems: {
          include: {
            inventoryItem: { 
              select: { 
                id: true, 
                name: true, 
                sku: true, 
                description: true,
                unit: true
              } 
            },
            receiptItems: true
          }
        },
        appointments: {
          include: {
            dockDoor: { select: { id: true, doorNumber: true } }
          }
        },
        receipts: {
          include: {
            receiver: { select: { id: true, username: true } },
            dockDoor: { select: { id: true, doorNumber: true } },
            receiptItems: true
          }
        }
      }
    });

    if (!asn) {
      return res.status(404).json({ error: 'ASN not found' });
    }

    res.json(asn);
  } catch (error) {
    console.error('Error fetching ASN:', error);
    res.status(500).json({ error: 'Failed to fetch ASN' });
  }
};

// Create new ASN
const createASN = async (req, res) => {
  try {
    const {
      asnNumber,
      supplierId,
      carrierName,
      driverName,
      driverPhone,
      vehicleInfo,
      warehouseId,
      expectedArrival,
      totalPallets,
      totalCases,
      totalWeight,
      referenceNumber,
      poNumber,
      trailerNumber,
      sealNumber,
      temperature,
      specialHandling,
      notes,
      items = []
    } = req.body;

    // Validate required fields
    if (!asnNumber || !warehouseId || !expectedArrival) {
      return res.status(400).json({ 
        error: 'ASN number, warehouse ID, and expected arrival are required' 
      });
    }

    // Check if ASN number already exists
    const existingASN = await prisma.aSN.findUnique({
      where: { asnNumber }
    });

    if (existingASN) {
      return res.status(400).json({ error: 'ASN number already exists' });
    }

    // Create ASN with items
    const asn = await prisma.aSN.create({
      data: {
        asnNumber,
        supplierId,
        carrierName,
        driverName,
        driverPhone,
        vehicleInfo,
        warehouseId,
        expectedArrival: new Date(expectedArrival),
        totalPallets: totalPallets || 0,
        totalCases: totalCases || 0,
        totalWeight,
        referenceNumber,
        poNumber,
        trailerNumber,
        sealNumber,
        temperature,
        specialHandling,
        notes,
        asnItems: {
          create: items.map(item => ({
            inventoryItemId: item.inventoryItemId,
            expectedQty: item.expectedQty,
            unitCost: item.unitCost,
            lotNumber: item.lotNumber,
            expirationDate: item.expirationDate ? new Date(item.expirationDate) : null,
            condition: item.condition || 'GOOD',
            notes: item.notes
          }))
        }
      },
      include: {
        warehouse: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
        asnItems: {
          include: {
            inventoryItem: { select: { id: true, name: true, sku: true } }
          }
        }
      }
    });

    res.status(201).json(asn);
  } catch (error) {
    console.error('Error creating ASN:', error);
    res.status(500).json({ error: 'Failed to create ASN' });
  }
};

// Update ASN
const updateASN = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    // Remove items from updates as they need special handling
    delete updates.items;

    if (updates.expectedArrival) {
      updates.expectedArrival = new Date(updates.expectedArrival);
    }
    if (updates.actualArrival) {
      updates.actualArrival = new Date(updates.actualArrival);
    }

    const asn = await prisma.aSN.update({
      where: { id },
      data: updates,
      include: {
        warehouse: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
        asnItems: {
          include: {
            inventoryItem: { select: { id: true, name: true, sku: true } }
          }
        }
      }
    });

    res.json(asn);
  } catch (error) {
    console.error('Error updating ASN:', error);
    res.status(500).json({ error: 'Failed to update ASN' });
  }
};

// Update ASN status with automatic status flow validation
const updateASNStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, actualArrival } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const updates = { status };
    
    if (status === 'ARRIVED' && actualArrival) {
      updates.actualArrival = new Date(actualArrival);
    }

    const asn = await prisma.aSN.update({
      where: { id },
      data: updates,
      include: {
        warehouse: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
        asnItems: {
          include: {
            inventoryItem: { select: { id: true, name: true, sku: true } }
          }
        }
      }
    });

    res.json(asn);
  } catch (error) {
    console.error('Error updating ASN status:', error);
    res.status(500).json({ error: 'Failed to update ASN status' });
  }
};

// Cancel ASN
const cancelASN = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Check if ASN can be cancelled (not yet received)
    const asn = await prisma.aSN.findUnique({
      where: { id },
      include: { receipts: true }
    });

    if (!asn) {
      return res.status(404).json({ error: 'ASN not found' });
    }

    if (asn.receipts.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot cancel ASN that has already been received' 
      });
    }

    const updatedASN = await prisma.aSN.update({
      where: { id },
      data: { 
        status: 'CANCELLED',
        notes: asn.notes ? `${asn.notes}\n\nCancelled: ${reason}` : `Cancelled: ${reason}`
      },
      include: {
        warehouse: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } }
      }
    });

    res.json(updatedASN);
  } catch (error) {
    console.error('Error cancelling ASN:', error);
    res.status(500).json({ error: 'Failed to cancel ASN' });
  }
};

// Get ASN statistics for a warehouse
const getASNStats = async (req, res) => {
  try {
    const { warehouseId } = req.params;
    const { dateFrom, dateTo } = req.query;

    const where = { warehouseId };
    if (dateFrom || dateTo) {
      where.expectedArrival = {};
      if (dateFrom) where.expectedArrival.gte = new Date(dateFrom);
      if (dateTo) where.expectedArrival.lte = new Date(dateTo);
    }

    const [
      totalASNs,
      statusCounts,
      todayASNs,
      overdueASNs,
      upcomingASNs
    ] = await Promise.all([
      prisma.aSN.count({ where }),
      prisma.aSN.groupBy({
        by: ['status'],
        where,
        _count: { status: true }
      }),
      prisma.aSN.count({
        where: {
          ...where,
          expectedArrival: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999))
          }
        }
      }),
      prisma.aSN.count({
        where: {
          ...where,
          status: { in: ['PENDING', 'SCHEDULED', 'IN_TRANSIT'] },
          expectedArrival: { lt: new Date() }
        }
      }),
      prisma.aSN.count({
        where: {
          ...where,
          status: { in: ['PENDING', 'SCHEDULED', 'IN_TRANSIT'] },
          expectedArrival: { 
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
          }
        }
      })
    ]);

    const stats = {
      totalASNs,
      statusBreakdown: statusCounts.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {}),
      todayASNs,
      overdueASNs,
      upcomingASNs
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching ASN statistics:', error);
    res.status(500).json({ error: 'Failed to fetch ASN statistics' });
  }
};

// Delete ASN (only if not yet processed)
const deleteASN = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if ASN can be deleted
    const asn = await prisma.aSN.findUnique({
      where: { id },
      include: { 
        receipts: true,
        appointments: true
      }
    });

    if (!asn) {
      return res.status(404).json({ error: 'ASN not found' });
    }

    if (asn.receipts.length > 0 || asn.appointments.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete ASN that has receipts or appointments' 
      });
    }

    await prisma.aSN.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting ASN:', error);
    res.status(500).json({ error: 'Failed to delete ASN' });
  }
};

module.exports = {
  getASNs,
  getASNById,
  createASN,
  updateASN,
  updateASNStatus,
  cancelASN,
  getASNStats,
  deleteASN
}; 