const router = require('express').Router();
const service = require('./orders.service');
const { authenticate, authorize } = require('../shared/middleware/auth');
const audit = require('../shared/audit');

const pos = (req) => ({ actorType: 'user', actorId: req.user.userId, restaurantId: req.user.restaurantId });

// Must be declared before /:id so "history" is not consumed as an id param
router.get('/history', authenticate, authorize('admin', 'staff', 'cashier'), async (req, res, next) => {
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
    const { tableId, items, channel, customerRef, assignedStaffId } = req.body;
    const order = await service.createOrder({
      restaurantId:    req.user.restaurantId,
      tableId,
      createdBy:       req.user.userId,
      items,
      channel:         channel          || 'dining',
      customerRef:     customerRef      || null,
      assignedStaffId: assignedStaffId  || req.user.userId,
    });
    const loc = (channel === 'dining' || !channel)
      ? (tableId ? `table ${tableId}` : 'dine-in')
      : (customerRef || channel);
    audit.log({ ...pos(req), action: 'create', resourceType: 'order', resourceId: order.id, description: `Created ${channel || 'dining'} order (${loc}) — ${items.length} item(s)` });
    res.status(201).json(order);
  } catch (e) {
    next(e);
  }
});

router.post('/:id/items', authenticate, authorize('admin', 'staff'), async (req, res, next) => {
  try {
    res.json(await service.addItems(req.params.id, req.body.items, req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.patch('/:id/items/:itemId/status', authenticate, authorize('admin', 'staff', 'kitchen'), async (req, res, next) => {
  try {
    res.json(await service.updateItemStatus(req.params.id, req.params.itemId, req.body.status, req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.post('/:id/cancel-pending', authenticate, authorize('admin', 'staff'), async (req, res, next) => {
  try {
    res.json(await service.cancelPendingItems(req.params.id, req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.patch('/:id/status', authenticate, authorize('admin', 'staff', 'kitchen'), async (req, res, next) => {
  try {
    const updated = await service.updateStatus(req.params.id, req.body.status, req.user.restaurantId);
    audit.log({ ...pos(req), action: 'update', resourceType: 'order', resourceId: req.params.id, description: `Order status → ${req.body.status}` });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

router.patch('/:id/assign', authenticate, authorize('admin', 'staff'), async (req, res, next) => {
  try {
    const staffId = req.body.staffId ?? null;
    const result = await service.assignStaff(req.params.id, staffId, req.user.restaurantId);
    audit.log({ ...pos(req), action: 'update', resourceType: 'order', resourceId: req.params.id, description: staffId ? `Assigned staff ${staffId} to order` : 'Removed staff assignment from order' });
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.patch('/:id/discount', authenticate, authorize('admin', 'staff'), async (req, res, next) => {
  try {
    const { discountType, discountValue } = req.body;
    const updated = await service.applyDiscount(req.params.id, discountType ?? null, discountValue ?? 0, req.user.restaurantId);
    const desc = discountType
      ? `Applied ${discountType === 'percent' ? `${discountValue}%` : `flat ${discountValue}`} discount to order`
      : 'Removed discount from order';
    audit.log({ ...pos(req), action: 'update', resourceType: 'order', resourceId: req.params.id, description: desc });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
