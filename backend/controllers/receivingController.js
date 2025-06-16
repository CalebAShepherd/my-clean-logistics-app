const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all receipts for a warehouse with filtering
const getReceipts = async (req, res) => {
  try {
    const {
      warehouseId,
      status,
      receivedBy,
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
    if (receivedBy) where.receivedBy = receivedBy;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [receipts, totalCount] = await Promise.all([
      prisma.receipt.findMany({
        where,
        include: {
          asn: { select: { id: true, asnNumber: true, supplier: { select: { name: true } } } },
          warehouse: { select: { id: true, name: true } },
          dockDoor: { select: { id: true, doorNumber: true } },
          receiver: { select: { id: true, username: true } },
          receiptItems: {
            include: {
              inventoryItem: { select: { id: true, name: true, sku: true } }
            }
          },
          putAwayTasks: { select: { id: true, status: true } }
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { [sortBy]: sortOrder }
      }),
      prisma.receipt.count({ where })
    ]);

    res.json({
      receipts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching receipts:', error);
    res.status(500).json({ error: 'Failed to fetch receipts' });
  }
};

// Get single receipt by ID
const getReceiptById = async (req, res) => {
  try {
    const { id } = req.params;

    const receipt = await prisma.receipt.findUnique({
      where: { id },
      include: {
        asn: {
          include: {
            supplier: { select: { id: true, name: true, contactInfo: true } },
            asnItems: {
              include: {
                inventoryItem: { select: { id: true, name: true, sku: true } }
              }
            }
          }
        },
        warehouse: { select: { id: true, name: true } },
        dockDoor: { select: { id: true, doorNumber: true } },
        receiver: { select: { id: true, username: true } },
        receiptItems: {
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
            asnItem: true,
            putAwayTasks: {
              include: {
                toLocation: { select: { id: true, zone: true, aisle: true, shelf: true, bin: true } }
              }
            }
          }
        },
        putAwayTasks: {
          include: {
            inventoryItem: { select: { id: true, name: true, sku: true } },
            toLocation: { select: { id: true, zone: true, aisle: true, shelf: true, bin: true } },
            assignedUser: { select: { id: true, username: true } }
          }
        }
      }
    });

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    res.json(receipt);
  } catch (error) {
    console.error('Error fetching receipt:', error);
    res.status(500).json({ error: 'Failed to fetch receipt' });
  }
};

// Create new receipt (from ASN or manual)
const createReceipt = async (req, res) => {
  try {
    const {
      asnId,
      warehouseId,
      dockDoorId,
      receivedBy,
      receiptMethod = 'MANUAL',
      qcRequired = false,
      notes,
      items = []
    } = req.body;

    // Validate required fields
    if (!warehouseId || !receivedBy) {
      return res.status(400).json({ 
        error: 'Warehouse ID and receiver are required' 
      });
    }

    // Generate receipt number
    const receiptCount = await prisma.receipt.count({
      where: { warehouseId }
    });
    const receiptNumber = `REC-${Date.now()}-${receiptCount + 1}`;

    // Create receipt with items
    const receipt = await prisma.receipt.create({
      data: {
        receiptNumber,
        asnId,
        warehouseId,
        dockDoorId,
        receivedBy,
        receiptMethod,
        qcRequired,
        notes,
        totalItems: items.length,
        startTime: new Date(),
        receiptItems: {
          create: items.map(item => ({
            asnItemId: item.asnItemId,
            inventoryItemId: item.inventoryItemId,
            expectedQty: item.expectedQty,
            receivedQty: item.receivedQty || 0,
            damagedQty: item.damagedQty || 0,
            condition: item.condition || 'GOOD',
            lotNumber: item.lotNumber,
            expirationDate: item.expirationDate ? new Date(item.expirationDate) : null,
            unitCost: item.unitCost,
            discrepancyReason: item.discrepancyReason,
            notes: item.notes
          }))
        }
      },
      include: {
        asn: { select: { id: true, asnNumber: true } },
        warehouse: { select: { id: true, name: true } },
        dockDoor: { select: { id: true, doorNumber: true } },
        receiver: { select: { id: true, username: true } },
        receiptItems: {
          include: {
            inventoryItem: { select: { id: true, name: true, sku: true } }
          }
        }
      }
    });

    res.status(201).json(receipt);
  } catch (error) {
    console.error('Error creating receipt:', error);
    res.status(500).json({ error: 'Failed to create receipt' });
  }
};

// Update receipt item quantities
const updateReceiptItem = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      receivedQty,
      damagedQty,
      condition,
      lotNumber,
      expirationDate,
      discrepancyReason,
      qcStatus,
      qcNotes,
      notes
    } = req.body;

    const updates = {};
    if (receivedQty !== undefined) updates.receivedQty = receivedQty;
    if (damagedQty !== undefined) updates.damagedQty = damagedQty;
    if (condition) updates.condition = condition;
    if (lotNumber) updates.lotNumber = lotNumber;
    if (expirationDate) updates.expirationDate = new Date(expirationDate);
    if (discrepancyReason) updates.discrepancyReason = discrepancyReason;
    if (qcStatus) updates.qcStatus = qcStatus;
    if (qcNotes) updates.qcNotes = qcNotes;
    if (notes) updates.notes = notes;

    updates.receivedAt = new Date();

    const receiptItem = await prisma.receiptItem.update({
      where: { id },
      data: updates,
      include: {
        receipt: { select: { id: true, receiptNumber: true } },
        inventoryItem: { select: { id: true, name: true, sku: true } }
      }
    });

    // Update receipt statistics
    await updateReceiptStats(receiptItem.receiptId);

    res.json(receiptItem);
  } catch (error) {
    console.error('Error updating receipt item:', error);
    res.status(500).json({ error: 'Failed to update receipt item' });
  }
};

// Complete receipt and generate put-away tasks
const completeReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const { generatePutAwayTasks = true } = req.body;

    const receipt = await prisma.receipt.findUnique({
      where: { id },
      include: {
        receiptItems: {
          include: {
            inventoryItem: true
          }
        }
      }
    });

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    // Update receipt status
    const updatedReceipt = await prisma.receipt.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        endTime: new Date(),
        receivedItems: receipt.receiptItems.reduce((sum, item) => sum + item.receivedQty, 0),
        discrepancies: receipt.receiptItems.filter(item => 
          item.receivedQty !== item.expectedQty || item.damagedQty > 0
        ).length
      }
    });

    // Generate put-away tasks if requested
    if (generatePutAwayTasks) {
      const putAwayTasks = [];
      
      for (const item of receipt.receiptItems) {
        if (item.receivedQty > 0) {
          const taskNumber = `PA-${Date.now()}-${putAwayTasks.length + 1}`;
          
          putAwayTasks.push({
            taskNumber,
            receiptId: receipt.id,
            receiptItemId: item.id,
            warehouseId: receipt.warehouseId,
            inventoryItemId: item.inventoryItemId,
            quantity: item.receivedQty,
            status: 'PENDING',
            priority: 1,
            putAwayMethod: 'MANUAL'
          });
        }
      }

      if (putAwayTasks.length > 0) {
        await prisma.putAwayTask.createMany({
          data: putAwayTasks
        });
      }
    }

    // Update ASN status if linked
    if (receipt.asnId) {
      const asnReceiptCount = await prisma.receipt.count({
        where: { 
          asnId: receipt.asnId,
          status: 'COMPLETED'
        }
      });

      const asnTotalReceipts = await prisma.receipt.count({
        where: { asnId: receipt.asnId }
      });

      if (asnReceiptCount === asnTotalReceipts) {
        await prisma.aSN.update({
          where: { id: receipt.asnId },
          data: { status: 'RECEIVED' }
        });
      }
    }

    res.json(updatedReceipt);
  } catch (error) {
    console.error('Error completing receipt:', error);
    res.status(500).json({ error: 'Failed to complete receipt' });
  }
};

// Perform QC check on receipt
const performQC = async (req, res) => {
  try {
    const { id } = req.params;
    const { qcPassed, qcNotes } = req.body;

    const receipt = await prisma.receipt.update({
      where: { id },
      data: {
        qcCompleted: true,
        qcPassed,
        qcNotes,
        status: qcPassed ? 'COMPLETED' : 'QC_FAILED'
      },
      include: {
        receiptItems: {
          include: {
            inventoryItem: { select: { id: true, name: true, sku: true } }
          }
        }
      }
    });

    res.json(receipt);
  } catch (error) {
    console.error('Error performing QC:', error);
    res.status(500).json({ error: 'Failed to perform QC' });
  }
};

// Get receiving statistics
const getReceivingStats = async (req, res) => {
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
      totalReceipts,
      statusCounts,
      todayReceipts,
      pendingQC,
      discrepancyCount
    ] = await Promise.all([
      prisma.receipt.count({ where }),
      prisma.receipt.groupBy({
        by: ['status'],
        where,
        _count: { status: true }
      }),
      prisma.receipt.count({
        where: {
          ...where,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999))
          }
        }
      }),
      prisma.receipt.count({
        where: {
          ...where,
          qcRequired: true,
          qcCompleted: false
        }
      }),
      prisma.receipt.count({
        where: {
          ...where,
          discrepancies: { gt: 0 }
        }
      })
    ]);

    const stats = {
      totalReceipts,
      statusBreakdown: statusCounts.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {}),
      todayReceipts,
      pendingQC,
      discrepancyCount
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching receiving statistics:', error);
    res.status(500).json({ error: 'Failed to fetch receiving statistics' });
  }
};

// Helper function to update receipt statistics
const updateReceiptStats = async (receiptId) => {
  try {
    const receiptItems = await prisma.receiptItem.findMany({
      where: { receiptId }
    });

    const receivedItems = receiptItems.reduce((sum, item) => sum + item.receivedQty, 0);
    const discrepancies = receiptItems.filter(item => 
      item.receivedQty !== item.expectedQty || item.damagedQty > 0
    ).length;

    await prisma.receipt.update({
      where: { id: receiptId },
      data: {
        receivedItems,
        discrepancies
      }
    });
  } catch (error) {
    console.error('Error updating receipt stats:', error);
  }
};

// Cancel receipt
const cancelReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const receipt = await prisma.receipt.findUnique({
      where: { id },
      include: { putAwayTasks: true }
    });

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    if (receipt.putAwayTasks.some(task => task.status !== 'PENDING')) {
      return res.status(400).json({ 
        error: 'Cannot cancel receipt with active put-away tasks' 
      });
    }

    const updatedReceipt = await prisma.receipt.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        notes: receipt.notes ? `${receipt.notes}\n\nCancelled: ${reason}` : `Cancelled: ${reason}`
      }
    });

    res.json(updatedReceipt);
  } catch (error) {
    console.error('Error cancelling receipt:', error);
    res.status(500).json({ error: 'Failed to cancel receipt' });
  }
};

module.exports = {
  getReceipts,
  getReceiptById,
  createReceipt,
  updateReceiptItem,
  completeReceipt,
  performQC,
  getReceivingStats,
  cancelReceipt
}; 