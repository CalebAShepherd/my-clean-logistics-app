const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Process inbound shipment: update or create warehouse items and record stock movements
 * @param {String} warehouseId
 * @param {Array<{itemId: String, quantity: Number, locationId?: String}>} items
 * @param {String} [notes]
 * @returns {Promise<Array>} Updated warehouseItems
 */
async function logInboundShipment(warehouseId, items, notes) {
  return await prisma.$transaction(async (tx) => {
    const results = [];
    for (const { itemId, quantity, locationId } of items) {
      if (!itemId || quantity == null) continue;
      // Upsert warehouseItem
      const existing = await tx.warehouseItem.findUnique({
        where: { warehouseId_itemId: { warehouseId, itemId } }
      });
      let entry;
      if (existing) {
        entry = await tx.warehouseItem.update({
          where: { warehouseId_itemId: { warehouseId, itemId } },
          data: {
            quantity: existing.quantity + quantity,
            ...(locationId ? { locationId } : {}),
          }
        });
      } else {
        entry = await tx.warehouseItem.create({
          data: { warehouseId, itemId, locationId, quantity }
        });
      }
      // Record movement
      await tx.stockMovement.create({
        data: {
          warehouseId,
          itemId,
          type: 'INBOUND',
          quantity,
          relatedId: notes,
        }
      });
      results.push(entry);
    }
    return results;
  });
}

/**
 * Process outbound shipment: deduct stock and record stock movements
 * @param {String} warehouseId
 * @param {Array<{itemId: String, quantity: Number, locationId?: String}>} items
 * @param {String} [notes]
 * @returns {Promise<Array>} Updated warehouseItems
 */
async function logOutboundShipment(warehouseId, items, notes) {
  return await prisma.$transaction(async (tx) => {
    const results = [];
    for (const { itemId, quantity, locationId } of items) {
      if (!itemId || quantity == null) continue;
      const existing = await tx.warehouseItem.findUnique({
        where: { warehouseId_itemId: { warehouseId, itemId } }
      });
      if (!existing || existing.quantity < quantity) {
        throw new Error(`Insufficient stock for item ${itemId}`);
      }
      const entry = await tx.warehouseItem.update({
        where: { warehouseId_itemId: { warehouseId, itemId } },
        data: {
          quantity: existing.quantity - quantity,
          ...(locationId ? { locationId } : {}),
        }
      });
      // Record movement
      await tx.stockMovement.create({
        data: {
          warehouseId,
          itemId,
          type: 'OUTBOUND',
          quantity,
          relatedId: notes,
        }
      });
      results.push(entry);
    }
    return results;
  });
}

module.exports = {
  logInboundShipment,
  logOutboundShipment,
}; 