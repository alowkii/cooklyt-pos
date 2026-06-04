const router  = require('express').Router();
const service = require('./wastage-reviews.service');
const { authenticate, authorize } = require('../shared/middleware/auth');

router.use(authenticate);

router.get('/', authorize('admin', 'staff', 'cashier'), async (req, res, next) => {
  try {
    const { status } = req.query;
    res.json(await service.listReviews(req.user.restaurantId, { status }));
  } catch (e) { next(e); }
});

router.post('/:id/resolve', authorize('admin'), async (req, res, next) => {
  try {
    res.json(await service.resolveReview(req.params.id, {
      restaurantId: req.user.restaurantId,
      reviewedBy:   req.user.userId,
      ingredients:  req.body.ingredients,
    }));
  } catch (e) { next(e); }
});

module.exports = router;
