const router = require('express').Router();
const service = require('./waste.service');
const { authenticate, authorize } = require('../shared/middleware/auth');
const { asyncHandler } = require('../shared/asyncHandler');

router.use(authenticate, authorize('admin', 'staff'));

router.get('/', asyncHandler(async (req, res) => {
  res.json(await service.getAll(req.user.restaurantId, { from: req.query.from, to: req.query.to, tz: req.query.tz }));
}));

router.post('/', asyncHandler(async (req, res) => {
  res.status(201).json(
    await service.logWaste({
      ...req.body,
      loggedBy:     req.user.userId,
      restaurantId: req.user.restaurantId,
    }),
  );
}));

router.post('/by-menu-item', asyncHandler(async (req, res) => {
  res.status(201).json(
    await service.logWasteByMenuItem({
      ...req.body,
      loggedBy:     req.user.userId,
      restaurantId: req.user.restaurantId,
    }),
  );
}));

module.exports = router;
