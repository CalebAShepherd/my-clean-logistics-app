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
// Phase 3: Receiving & Put-Away Operations
const asnRouter = require('./routes/asns');
const receivingRouter = require('./routes/receiving');
const putAwayRouter = require('./routes/putaway');
const dockRouter = require('./routes/dock');
const crossdockRouter = require('./routes/crossdock');
const cycleCountRouter = require('./routes/cycleCountRoutes');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
if (morgan) app.use(morgan('dev'));

// Initialize scheduled notification jobs (late shipment alerts)
require('./jobs/notificationJobs');
// Initialize scheduled warehouse report job (daily summaries)
require('./jobs/warehouseReportJob');

// Mount routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/carriers', carriersRouter);
app.use('/company-settings', companySettingsRouter);
app.use('/warehouses', warehousesRouter);
app.use('/analytics', analyticsRouter);
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
// Phase 3: Receiving & Put-Away Operations
app.use('/asns', asnRouter);
app.use('/receiving', receivingRouter);
app.use('/putaway', putAwayRouter);
app.use('/dock', dockRouter);
app.use('/crossdock', crossdockRouter);
app.use('/cycle-counts', cycleCountRouter);

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