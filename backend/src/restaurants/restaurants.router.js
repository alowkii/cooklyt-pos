const router = require('express').Router();
const service = require('./restaurants.service');
const { authenticate } = require('../shared/middleware/auth');

// Any authenticated user can see their own restaurant.
// Cross-tenant listing and creation live under /admin (super_admin only) — they
// must not be exposed on the tenant-scoped /api surface.
router.get('/current', authenticate, async (req, res, next) => {
  try {
    res.json(await service.getCurrent(req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

module.exports = router;
