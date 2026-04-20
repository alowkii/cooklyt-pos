const { Router } = require('express');
const { authenticate, authorize } = require('../shared/middleware/auth');
const service = require('./settings.service');

const router = Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    res.json(await service.getAll(req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.patch('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { key, value } = req.body;
    res.json(await service.update(key, value, req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

module.exports = router;
