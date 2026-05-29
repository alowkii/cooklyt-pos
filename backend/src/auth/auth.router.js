const router = require('express').Router();
const service = require('./auth.service');
const { authenticate, authorize } = require('../shared/middleware/auth');
const { rateLimit } = require('../shared/middleware/rateLimit');
const audit = require('../shared/audit');

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'strict',
  secure:   process.env.NODE_ENV === 'production',
  maxAge:   8 * 60 * 60 * 1000, // 8 h — matches JWT expiry
  path:     '/',
};

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

const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many email requests, please try again later',
});

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const result = await service.login(req.body.email, req.body.password);
    audit.log({
      actorType: 'user', actorId: result.user.id, restaurantId: result.user.restaurantId,
      action: 'login', resourceType: 'user', resourceId: result.user.id,
      description: `User signed in (${result.user.email})`,
    });
    res.cookie('pos_token', result.token, COOKIE_OPTS);
    const { token: _t, ...safe } = result; // strip token from response body
    res.json(safe);
  } catch (e) {
    audit.log({
      actorType: 'user', actorId: null, restaurantId: null,
      action: 'login_failed', resourceType: 'user',
      description: `Failed login for "${String(req.body?.email || '').slice(0, 200)}" from ${req.ip}`,
    });
    next(e);
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('pos_token', { ...COOKIE_OPTS, maxAge: 0 });
  res.status(204).send();
});

// Admin-only: register new staff/admin accounts within the same restaurant
router.post('/register', authenticate, authorize('admin'), writeLimiter, async (req, res, next) => {
  try {
    const { email, password, role, name } = req.body;
    const user = await service.register(email, password, role, req.user.restaurantId, name);
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
router.delete('/users/:id', authenticate, authorize('admin'), writeLimiter, async (req, res, next) => {
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
    res.cookie('pos_token', result.token, COOKIE_OPTS);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// Admin or self: update a user's display name
router.patch('/users/:id/name', authenticate, writeLimiter, async (req, res, next) => {
  try {
    const isSelf  = req.params.id === req.user.userId;
    const isAdmin = req.user.role === 'admin';
    if (!isSelf && !isAdmin) return res.status(403).json({ error: 'Forbidden' });
    const user = await service.updateUserName(req.params.id, req.body.name ?? null, req.user.restaurantId);
    res.json(user);
  } catch (e) {
    next(e);
  }
});

// Admin-only: set or clear a user's 4-digit staff PIN
router.patch('/users/:id/pin', authenticate, authorize('admin'), writeLimiter, async (req, res, next) => {
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
router.patch('/users/:id/role', authenticate, authorize('admin'), writeLimiter, async (req, res, next) => {
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

// Admin-only: enable or disable a user account
router.patch('/users/:id/active', authenticate, authorize('admin'), writeLimiter, async (req, res, next) => {
  try {
    const user = await service.setUserActive(req.params.id, !!req.body.is_active, req.user.userId, req.user.restaurantId);
    res.json(user);
  } catch (e) { next(e); }
});

// Self or admin: mark presence (in restaurant / away)
router.patch('/users/:id/present', authenticate, writeLimiter, async (req, res, next) => {
  try {
    const isSelf  = req.params.id === req.user.userId;
    const isAdmin = req.user.role === 'admin';
    if (!isSelf && !isAdmin) return res.status(403).json({ error: 'Forbidden' });
    const user = await service.setUserPresent(req.params.id, !!req.body.is_present, req.user.restaurantId);
    res.json(user);
  } catch (e) { next(e); }
});

// --- email verification ---

router.get('/verify-email', async (req, res, next) => {
  try {
    const result = await service.verifyEmail(req.query.token);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.post('/resend-verification', emailLimiter, async (req, res, next) => {
  try {
    const result = await service.resendVerification(req.body.email);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

// Admin-only: resend verification for a specific user by id
router.post('/users/:id/resend-verification', authenticate, authorize('admin'), writeLimiter, async (req, res, next) => {
  try {
    const target = await service.me(req.params.id);
    if (!target || target.restaurant_id !== req.user.restaurantId) {
      return res.status(404).json({ error: 'User not found' });
    }
    const result = await service.resendVerification(target.email);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

// --- password reset ---

router.post('/forgot-password', emailLimiter, async (req, res, next) => {
  try {
    const result = await service.forgotPassword(req.body.email);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.post('/reset-password', writeLimiter, async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const result = await service.resetPassword(token, password);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
