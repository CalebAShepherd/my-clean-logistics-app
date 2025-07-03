const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Integration Service - Handles automated financial entries from operational events
 * Implements event-driven architecture for real-time financial updates
 */
class IntegrationService {
  constructor() {
    this.eventHandlers = new Map();
    this.setupEventHandlers();
  }

  /**
   * Setup all event handlers for different operational events
   */
  setupEventHandlers() {
    // Warehouse Operation Events
    this.eventHandlers.set('wave.completed', this.handleWaveCompleted.bind(this));
    this.eventHandlers.set('pick.completed', this.handlePickCompleted.bind(this));
    this.eventHandlers.set('pack.completed', this.handlePackCompleted.bind(this));
    this.eventHandlers.set('shipment.delivered', this.handleShipmentDelivered.bind(this));
    
    // Inventory Events
    this.eventHandlers.set('inventory.received', this.handleInventoryReceived.bind(this));
    this.eventHandlers.set('inventory.adjusted', this.handleInventoryAdjusted.bind(this));
    this.eventHandlers.set('stock.movement', this.handleStockMovement.bind(this));
    
    // Asset Events
    this.eventHandlers.set('asset.maintenance', this.handleAssetMaintenance.bind(this));
    this.eventHandlers.set('utility.bill', this.handleUtilityBill.bind(this));
    
    // Purchase Events
    this.eventHandlers.set('purchase.received', this.handlePurchaseReceived.bind(this));
    this.eventHandlers.set('supplier.invoice', this.handleSupplierInvoice.bind(this));
  }

  /**
   * Process an integration event
   */
  async processEvent(eventType, data, tenantId) {
    try {
      console.log(`Processing integration event: ${eventType}`, data);
      
      const handler = this.eventHandlers.get(eventType);
      if (!handler) {
        console.warn(`No handler found for event type: ${eventType}`);
        return { success: false, error: 'No handler found' };
      }

      const result = await handler(data, tenantId);
      
      // Log the integration event
      await this.logIntegrationEvent(eventType, data, result, tenantId);
      
      return { success: true, result };
    } catch (error) {
      console.error(`Error processing integration event ${eventType}:`, error);
      
      // Log the failed integration
      await this.logIntegrationEvent(eventType, data, { error: error.message }, tenantId);
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle wave completion - allocate labor costs
   */
  async handleWaveCompleted(data, tenantId) {
    const { waveId, totalTasks, totalTime, warehouseId } = data;
    
    // Calculate labor cost allocation
    const laborRate = 25.00; // $25/hour default rate
    const totalLaborCost = (totalTime / 60) * laborRate; // Convert minutes to hours
    
    // Create cost allocation entry
    const costAllocation = await prisma.costAllocation.create({
      data: {
        activityCenter: { connect: { id: await this.getWarehouseActivityCenter(warehouseId, tenantId) } },
        customer: null, // Will be allocated per shipment later
        service: 'PICKING',
        totalCost: totalLaborCost,
        unitCost: totalLaborCost / totalTasks,
        quantity: totalTasks,
        allocationDate: new Date(),
        tenantId,
        metadata: { waveId, totalTime, laborRate }
      }
    });

    // Create journal entry for labor expense
    const journalEntry = await this.createJournalEntry({
      description: `Labor cost allocation - Wave ${waveId}`,
      tenantId,
      entries: [
        {
          accountCode: '5100', // Labor Expense
          debit: totalLaborCost,
          credit: 0
        },
        {
          accountCode: '2100', // Accrued Payroll
          debit: 0,
          credit: totalLaborCost
        }
      ],
      metadata: { waveId, source: 'wave_completion' }
    });

    return { costAllocation, journalEntry };
  }

  /**
   * Handle shipment delivery - create invoice
   */
  async handleShipmentDelivered(data, tenantId) {
    const { shipmentId, clientId, serviceType, totalCost } = data;
    
    // Get shipment details
    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { client: true }
    });

    if (!shipment) {
      throw new Error('Shipment not found');
    }

    // Create enhanced invoice
    const invoice = await prisma.invoiceEnhanced.create({
      data: {
        invoiceNumber: `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
        customerId: clientId,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        subtotal: totalCost,
        taxAmount: totalCost * 0.08, // 8% tax
        totalAmount: totalCost * 1.08,
        status: 'SENT',
        billingType: 'SHIPMENT_BASED',
        serviceType: serviceType || 'TRANSPORTATION',
        tenantId,
        lineItems: {
          create: [{
            description: `Transportation services - Shipment ${shipment.reference || shipmentId}`,
            quantity: 1,
            unitPrice: totalCost,
            totalPrice: totalCost,
            serviceType: serviceType || 'TRANSPORTATION'
          }]
        }
      }
    });

    // Create journal entry for revenue recognition
    const journalEntry = await this.createJournalEntry({
      description: `Revenue recognition - Shipment ${shipmentId}`,
      tenantId,
      entries: [
        {
          accountCode: '1200', // Accounts Receivable
          debit: totalCost * 1.08,
          credit: 0
        },
        {
          accountCode: '4000', // Service Revenue
          debit: 0,
          credit: totalCost
        },
        {
          accountCode: '2300', // Sales Tax Payable
          debit: 0,
          credit: totalCost * 0.08
        }
      ],
      metadata: { shipmentId, invoiceId: invoice.id, source: 'shipment_delivery' }
    });

    return { invoice, journalEntry };
  }

  /**
   * Handle inventory received - update inventory valuation
   */
  async handleInventoryReceived(data, tenantId) {
    const { receiptId, items } = data;
    
    let totalValue = 0;
    const journalEntries = [];

    for (const item of items) {
      const itemValue = item.quantity * item.unitCost;
      totalValue += itemValue;

      // Update inventory item valuation
      await prisma.inventoryItem.updateMany({
        where: { 
          sku: item.sku,
          warehouseId: item.warehouseId
        },
        data: {
          averageCost: item.unitCost,
          totalValue: { increment: itemValue }
        }
      });
    }

    // Create journal entry for inventory increase
    const journalEntry = await this.createJournalEntry({
      description: `Inventory received - Receipt ${receiptId}`,
      tenantId,
      entries: [
        {
          accountCode: '1500', // Inventory Asset
          debit: totalValue,
          credit: 0
        },
        {
          accountCode: '2000', // Accounts Payable
          debit: 0,
          credit: totalValue
        }
      ],
      metadata: { receiptId, source: 'inventory_received' }
    });

    return { journalEntry, totalValue };
  }

  /**
   * Handle stock movement - calculate COGS
   */
  async handleStockMovement(data, tenantId) {
    const { movementId, movementType, items } = data;
    
    if (movementType !== 'OUTBOUND') {
      return { message: 'No COGS calculation needed for non-outbound movements' };
    }

    let totalCOGS = 0;
    for (const item of items) {
      const inventoryItem = await prisma.inventoryItem.findFirst({
        where: { 
          sku: item.sku,
          warehouseId: item.warehouseId
        }
      });

      if (inventoryItem) {
        const itemCOGS = item.quantity * inventoryItem.averageCost;
        totalCOGS += itemCOGS;
      }
    }

    // Create journal entry for COGS
    const journalEntry = await this.createJournalEntry({
      description: `Cost of Goods Sold - Movement ${movementId}`,
      tenantId,
      entries: [
        {
          accountCode: '5500', // Cost of Goods Sold
          debit: totalCOGS,
          credit: 0
        },
        {
          accountCode: '1500', // Inventory Asset
          debit: 0,
          credit: totalCOGS
        }
      ],
      metadata: { movementId, source: 'stock_movement' }
    });

    return { journalEntry, totalCOGS };
  }

  /**
   * Handle asset maintenance - expense allocation
   */
  async handleAssetMaintenance(data, tenantId) {
    const { workOrderId, assetId, totalCost, laborHours, partsUsed } = data;
    
    // Create expense record
    const expense = await prisma.expense.create({
      data: {
        description: `Asset maintenance - Work Order ${workOrderId}`,
        amount: totalCost,
        category: 'MAINTENANCE',
        expenseDate: new Date(),
        status: 'APPROVED',
        tenantId,
        metadata: { workOrderId, assetId, laborHours, partsUsed }
      }
    });

    // Create journal entry
    const journalEntry = await this.createJournalEntry({
      description: `Maintenance expense - Work Order ${workOrderId}`,
      tenantId,
      entries: [
        {
          accountCode: '5200', // Maintenance Expense
          debit: totalCost,
          credit: 0
        },
        {
          accountCode: '1000', // Cash or Accounts Payable
          debit: 0,
          credit: totalCost
        }
      ],
      metadata: { workOrderId, assetId, source: 'asset_maintenance' }
    });

    return { expense, journalEntry };
  }

  /**
   * Create a journal entry with validation
   */
  async createJournalEntry({ description, tenantId, entries, metadata = {} }) {
    // Validate that debits equal credits
    const totalDebits = entries.reduce((sum, entry) => sum + entry.debit, 0);
    const totalCredits = entries.reduce((sum, entry) => sum + entry.credit, 0);
    
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new Error('Journal entry debits must equal credits');
    }

    // Create the journal entry
    const journalEntry = await prisma.journalEntry.create({
      data: {
        entryNumber: await this.generateJournalEntryNumber(tenantId),
        description,
        entryDate: new Date(),
        status: 'POSTED', // Auto-post integration entries
        tenantId,
        totalAmount: totalDebits,
        metadata,
        generalLedgerEntries: {
          create: entries.map(entry => ({
            accountId: null, // Will be resolved by account code
            debitAmount: entry.debit,
            creditAmount: entry.credit,
            description: entry.description || description,
            tenantId,
            metadata: { accountCode: entry.accountCode }
          }))
        }
      },
      include: { generalLedgerEntries: true }
    });

    return journalEntry;
  }

  /**
   * Generate unique journal entry number
   */
  async generateJournalEntryNumber(tenantId) {
    const year = new Date().getFullYear();
    const count = await prisma.journalEntry.count({
      where: { 
        tenantId,
        entryDate: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`)
        }
      }
    });
    
    return `JE-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  /**
   * Get or create warehouse activity center
   */
  async getWarehouseActivityCenter(warehouseId, tenantId) {
    let activityCenter = await prisma.activityCenter.findFirst({
      where: { 
        name: `Warehouse-${warehouseId}`,
        tenantId
      }
    });

    if (!activityCenter) {
      activityCenter = await prisma.activityCenter.create({
        data: {
          name: `Warehouse-${warehouseId}`,
          description: `Activity center for warehouse ${warehouseId}`,
          activityType: 'WAREHOUSING',
          isActive: true,
          tenantId
        }
      });
    }

    return activityCenter.id;
  }

  /**
   * Log integration events for monitoring
   */
  async logIntegrationEvent(eventType, data, result, tenantId) {
    try {
      // This could be stored in a dedicated IntegrationLog table
      // For now, we'll use the existing audit log
      console.log(`Integration Event Logged: ${eventType}`, {
        data,
        result,
        tenantId,
        timestamp: new Date()
      });
      
      // TODO: Implement dedicated integration logging table
    } catch (error) {
      console.error('Error logging integration event:', error);
    }
  }

  /**
   * Batch reconciliation process
   */
  async runBatchReconciliation(tenantId, date = new Date()) {
    console.log(`Running batch reconciliation for tenant ${tenantId} on ${date}`);
    
    const results = {
      inventoryReconciliation: await this.reconcileInventoryValues(tenantId, date),
      costAllocationReconciliation: await this.reconcileCostAllocations(tenantId, date),
      revenueReconciliation: await this.reconcileRevenue(tenantId, date)
    };

    return results;
  }

  /**
   * Reconcile inventory values
   */
  async reconcileInventoryValues(tenantId, date) {
    // Compare system inventory values with GL balances
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: { warehouse: { companySettings: { tenantId } } }
    });

    const totalSystemInventory = inventoryItems.reduce((sum, item) => 
      sum + (item.quantity * item.averageCost), 0
    );

    // Get GL inventory balance
    const glBalance = await this.getAccountBalance('1500', tenantId); // Inventory account

    const variance = Math.abs(totalSystemInventory - glBalance);
    
    if (variance > 100) { // $100 threshold
      console.warn(`Inventory reconciliation variance: ${variance}`);
      // Create adjustment entry if needed
    }

    return { totalSystemInventory, glBalance, variance };
  }

  /**
   * Reconcile cost allocations
   */
  async reconcileCostAllocations(tenantId, date) {
    // Ensure all completed activities have cost allocations
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Check completed waves without cost allocations
    const unallocatedWaves = await prisma.wave.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: { gte: startOfDay, lte: endOfDay },
        // Add condition to check if cost allocation exists
      }
    });

    // Process any missing allocations
    for (const wave of unallocatedWaves) {
      await this.processEvent('wave.completed', {
        waveId: wave.id,
        totalTasks: wave.totalTasks || 10,
        totalTime: wave.totalTime || 120,
        warehouseId: wave.warehouseId
      }, tenantId);
    }

    return { processedWaves: unallocatedWaves.length };
  }

  /**
   * Reconcile revenue recognition
   */
  async reconcileRevenue(tenantId, date) {
    // Ensure all delivered shipments have invoices
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const deliveredShipments = await prisma.shipment.findMany({
      where: {
        status: 'DELIVERED',
        deliveredAt: { gte: startOfDay, lte: endOfDay }
      }
    });

    // Check for missing invoices
    let missingInvoices = 0;
    for (const shipment of deliveredShipments) {
      const invoice = await prisma.invoiceEnhanced.findFirst({
        where: {
          customerId: shipment.clientId,
          lineItems: {
            some: {
              description: { contains: shipment.id }
            }
          }
        }
      });

      if (!invoice) {
        missingInvoices++;
        // Auto-create missing invoice
        await this.processEvent('shipment.delivered', {
          shipmentId: shipment.id,
          clientId: shipment.clientId,
          serviceType: 'TRANSPORTATION',
          totalCost: this.calculateShipmentCost(shipment)
        }, tenantId);
      }
    }

    return { totalShipments: deliveredShipments.length, missingInvoices };
  }

  /**
   * Get account balance by account code
   */
  async getAccountBalance(accountCode, tenantId) {
    const account = await prisma.chartOfAccounts.findFirst({
      where: { accountCode, tenantId }
    });

    if (!account) return 0;

    const entries = await prisma.generalLedger.findMany({
      where: { accountId: account.id }
    });

    return entries.reduce((balance, entry) => 
      balance + entry.debitAmount - entry.creditAmount, 0
    );
  }

  /**
   * Calculate shipment cost (simplified)
   */
  calculateShipmentCost(shipment) {
    const baseCost = 50; // Base transportation cost
    const weightCost = shipment.weight * 0.5; // $0.50 per pound
    const distanceCost = 0.10 * 100; // Assume 100 miles * $0.10
    
    return baseCost + weightCost + distanceCost;
  }

  /**
   * Handle pick completion - allocate labor costs per pick task
   */
  async handlePickCompleted(data, tenantId) {
    const { pickListId, totalTasks = 0, totalTime = 0, warehouseId } = data;

    if (!totalTasks || totalTasks === 0) {
      console.warn('handlePickCompleted called with zero tasks');
      return { warning: 'No tasks to allocate' };
    }

    // Calculate labor cost allocation
    const laborRate = 25.0; // $25/hour default rate
    const totalLaborCost = (totalTime / 60) * laborRate; // minutes to hours

    // Cost allocation record
    const costAllocation = await prisma.costAllocation.create({
      data: {
        activityCenter: { connect: { id: await this.getWarehouseActivityCenter(warehouseId, tenantId) } },
        service: 'PICKING',
        totalCost: totalLaborCost,
        unitCost: totalLaborCost / totalTasks,
        quantity: totalTasks,
        allocationDate: new Date(),
        tenantId,
        metadata: { pickListId, totalTime, laborRate }
      }
    });

    // Journal entry for labor expense
    const journalEntry = await this.createJournalEntry({
      description: `Labor cost allocation - PickList ${pickListId}`,
      tenantId,
      entries: [
        {
          accountCode: '5100', // Labor Expense
          debit: totalLaborCost,
          credit: 0
        },
        {
          accountCode: '2100', // Accrued Payroll
          debit: 0,
          credit: totalLaborCost
        }
      ],
      metadata: { pickListId, source: 'pick_completion' }
    });

    return { costAllocation, journalEntry };
  }

  /**
   * Handle pack completion - allocate labor costs per pack task
   */
  async handlePackCompleted(data, tenantId) {
    const { packingSlipId, totalTasks = 0, totalTime = 0, warehouseId } = data;

    if (!totalTasks || totalTasks === 0) {
      console.warn('handlePackCompleted called with zero tasks');
      return { warning: 'No tasks to allocate' };
    }

    // Calculate labor cost allocation
    const laborRate = 25.0; // $25/hour default rate
    const totalLaborCost = (totalTime / 60) * laborRate;

    // Cost allocation record
    const costAllocation = await prisma.costAllocation.create({
      data: {
        activityCenter: { connect: { id: await this.getWarehouseActivityCenter(warehouseId, tenantId) } },
        service: 'PACKING',
        totalCost: totalLaborCost,
        unitCost: totalLaborCost / totalTasks,
        quantity: totalTasks,
        allocationDate: new Date(),
        tenantId,
        metadata: { packingSlipId, totalTime, laborRate }
      }
    });

    // Journal entry for labor expense
    const journalEntry = await this.createJournalEntry({
      description: `Labor cost allocation - PackingSlip ${packingSlipId}`,
      tenantId,
      entries: [
        {
          accountCode: '5100',
          debit: totalLaborCost,
          credit: 0
        },
        {
          accountCode: '2100',
          debit: 0,
          credit: totalLaborCost
        }
      ],
      metadata: { packingSlipId, source: 'pack_completion' }
    });

    return { costAllocation, journalEntry };
  }

  /**
   * Handle inventory adjusted - update inventory and post adjustment entry
   */
  async handleInventoryAdjusted(data, tenantId) {
    const {
      adjustmentId,
      sku,
      warehouseId,
      quantity = 0,
      unitCost = 0,
      notes = ''
    } = data;

    if (!quantity || quantity === 0) {
      console.warn('handleInventoryAdjusted called with zero quantity');
      return { warning: 'No quantity adjustment' };
    }

    const adjustmentValue = quantity * unitCost;
    const isIncrease = quantity > 0;

    // Update inventory valuation (average cost simplified)
    await prisma.inventoryItem.upsert({
      where: {
        sku_warehouseId: {
          sku,
          warehouseId
        }
      },
      update: {
        quantity: { increment: quantity },
        totalValue: { increment: adjustmentValue },
        averageCost: unitCost
      },
      create: {
        sku,
        warehouseId,
        quantity: quantity,
        totalValue: adjustmentValue,
        averageCost: unitCost,
        tenantId
      }
    });

    // Create journal entry
    const journalEntry = await this.createJournalEntry({
      description: `Inventory adjustment ${adjustmentId || ''}`.trim(),
      tenantId,
      entries: [
        {
          accountCode: '1500', // Inventory Asset
          debit: isIncrease ? Math.abs(adjustmentValue) : 0,
          credit: isIncrease ? 0 : Math.abs(adjustmentValue)
        },
        {
          accountCode: '5100', // Inventory Adjustments Expense
          debit: isIncrease ? 0 : Math.abs(adjustmentValue),
          credit: isIncrease ? Math.abs(adjustmentValue) : 0
        }
      ],
      metadata: { adjustmentId, sku, warehouseId, notes, source: 'inventory_adjusted' }
    });

    return { journalEntry, adjustmentValue };
  }

  /**
   * Handle utility bill - post utilities expense
   */
  async handleUtilityBill(data, tenantId) {
    const { utilityBillId, utilityType = 'ELECTRICITY', amount = 0, billingPeriod } = data;

    if (!amount || amount === 0) {
      console.warn('handleUtilityBill called with zero amount');
      return { warning: 'No amount posted' };
    }

    // Create expense record
    const expense = await prisma.expense.create({
      data: {
        description: `Utility bill (${utilityType}) - ${billingPeriod || ''}`.trim(),
        amount,
        category: 'UTILITIES',
        expenseDate: new Date(),
        status: 'APPROVED',
        tenantId,
        metadata: { utilityBillId, utilityType, billingPeriod }
      }
    });

    // Journal entry (Utilities Expense ↔ Accounts Payable)
    const journalEntry = await this.createJournalEntry({
      description: `Utility bill (${utilityType})`,
      tenantId,
      entries: [
        {
          accountCode: '6400', // Utilities Expense
          debit: amount,
          credit: 0
        },
        {
          accountCode: '2000', // Accounts Payable
          debit: 0,
          credit: amount
        }
      ],
      metadata: { utilityBillId, source: 'utility_bill' }
    });

    return { expense, journalEntry };
  }

  /**
   * Handle purchase received - accrue inventory & A/P
   */
  async handlePurchaseReceived(data, tenantId) {
    const { purchaseOrderId, items = [] } = data;

    let totalValue = 0;
    for (const item of items) {
      const itemValue = item.quantity * item.unitCost;
      totalValue += itemValue;

      // Update inventory valuation
      await prisma.inventoryItem.upsert({
        where: {
          sku_warehouseId: {
            sku: item.sku,
            warehouseId: item.warehouseId
          }
        },
        update: {
          quantity: { increment: item.quantity },
          totalValue: { increment: itemValue },
          averageCost: item.unitCost
        },
        create: {
          sku: item.sku,
          warehouseId: item.warehouseId,
          quantity: item.quantity,
          totalValue: itemValue,
          averageCost: item.unitCost,
          tenantId
        }
      });
    }

    // Journal entry: Inventory Asset / Accounts Payable
    const journalEntry = await this.createJournalEntry({
      description: `Purchase received - PO ${purchaseOrderId}`,
      tenantId,
      entries: [
        {
          accountCode: '1500', // Inventory Asset
          debit: totalValue,
          credit: 0
        },
        {
          accountCode: '2000', // Accounts Payable
          debit: 0,
          credit: totalValue
        }
      ],
      metadata: { purchaseOrderId, source: 'purchase_received' }
    });

    return { journalEntry, totalValue };
  }

  /**
   * Handle supplier invoice - create A/P invoice
   */
  async handleSupplierInvoice(data, tenantId) {
    const {
      supplierId,
      invoiceNumber,
      amount = 0,
      description = 'Supplier invoice',
      dueDate
    } = data;

    if (!amount || amount === 0) {
      console.warn('handleSupplierInvoice called with zero amount');
      return { warning: 'No amount posted' };
    }

    // Create supplier invoice record (simplified)
    const supplierInvoice = await prisma.supplierInvoice.create({
      data: {
        invoiceNumber,
        supplierId,
        amount,
        status: 'OPEN',
        invoiceDate: new Date(),
        dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        tenantId,
        description
      }
    });

    // Journal entry: Expense / Accounts Payable (assume expense for now)
    const journalEntry = await this.createJournalEntry({
      description: `Supplier invoice ${invoiceNumber}`,
      tenantId,
      entries: [
        {
          accountCode: '5000', // Cost of Goods Sold / Expense placeholder
          debit: amount,
          credit: 0
        },
        {
          accountCode: '2000', // Accounts Payable
          debit: 0,
          credit: amount
        }
      ],
      metadata: { supplierId, invoiceNumber, source: 'supplier_invoice' }
    });

    return { supplierInvoice, journalEntry };
  }
}

module.exports = new IntegrationService(); 