const router = require('express').Router();
const service = require('./menu.service');
const { authenticate, authorize } = require('../shared/middleware/auth');
const audit = require('../shared/audit');

const pos = (req) => ({ actorType: 'user', actorId: req.user.userId, restaurantId: req.user.restaurantId });

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

router.get('/popular', authenticate, async (req, res, next) => {
  try {
    res.json(await service.getPopular(req.user.restaurantId));
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
    audit.log({ ...pos(req), action: 'create', resourceType: 'menu_item', resourceId: item.id, description: `Created menu item "${item.name}" at ${item.price}` });
    res.status(201).json(item);
  } catch (e) {
    next(e);
  }
});

router.patch('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const item = await service.update(req.params.id, req.body, req.user.restaurantId);
    const changes = Object.keys(req.body).join(', ');
    audit.log({ ...pos(req), action: 'update', resourceType: 'menu_item', resourceId: req.params.id, description: `Updated menu item "${item.name}" (${changes})`, meta: req.body });
    res.json(item);
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    await service.remove(req.params.id, req.user.restaurantId);
    audit.log({ ...pos(req), action: 'delete', resourceType: 'menu_item', resourceId: req.params.id, description: `Deleted menu item ${req.params.id}` });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

module.exports = router;
