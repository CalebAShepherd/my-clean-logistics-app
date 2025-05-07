import { fetchWarehouses } from './warehouses';
import { fetchWarehouseItems } from './warehouseItems';

/**
 * Fetch stock alerts for warehouses: low stock, overstock, expiring within daysBeforeExpiry (default 7)
 * Returns array of alert messages
 */
export async function fetchStockAlerts(token, daysBeforeExpiry = 7) {
  const alerts = [];
  const now = new Date();
  const expireThreshold = new Date(now.getTime() + daysBeforeExpiry * 24 * 60 * 60 * 1000);

  // Get all warehouses
  const warehouses = await fetchWarehouses(token);

  for (const wh of warehouses) {
    // Fetch items in each warehouse
    const items = await fetchWarehouseItems(token, { warehouseId: wh.id });
    items.forEach(item => {
      // Low stock
      if (item.minThreshold != null && item.quantity <= item.minThreshold) {
        alerts.push(`Low stock: ${item.item.name || item.itemId} in ${wh.name} (qty ${item.quantity})`);
      }
      // Overstock
      if (item.maxThreshold != null && item.quantity >= item.maxThreshold) {
        alerts.push(`Overstock: ${item.item.name || item.itemId} in ${wh.name} (qty ${item.quantity})`);
      }
      // Expiring
      if (item.expiresAt) {
        const expDate = new Date(item.expiresAt);
        if (expDate <= expireThreshold) {
          alerts.push(`Expiring soon: ${item.item.name || item.itemId} in ${wh.name} (exp ${expDate.toLocaleDateString()})`);
        }
      }
    });
  }

  return alerts;
} 