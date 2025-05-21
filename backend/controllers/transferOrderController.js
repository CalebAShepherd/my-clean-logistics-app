const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * List all transfer orders, optionally filtered by fromWarehouseId, toWarehouseId, itemId, or status
 */
exports.getTransferOrders = async (req, res) => {
  try {
    const { fromWarehouseId, toWarehouseId, itemId, status } = req.query;
    const where = {};
    if (fromWarehouseId) where.fromWarehouseId = fromWarehouseId;
    if (toWarehouseId) where.toWarehouseId = toWarehouseId;
    if (itemId) where.itemId = itemId;
    if (status) where.status = status;
    const orders = await prisma.transferOrder.findMany({ where });
    return res.json(orders);
  } catch (err) {
    console.error('Error fetching transfer orders:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get a single transfer order by ID
 */
exports.getTransferOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await prisma.transferOrder.findUnique({ where: { id } });
    if (!order) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.json(order);
  } catch (err) {
    console.error('Error fetching transfer order:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Create a new transfer order
 */
exports.createTransferOrder = async (req, res) => {
  try {
    const { fromWarehouseId, toWarehouseId, itemId, quantity } = req.body;
    if (!fromWarehouseId || !toWarehouseId || !itemId || quantity == null) {
      return res.status(400).json({ error: 'fromWarehouseId, toWarehouseId, itemId, and quantity are required' });
    }
    const result = await prisma.$transaction(async (tx) => {
      // Create transfer order in pending status
      const order = await tx.transferOrder.create({
        data: { fromWarehouseId, toWarehouseId, itemId, quantity, status: 'PENDING' }
      });
      // Check source stock
      const sourceItem = await tx.warehouseItem.findUnique({
        where: { warehouseId_itemId: { warehouseId: fromWarehouseId, itemId } }
      });
      if (!sourceItem || sourceItem.quantity < quantity) {
        throw new Error('Insufficient stock in source warehouse');
      }
      // Deduct from source
      await tx.warehouseItem.update({
        where: { warehouseId_itemId: { warehouseId: fromWarehouseId, itemId } },
        data: { quantity: sourceItem.quantity - quantity }
      });
      await tx.stockMovement.create({
        data: {
          warehouseId: fromWarehouseId,
          itemId,
          type: 'TRANSFER_OUT',
          quantity,
          relatedId: order.id
        }
      });
      // Add to destination
      let destItem = await tx.warehouseItem.findUnique({
        where: { warehouseId_itemId: { warehouseId: toWarehouseId, itemId } }
      });
      if (!destItem) {
        destItem = await tx.warehouseItem.create({
          data: { warehouseId: toWarehouseId, itemId, quantity }
        });
      } else {
        await tx.warehouseItem.update({
          where: { warehouseId_itemId: { warehouseId: toWarehouseId, itemId } },
          data: { quantity: destItem.quantity + quantity }
        });
      }
      await tx.stockMovement.create({
        data: {
          warehouseId: toWarehouseId,
          itemId,
          type: 'TRANSFER_IN',
          quantity,
          relatedId: order.id
        }
      });
      // Update order status to COMPLETED
      const completedOrder = await tx.transferOrder.update({
        where: { id: order.id },
        data: { status: 'COMPLETED' }
      });
      return completedOrder;
    });
    return res.status(201).json(result);
  } catch (err) {
    if (err.message === 'Insufficient stock in source warehouse') {
      return res.status(400).json({ error: err.message });
    }
    console.error('Error creating transfer order:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update an existing transfer order
 */
exports.updateTransferOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = await prisma.transferOrder.update({
      where: { id },
      data: updates,
    });
    return res.json(updated);
  } catch (err) {
    console.error('Error updating transfer order:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete a transfer order
 */
exports.deleteTransferOrder = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.transferOrder.delete({ where: { id } });
    return res.status(204).end();
  } catch (err) {
    console.error('Error deleting transfer order:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 