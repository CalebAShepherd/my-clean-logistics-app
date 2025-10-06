require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketService = require('./services/socketService');
let morgan;
try { morgan = require('morgan'); } catch (e) { morgan = null; }

// Route imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const shipmentRoutes = require('./routes/shipments');
const carriersRouter = require('./routes/carriers');
const companySettingsRouter = require('./routes/companySettings');
const warehousesRouter = require('./routes/warehouses');
const analyticsRouter = require('./routes/analytics');
const warehouseItemsRouter = require('./routes/warehouseItems');
const locationsRouter = require('./routes/locations');
const outboundShipmentsRouter = require('./routes/outboundShipments');
const inboundShipmentsRouter = require('./routes/inboundShipments');
const inventoryItemsRouter = require('./routes/inventoryItems');
const dockSchedulesRouter = require('./routes/dockSchedules');
const damageReportsRouter = require('./routes/damageReports');
const transferOrdersRouter = require('./routes/transferOrders');
const stockMovementsRouter = require('./routes/stockMovements');
const offersRouter = require('./routes/offers');
const routesRouter = require('./routes/routes');
const documentsRouter = require('./routes/documents');
const notificationsRouter = require('./routes/notifications');
const announcementsRouter = require('./routes/announcements');
const messagesRouter = require('./routes/messages');
const skuAttributesRouter = require('./routes/skuAttributes');
const suppliersRouter = require('./routes/suppliers');
const wavesRouter = require('./routes/waves');
const pickListsRouter = require('./routes/pickLists');
const packingRouter = require('./routes/packing');
// Phase 5: Compliance & Audit Routes
const auditTrailRouter = require('./routes/auditTrail');
const soxComplianceRouter = require('./routes/soxCompliance');
const insuranceClaimsRouter = require('./routes/insuranceClaims');
// Phase 3: Receiving & Put-Away Operations
const asnRouter = require('./routes/asns');
const receivingRouter = require('./routes/receiving');
const putAwayRouter = require('./routes/putaway');
const dockRouter = require('./routes/dock');
const crossdockRouter = require('./routes/crossdock');
const cycleCountRouter = require('./routes/cycleCountRoutes');
const warehouseWorkerRouter = require('./routes/warehouseWorker');
const loadingTasksRouter = require('./routes/loadingTasks');
// ERP Routes
const financialRouter = require('./routes/financial');
const billingRouter = require('./routes/billing');
const expensesRouter = require('./routes/expenses');
// Phase 2: Procurement Routes
const purchaseRequisitionsRouter = require('./routes/purchaseRequisitions');
const purchaseOrdersRouter = require('./routes/purchaseOrders');
const vendorScorecardsRouter = require('./routes/vendorScorecards');
// Phase 3: Asset & Maintenance Management Routes
const assetsRouter = require('./routes/assets');
const maintenanceRouter = require('./routes/maintenance');
const facilitiesRouter = require('./routes/facilities');
// Phase 3.2: Facility Maintenance & Compliance Routes
const facilityMaintenanceRouter = require('./routes/facilityMaintenance');
// Phase 3.2: Space Optimization Routes
const spaceOptimizationRouter = require('./routes/spaceOptimization');
// Phase 4: Advanced Cost Management Routes
const activityBasedCostingRouter = require('./routes/activityBasedCosting');
const budgetingForecastingRouter = require('./routes/budgetingForecasting');
// Phase 5: Advanced Compliance & Risk Management Routes
const documentManagementRouter = require('./routes/documentManagement');
const complianceReportingRouter = require('./routes/complianceReporting');
const riskAssessmentRouter = require('./routes/riskAssessment');
// Phase 6: Integration & Optimization Routes
const integrationRouter = require('./routes/integration');
// Financial Reporting Routes
const financialReportingRouter = require('./routes/financialReporting');
// New floorplan router
const floorplanRouter = require('./routes/floorplan');
const blueprintRouter = require('./routes/blueprints');
const operationsRouter = require('./routes/operations');
const eventsRouter = require('./routes/events');

// CRM Routes
const crmAccountsRouter = require('./routes/crmAccounts');
const crmLeadsRouter = require('./routes/crmLeads');
const crmTasksRouter = require('./routes/crmTasks');
const crmTicketsRouter = require('./routes/crmTickets');
const crmQuotesRouter = require('./routes/crmQuotes');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
if (morgan) app.use(morgan('dev'));

// Initialize scheduled notification jobs (late shipment alerts)
require('./jobs/notificationJobs');
// Initialize scheduled warehouse report job (daily summaries)
require('./jobs/warehouseReportJob');
// Initialize integration batch processing jobs
require('./jobs/integrationJobs');
// Initialize depreciation job (monthly asset depreciation)
const { initializeDepreciationJob } = require('./jobs/depreciationJob');
initializeDepreciationJob();
// Initialize document expiry reminder job
require('./jobs/documentExpiryReminderJob');
// Initialize pickup reminder job
require('./jobs/pickupReminderJob');

// Mount routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/carriers', carriersRouter);
app.use('/company-settings', companySettingsRouter);
app.use('/warehouses', warehousesRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/warehouse-items', warehouseItemsRouter);
app.use('/locations', locationsRouter);
app.use('/outbound-shipments', outboundShipmentsRouter);
app.use('/inbound-shipments', inboundShipmentsRouter);
app.use('/inventory-items', inventoryItemsRouter);
app.use('/dock-schedules', dockSchedulesRouter);
app.use('/damage-reports', damageReportsRouter);
app.use('/transfer-orders', transferOrdersRouter);
app.use('/stock-movements', stockMovementsRouter);
app.use('/offers', offersRouter);
app.use('/routes', routesRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/announcements', announcementsRouter);
app.use('/api', messagesRouter);
app.use('/api', documentsRouter);
app.use('/sku-attributes', skuAttributesRouter);
app.use('/suppliers', suppliersRouter);
app.use('/waves', wavesRouter);
app.use('/pick-lists', pickListsRouter);
app.use('/packing', packingRouter);
// Phase 5: Compliance & Audit Routes
app.use('/api/audit-trail', auditTrailRouter);
app.use('/api/sox-compliance', soxComplianceRouter);
app.use('/api/insurance-claims', insuranceClaimsRouter);
// Phase 3: Receiving & Put-Away Operations
app.use('/asns', asnRouter);
app.use('/receiving', receivingRouter);
app.use('/putaway', putAwayRouter);
app.use('/dock', dockRouter);
app.use('/crossdock', crossdockRouter);
app.use('/cycle-counts', cycleCountRouter);
app.use('/warehouse-worker', warehouseWorkerRouter);
app.use('/loading-tasks', loadingTasksRouter);
// ERP Routes
app.use('/api/financial', financialRouter);
app.use('/api/billing', billingRouter);
app.use('/api/expenses', expensesRouter);
// Phase 2: Procurement Routes
app.use('/purchase-requisitions', purchaseRequisitionsRouter);
app.use('/purchase-orders', purchaseOrdersRouter);
app.use('/vendor-scorecards', vendorScorecardsRouter);
// Phase 3: Asset & Maintenance Management Routes
app.use('/assets', assetsRouter);
app.use('/maintenance', maintenanceRouter);
app.use('/api/facilities', facilitiesRouter);
// Phase 3.2: Facility Maintenance & Compliance Routes
app.use('/api/facility-maintenance', facilityMaintenanceRouter);
// Phase 3.2: Space Optimization Routes
app.use('/space-optimization', spaceOptimizationRouter);
// Phase 4: Advanced Cost Management Routes
app.use('/api/activity-based-costing', activityBasedCostingRouter);
app.use('/api/budgeting-forecasting', budgetingForecastingRouter);
// Phase 5: Advanced Compliance & Risk Management Routes
app.use('/api/document-management', documentManagementRouter);
app.use('/api/compliance-reporting', complianceReportingRouter);
app.use('/api/risk-assessment', riskAssessmentRouter);
// Phase 6: Integration & Optimization Routes
app.use('/api/integration', integrationRouter);
// Financial Reporting Routes
app.use('/api/financial-reporting', financialReportingRouter);
// New floorplan router
app.use('/api/floorplan', floorplanRouter);
app.use('/api/blueprints', blueprintRouter);
// Optimizer integration
app.use('/api/operations', operationsRouter);
app.use('/api/events', eventsRouter);

// CRM Mounts
app.use('/api/crm/accounts', crmAccountsRouter);
app.use('/api/crm/leads', crmLeadsRouter);
app.use('/api/crm/tasks', crmTasksRouter);
app.use('/api/crm/tickets', crmTicketsRouter);
app.use('/api/crm/quotes', crmQuotesRouter);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

// Create HTTP server and initialize Socket.IO
const server = http.createServer(app);
socketService.init(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`WebSocket server initialized`);
});