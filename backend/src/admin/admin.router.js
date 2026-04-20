const router = require('express').Router();
const service = require('./admin.service');
const { authenticateSuperAdmin } = require('./admin.middleware');

// ── Auth ─────────────────────────────────────────────────────────────────────

// First-run setup — disabled once any super admin exists
router.post('/auth/setup', async (req, res, next) => {
  try {
    res.status(201).json(await service.setup(req.body.email, req.body.password));
  } catch (e) { next(e); }
});

router.post('/auth/login', async (req, res, next) => {
  try {
    res.json(await service.login(req.body.email, req.body.password));
  } catch (e) { next(e); }
});

// ── Restaurants ───────────────────────────────────────────────────────────────

router.get('/restaurants', authenticateSuperAdmin, async (req, res, next) => {
  try {
    res.json(await service.getAllRestaurants());
  } catch (e) { next(e); }
});

router.post('/restaurants', authenticateSuperAdmin, async (req, res, next) => {
  try {
    res.status(201).json(await service.createRestaurant(req.body.name));
  } catch (e) { next(e); }
});

router.get('/restaurants/:id', authenticateSuperAdmin, async (req, res, next) => {
  try {
    res.json(await service.getRestaurant(req.params.id));
  } catch (e) { next(e); }
});

router.patch('/restaurants/:id', authenticateSuperAdmin, async (req, res, next) => {
  try {
    res.json(await service.updateRestaurant(req.params.id, req.body.name));
  } catch (e) { next(e); }
});

router.delete('/restaurants/:id', authenticateSuperAdmin, async (req, res, next) => {
  try {
    await service.deleteRestaurant(req.params.id);
    res.status(204).send();
  } catch (e) { next(e); }
});

// ── Users ─────────────────────────────────────────────────────────────────────

router.post('/restaurants/:id/users', authenticateSuperAdmin, async (req, res, next) => {
  try {
    const { email, password, role } = req.body;
    res.status(201).json(
      await service.createUser({ email, password, role, restaurantId: req.params.id }),
    );
  } catch (e) { next(e); }
});

router.delete('/restaurants/:id/users/:userId', authenticateSuperAdmin, async (req, res, next) => {
  try {
    await service.deleteUser(req.params.userId, req.params.id);
    res.status(204).send();
  } catch (e) { next(e); }
});

// ── Settings ──────────────────────────────────────────────────────────────────

router.get('/restaurants/:id/settings', authenticateSuperAdmin, async (req, res, next) => {
  try {
    res.json(await service.getSettings(req.params.id));
  } catch (e) { next(e); }
});

router.patch('/restaurants/:id/settings', authenticateSuperAdmin, async (req, res, next) => {
  try {
    const { key, value } = req.body;
    res.json(await service.updateSetting(req.params.id, key, value));
  } catch (e) { next(e); }
});

module.exports = router;
