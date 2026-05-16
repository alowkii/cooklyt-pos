const router = require('express').Router();
const service = require('./recipes.service');
const { authenticate, authorize } = require('../shared/middleware/auth');

router.use(authenticate, authorize('admin'));

router.get('/', async (req, res, next) => {
  try {
    res.json(await service.getAll(req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.get('/cost-report', async (req, res, next) => {
  try {
    res.json(await service.getCostReport(req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    res.json(await service.getById(req.params.id, req.user.restaurantId));
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

router.delete('/:id', async (req, res, next) => {
  try {
    res.json(await service.remove(req.params.id, req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.get('/:id/cost', async (req, res, next) => {
  try {
    res.json(await service.getCost(req.params.id, req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.get('/:id/snapshots', async (req, res, next) => {
  try {
    res.json(await service.getSnapshots(req.params.id, req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.post('/:id/snapshot', async (req, res, next) => {
  try {
    res.json(await service.takeSnapshot(req.params.id, req.user.restaurantId, req.body.triggeredBy));
  } catch (e) {
    next(e);
  }
});

module.exports = router;
