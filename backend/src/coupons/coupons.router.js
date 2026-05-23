const router = require('express').Router();
const service = require('./coupons.service');
const { authenticate, authorize } = require('../shared/middleware/auth');

// Preview a coupon (no side effects) — cashier + admin
router.get('/preview', authenticate, authorize('admin', 'staff', 'cashier'), async (req, res, next) => {
  try {
    const { code, subtotal } = req.query;
    res.json(await service.previewCoupon(req.user.restaurantId, code, subtotal));
  } catch (e) { next(e); }
});

// List coupons — admin
router.get('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    res.json(await service.listCoupons(req.user.restaurantId, req.query));
  } catch (e) { next(e); }
});

// Create coupon — admin
router.post('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    res.status(201).json(await service.createCoupon(req.user.restaurantId, req.body));
  } catch (e) { next(e); }
});

// Get single coupon — admin
router.get('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    res.json(await service.getCoupon(req.user.restaurantId, req.params.id));
  } catch (e) { next(e); }
});

// Update coupon — admin
router.patch('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    res.json(await service.updateCoupon(req.user.restaurantId, req.params.id, req.body));
  } catch (e) { next(e); }
});

// Delete coupon — admin
router.delete('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    await service.deleteCoupon(req.user.restaurantId, req.params.id);
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
