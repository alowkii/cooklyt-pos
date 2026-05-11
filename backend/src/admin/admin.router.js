const router = require('express').Router();
const service = require('./admin.service');
const { authenticateSuperAdmin } = require('./admin.middleware');
const { rateLimit } = require('../shared/middleware/rateLimit');
const audit = require('../shared/audit');

const sa = (req) => ({ actorType: 'super_admin', actorId: req.superAdmin.superAdminId });

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts, please try again later',
});

const setupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many setup attempts',
});

// ── Auth ─────────────────────────────────────────────────────────────────────

router.post('/auth/setup', setupLimiter, async (req, res, next) => {
  try {
    res.status(201).json(await service.setup(req.body.email, req.body.password));
  } catch (e) { next(e); }
});

router.post('/auth/login', loginLimiter, async (req, res, next) => {
  try {
    const result = await service.login(req.body.email, req.body.password);
    audit.log({ actorType: 'super_admin', actorId: result.admin.id, action: 'login', resourceType: 'super_admin', description: `Operator signed in (${result.admin.email})` });
    res.json(result);
  } catch (e) {
    audit.log({
      actorType: 'super_admin', actorId: null,
      action: 'login_failed', resourceType: 'super_admin',
      description: `Failed operator login for "${String(req.body?.email || '').slice(0, 200)}" from ${req.ip}`,
    });
    next(e);
  }
});

router.get('/auth/me', authenticateSuperAdmin, async (req, res, next) => {
  try {
    res.json(await service.me(req.superAdmin.superAdminId));
  } catch (e) { next(e); }
});

router.post('/auth/change-password', authenticateSuperAdmin, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await service.changePassword(req.superAdmin.superAdminId, currentPassword, newPassword);
    audit.log({
      ...sa(req),
      action: 'update', resourceType: 'super_admin', resourceId: req.superAdmin.superAdminId,
      description: 'Changed own password',
    });
    res.json(result);
  } catch (e) { next(e); }
});

router.patch('/auth/me/defaults', authenticateSuperAdmin, async (req, res, next) => {
  try {
    const { timezone, currency, tax_rate, service_charge } = req.body;
    const result = await service.updateDefaults(req.superAdmin.superAdminId, { timezone, currency, tax_rate, service_charge });
    audit.log({ ...sa(req), action: 'update', resourceType: 'super_admin', resourceId: req.superAdmin.superAdminId, description: 'Updated new-restaurant defaults' });
    res.json(result);
  } catch (e) { next(e); }
});

router.post('/auth/verify-password', authenticateSuperAdmin, async (req, res, next) => {
  try {
    const result = await service.verifyPassword(req.superAdmin.superAdminId, req.body.password);
    // Log the export action here so it's tied to a verified identity
    audit.log({
      ...sa(req),
      action: 'export',
      resourceType: 'audit_log',
      description: `Exported audit logs${req.body.context ? ` (${req.body.context})` : ''}`,
    });
    res.json(result);
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
    const restaurant = await service.createRestaurant(req.body.name);
    audit.log({ ...sa(req), action: 'create', resourceType: 'restaurant', resourceId: restaurant.id, description: `Created restaurant "${restaurant.name}"` });
    res.status(201).json(restaurant);
  } catch (e) { next(e); }
});

router.get('/restaurants/:id', authenticateSuperAdmin, async (req, res, next) => {
  try {
    res.json(await service.getRestaurant(req.params.id));
  } catch (e) { next(e); }
});

router.patch('/restaurants/:id', authenticateSuperAdmin, async (req, res, next) => {
  try {
    const restaurant = await service.updateRestaurant(req.params.id, req.body.name);
    audit.log({ ...sa(req), restaurantId: req.params.id, action: 'update', resourceType: 'restaurant', resourceId: req.params.id, description: `Renamed restaurant to "${restaurant.name}"` });
    res.json(restaurant);
  } catch (e) { next(e); }
});

router.delete('/restaurants/:id', authenticateSuperAdmin, async (req, res, next) => {
  try {
    const deleted = await service.deleteRestaurant(req.params.id);
    audit.log({ ...sa(req), restaurantName: deleted.name, action: 'delete', resourceType: 'restaurant', resourceId: req.params.id, description: `Deleted restaurant "${deleted.name}"` });
    res.status(204).send();
  } catch (e) { next(e); }
});

// ── Users ─────────────────────────────────────────────────────────────────────

router.post('/restaurants/:id/users', authenticateSuperAdmin, async (req, res, next) => {
  try {
    const { email, password, role } = req.body;
    const user = await service.createUser({ email, password, role, restaurantId: req.params.id });
    audit.log({ ...sa(req), restaurantId: req.params.id, action: 'create', resourceType: 'user', resourceId: user.id, description: `Created user "${email}" with role ${role}` });
    res.status(201).json(user);
  } catch (e) { next(e); }
});

router.delete('/restaurants/:id/users/:userId', authenticateSuperAdmin, async (req, res, next) => {
  try {
    const user = await service.deleteUser(req.params.userId, req.params.id);
    audit.log({ ...sa(req), restaurantId: req.params.id, action: 'delete', resourceType: 'user', resourceId: req.params.userId, description: `Deleted user "${user?.email || req.params.userId}"` });
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
    const settings = await service.updateSetting(req.params.id, key, value);
    audit.log({ ...sa(req), restaurantId: req.params.id, action: 'update', resourceType: 'setting', resourceId: key, description: `Set ${key} to "${value}"` });
    res.json(settings);
  } catch (e) { next(e); }
});

// ── Audit logs ────────────────────────────────────────────────────────────────

router.get('/audit-logs', authenticateSuperAdmin, async (req, res, next) => {
  try {
    const { restaurantId, from, to, resourceType, limit } = req.query;
    res.json(await service.getAuditLogs({ restaurantId, from, to, resourceType, limit: limit ? parseInt(limit, 10) : 500 }));
  } catch (e) { next(e); }
});

module.exports = router;
