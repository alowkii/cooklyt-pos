const router = require('express').Router();
const service = require('./modifiers.service');
const { authenticate, authorize } = require('../shared/middleware/auth');

router.use(authenticate, authorize('admin'));

router.get('/groups', async (req, res, next) => {
  try {
    res.json(await service.getGroups(req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.post('/groups', async (req, res, next) => {
  try {
    res.status(201).json(await service.createGroup(req.body, req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.patch('/groups/:id', async (req, res, next) => {
  try {
    res.json(await service.updateGroup(req.params.id, req.body, req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.delete('/groups/:id', async (req, res, next) => {
  try {
    res.json(await service.deleteGroup(req.params.id, req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.post('/groups/:groupId/options', async (req, res, next) => {
  try {
    res.status(201).json(await service.addOption(req.params.groupId, req.body, req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.delete('/options/:id', async (req, res, next) => {
  try {
    res.json(await service.deleteOption(req.params.id, req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.get('/overrides/:recipeId', async (req, res, next) => {
  try {
    res.json(await service.getOverrides(req.params.recipeId, req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.put('/overrides', async (req, res, next) => {
  try {
    res.json(await service.upsertOverride(req.body, req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.delete('/overrides', async (req, res, next) => {
  try {
    const { recipeId, optionId, ingredientId } = req.body;
    await service.deleteOverride(recipeId, optionId, ingredientId, req.user.restaurantId);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
