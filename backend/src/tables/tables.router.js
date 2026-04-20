const router = require('express').Router();
const service = require('./tables.service');
const { authenticate, authorize } = require('../shared/middleware/auth');

router.get('/', authenticate, async (req, res, next) => {
  try {
    res.json(await service.getAll(req.user.restaurantId));
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
    const table = await service.create(req.body, req.user.restaurantId);
    res.status(201).json(table);
  } catch (e) {
    next(e);
  }
});

router.patch('/:id/status', authenticate, async (req, res, next) => {
  try {
    res.json(await service.updateStatus(req.params.id, req.body.status, req.user.restaurantId));
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
