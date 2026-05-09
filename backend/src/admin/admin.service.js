const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const repo = require('./admin.repository');
const { ValidationError, NotFoundError, UnauthorizedError } = require('../shared/errors');
const settingsOptions = require('../../../shared/settings-options.json');

const SALT_ROUNDS = 12;
const VALID_ROLES = ['admin', 'staff', 'kitchen'];

function assertStrongPassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters');
  }
}
const VALID_TIMEZONES = new Set(settingsOptions.timezones.map((t) => t.iana));
const VALID_CURRENCIES = new Set(settingsOptions.currencies.map((c) => c.code));

// ── Auth ─────────────────────────────────────────────────────────────────────

async function login(email, password) {
  if (!email || !password)
    throw new ValidationError('Email and password are required');

  const admin = await repo.findSuperAdminByEmail(email);
  if (!admin) throw new UnauthorizedError('Invalid credentials');

  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) throw new UnauthorizedError('Invalid credentials');

  const token = jwt.sign(
    { superAdminId: admin.id, role: 'super_admin' },
    process.env.JWT_SECRET,
    { expiresIn: '8h' },
  );

  return { token, admin: { id: admin.id, email: admin.email } };
}

// Only works when no super admin exists yet — first-run setup.
// Uses a conditional INSERT to avoid the TOCTOU race between count and insert.
async function setup(email, password) {
  if (!email || !password)
    throw new ValidationError('Email and password are required');
  assertStrongPassword(password);

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const admin = await repo.createFirstSuperAdmin(email, hashed);
  if (!admin)
    throw new ValidationError('Setup already complete — use /admin/auth/login');

  const token = jwt.sign(
    { superAdminId: admin.id, role: 'super_admin' },
    process.env.JWT_SECRET,
    { expiresIn: '8h' },
  );

  return { token, admin: { id: admin.id, email: admin.email } };
}

// ── Restaurants ───────────────────────────────────────────────────────────────

async function getAllRestaurants() {
  return repo.getAllRestaurants();
}

async function getRestaurant(id) {
  const [restaurant, users, settings] = await Promise.all([
    repo.getRestaurantById(id),
    repo.getUsersByRestaurant(id),
    repo.getSettings(id),
  ]);
  if (!restaurant) throw new NotFoundError('Restaurant');
  return { ...restaurant, users, settings };
}

async function createRestaurant(name) {
  if (!name || !name.trim()) throw new ValidationError('name is required');
  const restaurant = await repo.createRestaurant(name.trim());
  // Seed default settings for the new restaurant
  await Promise.all([
    repo.setSetting(restaurant.id, 'timezone', 'UTC'),
    repo.setSetting(restaurant.id, 'currency', 'USD'),
  ]);
  return restaurant;
}

async function updateRestaurant(id, name) {
  if (!name || !name.trim()) throw new ValidationError('name is required');
  const restaurant = await repo.updateRestaurant(id, name.trim());
  if (!restaurant) throw new NotFoundError('Restaurant');
  return restaurant;
}

async function deleteRestaurant(id) {
  const result = await repo.deleteRestaurant(id);
  if (!result) throw new NotFoundError('Restaurant');
  return result;
}

// ── Users ─────────────────────────────────────────────────────────────────────

async function createUser({ email, password, role, restaurantId }) {
  if (!email || !password) throw new ValidationError('email and password are required');
  if (!VALID_ROLES.includes(role)) throw new ValidationError(`role must be one of: ${VALID_ROLES.join(', ')}`);
  assertStrongPassword(password);
  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  return repo.createUserForRestaurant({ email, password: hashed, role, restaurantId });
}

async function deleteUser(userId, restaurantId) {
  const user = await repo.deleteUser(userId, restaurantId);
  if (!user) throw new NotFoundError('User');
  return user;
}

// ── Settings ──────────────────────────────────────────────────────────────────

async function getSettings(restaurantId) {
  return repo.getSettings(restaurantId);
}

async function updateSetting(restaurantId, key, value) {
  if (key === 'timezone' && !VALID_TIMEZONES.has(value))
    throw new ValidationError(`Invalid timezone: ${value}`);
  if (key === 'currency' && !VALID_CURRENCIES.has(value))
    throw new ValidationError(`Invalid currency: ${value}`);
  if (key === 'tax_rate' || key === 'service_charge') {
    const n = parseFloat(value);
    if (isNaN(n) || n < 0 || n > 100)
      throw new ValidationError(`${key} must be a number between 0 and 100`);
  }
  const VALID_KEYS = new Set(['timezone', 'currency', 'tax_rate', 'service_charge']);
  if (!VALID_KEYS.has(key)) throw new ValidationError(`Unknown setting: ${key}`);
  await repo.setSetting(restaurantId, key, value);
  return repo.getSettings(restaurantId);
}

async function getAuditLogs({ restaurantId, from, to, resourceType, limit }) {
  return repo.getAuditLogs({ restaurantId, from, to, resourceType, limit });
}

async function verifyPassword(superAdminId, password) {
  const admin = await repo.findSuperAdminById(superAdminId);
  if (!admin) throw new UnauthorizedError('Invalid credentials');
  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) throw new UnauthorizedError('Invalid credentials');
  return { ok: true, email: admin.email };
}

module.exports = {
  login,
  setup,
  getAllRestaurants,
  getRestaurant,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  createUser,
  deleteUser,
  getSettings,
  updateSetting,
  getAuditLogs,
  verifyPassword,
};
