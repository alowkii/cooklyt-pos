const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
require('dotenv').config();

const app = express();

// Security & parsing
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() }),
);

// Routers
app.use('/api/auth',        require('./auth/auth.router'));
app.use('/api/restaurants', require('./restaurants/restaurants.router'));
app.use('/api/menu',        require('./menu/menu.router'));
app.use('/api/tables',      require('./tables/tables.router'));
app.use('/api/orders',      require('./orders/orders.router'));
app.use('/api/payments',    require('./payments/payments.router'));
app.use('/api/kitchen',     require('./kitchen/kitchen.router'));
app.use('/api/reports',     require('./reports/reports.router'));
app.use('/api/settings',    require('./settings/settings.router'));

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  const status  = err.statusCode || 500;
  const message = err.message    || 'Internal server error';

  if (status === 500) console.error(err);

  res.status(status).json({ error: message });
});

module.exports = app;
