const router = require('express').Router();
const service = require('./orders.service');
const { authenticate, authorize } = require('../shared/middleware/auth');

// Must be declared before /:id so "history" is not consumed as an id param
router.get('/history', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { from, to, status, channel } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'from and to dates are required' });
    res.json(await service.getHistory(req.user.restaurantId, { from, to, status, channel }));
  } catch (e) {
    next(e);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    res.json(await service.getById(req.params.id, req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.get('/table/:tableId', authenticate, async (req, res, next) => {
  try {
    res.json(await service.getActiveByTable(req.params.tableId, req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.post('/', authenticate, authorize('admin', 'staff'), async (req, res, next) => {
  try {
    const { tableId, items, channel, customerRef } = req.body;
    const order = await service.createOrder({
      restaurantId: req.user.restaurantId,
      tableId,
      createdBy:   req.user.userId,
      items,
      channel:     channel     || 'dining',
      customerRef: customerRef || null,
    });
    res.status(201).json(order);
  } catch (e) {
    next(e);
  }
});

router.post('/:id/items', authenticate, async (req, res, next) => {
  try {
    res.json(await service.addItems(req.params.id, req.body.items, req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.patch('/:id/status', authenticate, async (req, res, next) => {
  try {
    res.json(await service.updateStatus(req.params.id, req.body.status, req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.patch('/:id/discount', authenticate, authorize('admin', 'staff'), async (req, res, next) => {
  try {
    const { discountType, discountValue } = req.body;
    res.json(await service.applyDiscount(req.params.id, discountType ?? null, discountValue ?? 0, req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

module.exports = router;
