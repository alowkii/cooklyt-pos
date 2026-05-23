const router = require('express').Router();
const service = require('./loyalty.service');
const { authenticate, authorize } = require('../shared/middleware/auth');

// Lookup by phone — cashier + admin
router.get('/customers/lookup', authenticate, authorize('admin', 'staff', 'cashier'), async (req, res, next) => {
  try {
    const customer = await service.lookupCustomer(req.user.restaurantId, req.query.phone);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (e) { next(e); }
});

// List all customers — admin only
router.get('/customers', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { search, limit, offset } = req.query;
    res.json(await service.listCustomers(req.user.restaurantId, {
      search, limit: parseInt(limit) || 50, offset: parseInt(offset) || 0,
    }));
  } catch (e) { next(e); }
});

// Get or create customer — cashier + admin
router.post('/customers', authenticate, authorize('admin', 'staff', 'cashier'), async (req, res, next) => {
  try {
    const { phone, name } = req.body;
    res.json(await service.getOrCreateCustomer(req.user.restaurantId, phone, name));
  } catch (e) { next(e); }
});

// Get single customer — admin
router.get('/customers/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    res.json(await service.getCustomer(req.user.restaurantId, req.params.id));
  } catch (e) { next(e); }
});

// Transaction history — admin
router.get('/customers/:id/transactions', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { limit, offset } = req.query;
    res.json(await service.getTransactionHistory(req.user.restaurantId, req.params.id, {
      limit: parseInt(limit) || 30, offset: parseInt(offset) || 0,
    }));
  } catch (e) { next(e); }
});

// Manual points adjustment — admin
router.patch('/customers/:id/adjust', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { points, description } = req.body;
    res.json(await service.adjustPoints(req.user.restaurantId, req.params.id, points, description));
  } catch (e) { next(e); }
});

module.exports = router;
