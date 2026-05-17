const router = require('express').Router();
const service = require('./inventory.service');
const { authenticate, authorize } = require('../shared/middleware/auth');

router.use(authenticate, authorize('admin'));

router.get('/transactions', async (req, res, next) => {
  try {
    res.json(
      await service.getTransactions(req.user.restaurantId, {
        ingredientId: req.query.ingredientId || null,
        txnType:      req.query.type         || null,
        from:         req.query.from         || null,
        to:           req.query.to           || null,
        limit:        parseInt(req.query.limit, 10) || 100,
      }),
    );
  } catch (e) {
    next(e);
  }
});

router.post('/adjustment', async (req, res, next) => {
  try {
    res.status(201).json(
      await service.recordAdjustment({
        ...req.body,
        restaurantId: req.user.restaurantId,
        performedBy:  req.user.userId,
      }),
    );
  } catch (e) {
    next(e);
  }
});

router.post('/import', async (req, res, next) => {
  try {
    res.status(201).json(
      await service.importTransactions({
        restaurantId: req.user.restaurantId,
        performedBy:  req.user.userId,
        rows:         req.body.rows,
      }),
    );
  } catch (e) {
    next(e);
  }
});

router.get('/waste-report', async (req, res, next) => {
  try {
    res.json(
      await service.getWasteReport(req.user.restaurantId, {
        from: req.query.from || null,
        to:   req.query.to   || null,
      }),
    );
  } catch (e) {
    next(e);
  }
});

module.exports = router;
