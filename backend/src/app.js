const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();

// CORS — restrict to an explicit allowlist via CORS_ORIGINS env (comma-separated).
// Default to common local dev origins so the SPAs keep working out of the box.
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS ||
  'http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    // Allow same-origin / non-browser clients (no Origin header) and explicit allowlist
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error('Origin not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
};

// Security & parsing
app.use(helmet({
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: false },
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// Public API — mounted before restricted CORS so customer phones can reach it
app.use('/api/public', require('./public/public.router'));

app.use(cors(corsOptions));

// Health check
app.get('/health', (req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() }),
);

// Routers
app.use('/admin',           require('./admin/admin.router'));
app.use('/api/auth',        require('./auth/auth.router'));
app.use('/api/restaurants', require('./restaurants/restaurants.router'));
app.use('/api/menu',        require('./menu/menu.router'));
app.use('/api/tables',      require('./tables/tables.router'));
app.use('/api/orders',      require('./orders/orders.router'));
app.use('/api/payments',    require('./payments/payments.router'));
app.use('/api/kitchen',     require('./kitchen/kitchen.router'));
app.use('/api/reports',      require('./reports/reports.router'));
app.use('/api/settings',     require('./settings/settings.router'));
app.use('/api/shift',        require('./shift/shift.router'));
app.use('/api/ingredients',  require('./ingredients/ingredients.router'));
app.use('/api/recipes',      require('./recipes/recipes.router'));
app.use('/api/combos',       require('./combos/combos.router'));
app.use('/api/modifiers',    require('./modifiers/modifiers.router'));
app.use('/api/waste',        require('./waste/waste.router'));
app.use('/api/inventory',    require('./inventory/inventory.router'));
app.use('/api/notifications',  require('./notifications/notifications.router'));
app.use('/api/reservations',  require('./reservations/reservations.router'));
app.use('/api/loyalty',       require('./loyalty/loyalty.router'));
app.use('/api/coupons',       require('./coupons/coupons.router'));

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
const { AppError } = require('./shared/errors');
app.use((err, req, res, next) => {
  const isProd = process.env.NODE_ENV === 'production';

  // Origin rejection from cors()
  if (err && err.message === 'Origin not allowed') {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  // Only AppErrors are safe to expose verbatim. Everything else gets a generic
  // message in production to avoid leaking framework / DB internals.
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  console.error(err);
  const status  = err.statusCode && err.statusCode < 500 ? err.statusCode : 500;
  const message = isProd ? 'Internal server error' : (err.message || 'Internal server error');
  res.status(status).json({ error: message });
});

module.exports = app;
