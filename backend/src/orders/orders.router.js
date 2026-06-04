const router = require('express').Router();
const service = require('./orders.service');
const db      = require('../shared/db');
const settingsRepo = require('../settings/settings.repository');
const { authenticate, authorize } = require('../shared/middleware/auth');
const audit = require('../shared/audit');

const pos = (req) => ({ actorType: 'user', actorId: req.user.userId, restaurantId: req.user.restaurantId });

// Must be declared before /:id so "history" is not consumed as an id param
router.get('/history', authenticate, authorize('admin', 'staff', 'cashier'), async (req, res, next) => {
  try {
    const { from, to, status, channel, timezone } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'from and to dates are required' });
    res.json(await service.getHistory(req.user.restaurantId, { from, to, status, channel, timezone }));
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

router.get('/:id/items', authenticate, async (req, res, next) => {
  try {
    res.json(await service.getItems(req.params.id, req.user.restaurantId));
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
    const settings = await settingsRepo.getAll(req.user.restaurantId);
    if (settings.restaurant_open === 'false') {
      return res.status(403).json({ error: 'Restaurant is currently closed — new orders are paused' });
    }
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
    const { status, actionType, cancelReason } = req.body;
    res.json(await service.updateItemStatus(req.params.id, req.params.itemId, status, req.user.restaurantId, actionType, cancelReason));
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

router.patch('/:id/coupon', authenticate, authorize('admin', 'staff', 'cashier'), async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'code is required' });
    const updated = await service.applyCoupon(req.params.id, code, req.user.restaurantId);
    res.json(updated);
  } catch (e) { next(e); }
});

router.delete('/:id/coupon', authenticate, authorize('admin', 'staff', 'cashier'), async (req, res, next) => {
  try {
    const updated = await service.removeCoupon(req.params.id, req.user.restaurantId);
    res.json(updated);
  } catch (e) { next(e); }
});

router.patch('/:id/loyalty', authenticate, authorize('admin', 'staff', 'cashier'), async (req, res, next) => {
  try {
    const { phone, pointsToRedeem } = req.body;
    if (!phone) return res.status(400).json({ error: 'phone is required' });
    const updated = await service.applyLoyalty(req.params.id, phone, pointsToRedeem ?? 0, req.user.restaurantId);
    res.json(updated);
  } catch (e) { next(e); }
});

router.delete('/:id/loyalty', authenticate, authorize('admin', 'staff', 'cashier'), async (req, res, next) => {
  try {
    const updated = await service.removeLoyalty(req.params.id, req.user.restaurantId);
    res.json(updated);
  } catch (e) { next(e); }
});

// Link/unlink a loyalty customer on all orders sharing the same table session.
router.patch('/:id/customer', authenticate, authorize('admin', 'staff', 'cashier'), async (req, res, next) => {
  try {
    const { loyaltyCustomerId } = req.body;
    // Resolve the session so we can update all rounds together.
    const { rows: [order] } = await db.query(
      'SELECT table_session_id FROM orders WHERE id = $1 AND restaurant_id = $2',
      [req.params.id, req.user.restaurantId],
    );
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.table_session_id) {
      await db.query(
        'UPDATE orders SET loyalty_customer_id = $1 WHERE table_session_id = $2 AND restaurant_id = $3',
        [loyaltyCustomerId || null, order.table_session_id, req.user.restaurantId],
      );
    } else {
      await db.query(
        'UPDATE orders SET loyalty_customer_id = $1 WHERE id = $2 AND restaurant_id = $3',
        [loyaltyCustomerId || null, req.params.id, req.user.restaurantId],
      );
    }
    res.json({ success: true });
  } catch (e) { next(e); }
});

module.exports = router;
