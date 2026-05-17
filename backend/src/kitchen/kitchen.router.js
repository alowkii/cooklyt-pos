const router = require('express').Router();
const service = require('./kitchen.service');
const { authenticate, authorize } = require('../shared/middleware/auth');

router.get('/queue', authenticate, authorize('admin', 'kitchen', 'staff', 'cashier'), async (req, res, next) => {
  try {
    res.json(await service.getKitchenQueue(req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.patch('/:orderId/preparing', authenticate, async (req, res, next) => {
  try {
    res.json(await service.markOrderPreparing(req.params.orderId, req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.patch('/:orderId/ready', authenticate, async (req, res, next) => {
  try {
    res.json(await service.markOrderReady(req.params.orderId, req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.patch('/:orderId/served', authenticate, async (req, res, next) => {
  try {
    res.json(await service.markOrderServed(req.params.orderId, req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

module.exports = router;
