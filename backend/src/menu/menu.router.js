const router = require('express').Router();
const service = require('./menu.service');
const { authenticate, authorize } = require('../shared/middleware/auth');

router.get('/', authenticate, async (req, res, next) => {
  try {
    res.json(await service.getAll(req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.get('/available', authenticate, async (req, res, next) => {
  try {
    res.json(await service.getAvailable(req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    res.json(await service.getById(req.params.id, req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.post('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const item = await service.create(req.body, req.user.restaurantId);
    res.status(201).json(item);
  } catch (e) {
    next(e);
  }
});

router.patch('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    res.json(await service.update(req.params.id, req.body, req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    await service.remove(req.params.id, req.user.restaurantId);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

module.exports = router;
