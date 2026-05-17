const router = require('express').Router();
const service = require('./auth.service');
const { authenticate, authorize } = require('../shared/middleware/auth');
const { rateLimit } = require('../shared/middleware/rateLimit');
const audit = require('../shared/audit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts, please try again later',
});

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many requests',
});

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const result = await service.login(req.body.email, req.body.password);
    audit.log({
      actorType: 'user', actorId: result.user.id, restaurantId: result.user.restaurantId,
      action: 'login', resourceType: 'user', resourceId: result.user.id,
      description: `User signed in (${result.user.email})`,
    });
    res.json(result);
  } catch (e) {
    audit.log({
      actorType: 'user', actorId: null, restaurantId: null,
      action: 'login_failed', resourceType: 'user',
      description: `Failed login for "${String(req.body?.email || '').slice(0, 200)}" from ${req.ip}`,
    });
    next(e);
  }
});

// Admin-only: register new staff/admin accounts within the same restaurant
router.post('/register', authenticate, authorize('admin'), writeLimiter, async (req, res, next) => {
  try {
    const { email, password, role } = req.body;
    const user = await service.register(email, password, role, req.user.restaurantId);
    audit.log({
      actorType: 'user', actorId: req.user.userId, restaurantId: req.user.restaurantId,
      action: 'create', resourceType: 'user', resourceId: user.id,
      description: `Registered user "${email}" with role ${role}`,
    });
    res.status(201).json(user);
  } catch (e) {
    next(e);
  }
});

// Get current user profile
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await service.me(req.user.userId);
    res.json(user);
  } catch (e) {
    next(e);
  }
});

// Admin-only: list all users in this restaurant
router.get('/users', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const users = await service.getAllUsers(req.user.restaurantId);
    res.json(users);
  } catch (e) {
    next(e);
  }
});

// Admin-only: delete a user (must belong to same restaurant)
router.delete('/users/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const deleted = await service.deleteUser(req.params.id, req.user.userId, req.user.restaurantId);
    audit.log({
      actorType: 'user', actorId: req.user.userId, restaurantId: req.user.restaurantId,
      action: 'delete', resourceType: 'user', resourceId: req.params.id,
      description: `Deleted user "${deleted?.email || req.params.id}"`,
    });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

// Change own password (any authenticated user)
router.post('/change-password', authenticate, writeLimiter, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await service.changePassword(req.user.userId, currentPassword, newPassword);
    audit.log({
      actorType: 'user', actorId: req.user.userId, restaurantId: req.user.restaurantId,
      action: 'update', resourceType: 'user', resourceId: req.user.userId,
      description: 'Changed own password',
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
});

// Admin-only: set or clear a user's 4-digit staff PIN
router.patch('/users/:id/pin', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const pin = req.body.pin === '' ? null : req.body.pin;
    const user = await service.setStaffPin(req.params.id, pin, req.user.restaurantId);
    audit.log({
      actorType: 'user', actorId: req.user.userId, restaurantId: req.user.restaurantId,
      action: 'update', resourceType: 'user', resourceId: req.params.id,
      description: pin ? `Set staff PIN for "${user.email}"` : `Cleared staff PIN for "${user.email}"`,
    });
    res.json(user);
  } catch (e) {
    next(e);
  }
});

// Admin-only: change a user's role (must belong to same restaurant)
router.patch('/users/:id/role', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const user = await service.updateUserRole(
      req.params.id,
      req.body.role,
      req.user.userId,
      req.user.restaurantId,
    );
    audit.log({
      actorType: 'user', actorId: req.user.userId, restaurantId: req.user.restaurantId,
      action: 'update', resourceType: 'user', resourceId: req.params.id,
      description: `Changed role of "${user.email}" to ${req.body.role}`,
    });
    res.json(user);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
