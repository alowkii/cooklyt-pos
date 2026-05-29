const router = require('express').Router();
const crypto = require('crypto');
const jwt    = require('jsonwebtoken');
const service = require('./admin.service');
const repo    = require('./admin.repository');
const { authenticateSuperAdmin } = require('./admin.middleware');
const { rateLimit } = require('../shared/middleware/rateLimit');
const audit = require('../shared/audit');

const GOOGLE_CLIENT_ID          = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET      = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_ADMIN_CALLBACK_URL = process.env.GOOGLE_ADMIN_CALLBACK_URL || 'http://localhost:3000/admin/auth/google/callback';
const ADMIN_URL                 = process.env.ADMIN_URL || 'http://localhost:5174';

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'strict',
  secure:   process.env.NODE_ENV === 'production',
  maxAge:   8 * 60 * 60 * 1000,
  path:     '/',
};

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
    const result = await service.setup(req.body.email, req.body.password);
    res.cookie('admin_token', result.token, COOKIE_OPTS);
    const { token: _t, ...safe } = result;
    res.status(201).json(safe);
  } catch (e) { next(e); }
});

router.post('/auth/login', loginLimiter, async (req, res, next) => {
  try {
    const result = await service.login(req.body.email, req.body.password);
    audit.log({ actorType: 'super_admin', actorId: result.admin.id, action: 'login', resourceType: 'super_admin', description: `Operator signed in (${result.admin.email})` });
    res.cookie('admin_token', result.token, COOKIE_OPTS);
    const { token: _t, ...safe } = result;
    res.json(safe);
  } catch (e) {
    audit.log({
      actorType: 'super_admin', actorId: null,
      action: 'login_failed', resourceType: 'super_admin',
      description: `Failed operator login for "${String(req.body?.email || '').slice(0, 200)}" from ${req.ip}`,
    });
    next(e);
  }
});

router.post('/auth/logout', (req, res) => {
  res.clearCookie('admin_token', { ...COOKIE_OPTS, maxAge: 0 });
  res.status(204).send();
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
    res.cookie('admin_token', result.token, COOKIE_OPTS);
    res.json({ ok: true });
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

// ── Google OAuth ─────────────────────────────────────────────────────────────

router.get('/auth/google', (req, res) => {
  if (!GOOGLE_CLIENT_ID) return res.status(503).json({ error: 'Google sign-in is not configured' });

  const state = crypto.randomBytes(16).toString('hex');
  res.cookie('oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure:   process.env.NODE_ENV === 'production',
    maxAge:   5 * 60 * 1000,
    path:     '/',
  });

  const params = new URLSearchParams({
    client_id:     GOOGLE_CLIENT_ID,
    redirect_uri:  GOOGLE_ADMIN_CALLBACK_URL,
    response_type: 'code',
    scope:         'openid email profile',
    access_type:   'online',
    state,
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

router.get('/auth/google/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error || !code) {
    return res.redirect(`${ADMIN_URL}/login?error=oauth_cancelled`);
  }

  if (!state || state !== req.cookies.oauth_state) {
    return res.redirect(`${ADMIN_URL}/login?error=oauth_failed`);
  }
  res.clearCookie('oauth_state', { path: '/' });

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        code,
        client_id:     GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri:  GOOGLE_ADMIN_CALLBACK_URL,
        grant_type:    'authorization_code',
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error('No access token returned');

    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const { email } = await userInfoRes.json();
    if (!email) throw new Error('No email returned from Google');

    const admin = await repo.findSuperAdminByEmail(email);
    if (!admin) return res.redirect(`${ADMIN_URL}/login?error=no_account`);

    const token = jwt.sign(
      { superAdminId: admin.id, role: 'super_admin' },
      process.env.JWT_SECRET,
      { expiresIn: '8h' },
    );

    audit.log({
      actorType: 'super_admin', actorId: admin.id,
      action: 'login', resourceType: 'super_admin',
      description: `Operator signed in via Google (${email})`,
    });

    res.cookie('admin_token', token, COOKIE_OPTS);

    const payload = Buffer.from(JSON.stringify({
      admin: { id: admin.id, email: admin.email },
    })).toString('base64url');

    res.redirect(`${ADMIN_URL}/oauth/callback?d=${payload}`);
  } catch (e) {
    console.error('[admin google oauth]', e.message);
    res.redirect(`${ADMIN_URL}/login?error=oauth_failed`);
  }
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

// ── All users (cross-tenant) ──────────────────────────────────────────────────

router.get('/users', authenticateSuperAdmin, async (req, res, next) => {
  try {
    res.json(await service.getAllUsers());
  } catch (e) { next(e); }
});

router.delete('/users/:id', authenticateSuperAdmin, async (req, res, next) => {
  try {
    const user = await service.deleteUserById(req.params.id);
    audit.log({ ...sa(req), action: 'delete', resourceType: 'user', resourceId: req.params.id, description: `Deleted user "${user.email}"` });
    res.status(204).send();
  } catch (e) { next(e); }
});

router.patch('/users/:id/active', authenticateSuperAdmin, async (req, res, next) => {
  try {
    const result = await service.setUserActive(req.params.id, req.body.isActive);
    audit.log({ ...sa(req), action: 'update', resourceType: 'user', resourceId: req.params.id, description: `${req.body.isActive ? 'Enabled' : 'Disabled'} user account` });
    res.json(result);
  } catch (e) { next(e); }
});

router.post('/users/:id/resend-verification', authenticateSuperAdmin, async (req, res, next) => {
  try {
    res.json(await service.resendVerificationForUser(req.params.id));
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
