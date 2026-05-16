const router = require('express').Router();
const service = require('./waste.service');
const { authenticate, authorize } = require('../shared/middleware/auth');

router.use(authenticate, authorize('admin', 'staff'));

router.get('/', async (req, res, next) => {
  try {
    res.json(await service.getAll(req.user.restaurantId, { from: req.query.from, to: req.query.to }));
  } catch (e) {
    next(e);
  }
});

router.post('/', async (req, res, next) => {
  try {
    res.status(201).json(
      await service.logWaste({
        ...req.body,
        loggedBy:     req.user.userId,
        restaurantId: req.user.restaurantId,
      }),
    );
  } catch (e) {
    next(e);
  }
});

module.exports = router;
