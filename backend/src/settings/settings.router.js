const { Router } = require('express');
const { authenticate, authorize } = require('../shared/middleware/auth');
const service = require('./settings.service');
const audit = require('../shared/audit');

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
    const result = await service.update(key, value, req.user.restaurantId);
    audit.log({
      actorType: 'user', actorId: req.user.userId, restaurantId: req.user.restaurantId,
      action: 'update', resourceType: 'setting', resourceId: key,
      description: `Set ${key} to "${value}"`,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
