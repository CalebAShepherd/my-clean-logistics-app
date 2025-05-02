require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const shipmentRoutes = require('./routes/shipments');
const carriersRouter = require('./routes/carriers');
const companySettingsRouter = require('./routes/companySettings');
const warehousesRouter = require('./routes/warehouses');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/shipments', shipmentRoutes);
app.use('/carriers', carriersRouter);
app.use('/company-settings', companySettingsRouter);
app.use('/warehouses', warehousesRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});