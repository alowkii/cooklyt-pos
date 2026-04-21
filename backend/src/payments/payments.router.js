const router = require('express').Router();
const service = require('./payments.service');
const { authenticate } = require('../shared/middleware/auth');

router.post('/:orderId', authenticate, async (req, res, next) => {
  try {
    res.json(await service.processPayment(req.params.orderId, req.body, req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.get('/:orderId/receipt', authenticate, async (req, res, next) => {
  try {
    res.json(await service.getReceipt(req.params.orderId, req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.get('/:orderId/bill', authenticate, async (req, res, next) => {
  try {
    res.json(await service.getBill(req.params.orderId, req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.get('/:orderId', authenticate, async (req, res, next) => {
  try {
    res.json(await service.getPaymentsForOrder(req.params.orderId, req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

module.exports = router;
