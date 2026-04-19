const { Router } = require('express');
const { authenticate, authorize } = require('../shared/middleware/auth');
const service = require('./settings.service');

const router = Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    res.json(await service.getAll());
  } catch (e) {
    next(e);
  }
});

router.patch('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { key, value } = req.body;
    res.json(await service.update(key, value));
  } catch (e) {
    next(e);
  }
});

module.exports = router;
