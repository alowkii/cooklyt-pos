const router  = require('express').Router();
const service = require('./reports.service');
const { authenticate, authorize } = require('../shared/middleware/auth');

const adminOnly = [authenticate, authorize('admin')];

router.get('/daily', ...adminOnly, async (req, res, next) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const tz   = req.query.tz   || 'UTC';
    res.json(await service.getDailySummary(date, tz, req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.get('/trends', ...adminOnly, async (req, res, next) => {
  try {
    const { from, to, tz = 'UTC', group = 'day' } = req.query;
    res.json(await service.getTrends(from, to, tz, group, req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.get('/items', ...adminOnly, async (req, res, next) => {
  try {
    const { from, to, tz = 'UTC', limit } = req.query;
    res.json(await service.getItemProfitability(from, to, tz, limit, req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.get('/staff', ...adminOnly, async (req, res, next) => {
  try {
    const { from, to, tz = 'UTC' } = req.query;
    res.json(await service.getStaffPerformance(from, to, tz, req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.get('/items-trend', ...adminOnly, async (req, res, next) => {
  try {
    const { from, to, tz = 'UTC', group = 'day', limit } = req.query;
    res.json(await service.getItemsByPeriod(from, to, tz, group, limit, req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.get('/staff-trend', ...adminOnly, async (req, res, next) => {
  try {
    const { from, to, tz = 'UTC', group = 'day' } = req.query;
    res.json(await service.getStaffByPeriod(from, to, tz, group, req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

module.exports = router;
