require('dotenv').config();
const express = require('express');
const cors = require('cors');
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

const app = express();
app.use(cors());
app.use(express.json());
if (morgan) app.use(morgan('dev'));

// Mount routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/shipments', shipmentRoutes);
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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});