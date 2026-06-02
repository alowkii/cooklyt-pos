const router  = require('express').Router();
const service = require('./reports.service');
const { authenticate, authorize } = require('../shared/middleware/auth');

const adminOnly = [authenticate, authorize('admin')];

router.get('/daily', ...adminOnly, async (req, res, next) => {
  try {
    const { date, tz = 'UTC', channel } = req.query;
    const d = date || new Date().toISOString().split('T')[0];
    res.json(await service.getDailySummary(d, tz, req.user.restaurantId, channel));
  } catch (e) { next(e); }
});

router.get('/trends', ...adminOnly, async (req, res, next) => {
  try {
    const { from, to, tz = 'UTC', group = 'day', channel } = req.query;
    res.json(await service.getTrends(from, to, tz, group, req.user.restaurantId, channel));
  } catch (e) { next(e); }
});

router.get('/items', ...adminOnly, async (req, res, next) => {
  try {
    const { from, to, tz = 'UTC', limit, channel } = req.query;
    res.json(await service.getItemProfitability(from, to, tz, limit, req.user.restaurantId, channel));
  } catch (e) { next(e); }
});

router.get('/staff', ...adminOnly, async (req, res, next) => {
  try {
    const { from, to, tz = 'UTC', channel } = req.query;
    res.json(await service.getStaffPerformance(from, to, tz, req.user.restaurantId, channel));
  } catch (e) { next(e); }
});

router.get('/items-trend', ...adminOnly, async (req, res, next) => {
  try {
    const { from, to, tz = 'UTC', group = 'day', limit, channel } = req.query;
    res.json(await service.getItemsByPeriod(from, to, tz, group, limit, req.user.restaurantId, channel));
  } catch (e) { next(e); }
});

router.get('/staff-trend', ...adminOnly, async (req, res, next) => {
  try {
    const { from, to, tz = 'UTC', group = 'day', channel } = req.query;
    res.json(await service.getStaffByPeriod(from, to, tz, group, req.user.restaurantId, channel));
  } catch (e) { next(e); }
});

router.get('/sales-summary', ...adminOnly, async (req, res, next) => {
  try {
    const { from, to, tz = 'UTC', channel } = req.query;
    res.json(await service.getSalesSummaryReport(from, to, tz, req.user.restaurantId, channel));
  } catch (e) { next(e); }
});

router.get('/collection', ...adminOnly, async (req, res, next) => {
  try {
    const { from, to, tz = 'UTC', channel } = req.query;
    res.json(await service.getCollectionReport(from, to, tz, req.user.restaurantId, channel));
  } catch (e) { next(e); }
});

router.get('/item-groups', ...adminOnly, async (req, res, next) => {
  try {
    const { from, to, tz = 'UTC', limit, channel } = req.query;
    res.json(await service.getItemGroupsReport(from, to, tz, limit, req.user.restaurantId, channel));
  } catch (e) { next(e); }
});

router.get('/table-wise', ...adminOnly, async (req, res, next) => {
  try {
    const { from, to, tz = 'UTC' } = req.query;
    res.json(await service.getTableWiseSalesReport(from, to, tz, req.user.restaurantId));
  } catch (e) { next(e); }
});

router.get('/nc-sales', ...adminOnly, async (req, res, next) => {
  try {
    const { from, to, tz = 'UTC', channel } = req.query;
    res.json(await service.getNCSalesReport(from, to, tz, req.user.restaurantId, channel));
  } catch (e) { next(e); }
});

module.exports = router;
