const router = require('express').Router();
const service = require('./restaurants.service');
const { authenticate, authorize } = require('../shared/middleware/auth');

// Any authenticated user can see their own restaurant
router.get('/current', authenticate, async (req, res, next) => {
  try {
    res.json(await service.getCurrent(req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

// Super-admin utility: list all restaurants
router.get('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    res.json(await service.getAll());
  } catch (e) {
    next(e);
  }
});

// Create a new restaurant (used for onboarding new tenants)
router.post('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const restaurant = await service.create(req.body.name);
    res.status(201).json(restaurant);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
