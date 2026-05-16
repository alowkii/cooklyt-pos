const router = require('express').Router();
const service = require('./payments.service');
const { authenticate } = require('../shared/middleware/auth');
const audit = require('../shared/audit');

router.post('/:orderId/split', authenticate, async (req, res, next) => {
  try {
    const result = await service.processSplitPayment(req.params.orderId, req.body, req.user.restaurantId);
    audit.log({
      actorType: 'user', actorId: req.user.userId, restaurantId: req.user.restaurantId,
      action: 'payment', resourceType: 'payment', resourceId: req.params.orderId,
      description: `Split payment processed — ${result.splits.length} bills, total ${result.totalCharged}`,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.post('/:orderId', authenticate, async (req, res, next) => {
  try {
    const result = await service.processPayment(req.params.orderId, req.body, req.user.restaurantId);
    const methodLabel = req.body.tenders
      ? req.body.tenders.map((t) => t.method).join('+')
      : req.body.method;
    audit.log({
      actorType: 'user', actorId: req.user.userId, restaurantId: req.user.restaurantId,
      action: 'payment', resourceType: 'payment', resourceId: req.params.orderId,
      description: `Payment processed — ${methodLabel}, total ${result.charged}`,
    });
    res.json(result);
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
    const itemIds = req.query.itemIds ? req.query.itemIds.split(',').filter(Boolean) : null;
    const waiveServiceCharge = req.query.waive === 'true';
    res.json(await service.getBill(req.params.orderId, req.user.restaurantId, itemIds, waiveServiceCharge));
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
