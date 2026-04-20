const router = require('express').Router();
const service = require('./reports.service');
const { authenticate, authorize } = require('../shared/middleware/auth');

router.get('/daily', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const tz   = req.query.tz   || 'UTC';
    res.json(await service.getDailySummary(date, tz, req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

module.exports = router;
