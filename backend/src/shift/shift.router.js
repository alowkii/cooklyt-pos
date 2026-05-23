const router = require('express').Router();
const service = require('./shift.service');
const { authenticate } = require('../shared/middleware/auth');
const { ValidationError } = require('../shared/errors');

router.get('/summary', authenticate, async (req, res, next) => {
  try {
    res.json(await service.getSummary(req.user.restaurantId));
  } catch (e) { next(e); }
});

router.get('/history', authenticate, async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 30, 500);
    res.json(await service.getHistory(req.user.restaurantId, limit));
  } catch (e) { next(e); }
});

router.post('/count', authenticate, async (req, res, next) => {
  try {
    const { actualCash, notes, denominations } = req.body;
    const n = parseFloat(actualCash);
    if (isNaN(n) || n < 0) throw new ValidationError('actualCash must be a non-negative number');
    const result = await service.recordCount({
      restaurantId: req.user.restaurantId,
      countedBy:    req.user.userId,
      actualCash:   n,
      notes,
      denominations,
    });
    res.status(201).json(result);
  } catch (e) { next(e); }
});

module.exports = router;
