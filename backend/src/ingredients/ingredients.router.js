const router = require('express').Router();
const service = require('./ingredients.service');
const { authenticate, authorize } = require('../shared/middleware/auth');

router.use(authenticate, authorize('admin'));

router.get('/', async (req, res, next) => {
  try {
    res.json(await service.getAll(req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.get('/low-stock', async (req, res, next) => {
  try {
    res.json(await service.getLowStock(req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.post('/', async (req, res, next) => {
  try {
    res.status(201).json(await service.create(req.body, req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    res.json(await service.update(req.params.id, req.body, req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.post('/:id/purchase', async (req, res, next) => {
  try {
    res.json(
      await service.recordPurchase(
        req.params.id,
        { ...req.body, performedBy: req.user.userId },
        req.user.restaurantId,
      ),
    );
  } catch (e) {
    next(e);
  }
});

module.exports = router;
