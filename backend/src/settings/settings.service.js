const repo = require('./settings.repository');
const { ValidationError } = require('../shared/errors');

const ALLOWED_KEYS = new Set([
  'timezone', 'currency', 'tax_rate', 'service_charge', 'packaging_fee',
  'staff_assignment_enabled', 'reservations_enabled', 'loyalty_enabled',
  'loyalty_points_per_unit', 'loyalty_points_value',
  'cash_denominations', 'restaurant_open',
]);

function validateTz(tz) {
  if (typeof tz !== 'string' || !/^[A-Za-z0-9/_+\-]+$/.test(tz)) {
    throw new ValidationError('Invalid timezone identifier');
  }
}

function validateCurrency(code) {
  if (typeof code !== 'string' || !/^[A-Z]{3}$/.test(code)) {
    throw new ValidationError('Invalid currency code');
  }
}

function validateRate(value, name) {
  const n = parseFloat(value);
  if (isNaN(n) || n < 0 || n > 100) {
    throw new ValidationError(`${name} must be a number between 0 and 100`);
  }
}

async function getAll(restaurantId) {
  return repo.getAll(restaurantId);
}

async function update(key, value, restaurantId) {
  if (!ALLOWED_KEYS.has(key)) {
    throw new ValidationError(`Unknown setting: ${key}`);
  }
  if (key === 'timezone') validateTz(value);
  if (key === 'currency') validateCurrency(value);
  if (key === 'tax_rate') validateRate(value, 'tax_rate');
  if (key === 'service_charge') validateRate(value, 'service_charge');
  if (key === 'packaging_fee') {
    const n = parseFloat(value);
    if (isNaN(n) || n < 0) throw new ValidationError('packaging_fee must be a non-negative number');
  }
  if (key === 'staff_assignment_enabled') {
    if (value !== 'true' && value !== 'false') throw new ValidationError('staff_assignment_enabled must be true or false');
  }
  if (key === 'reservations_enabled') {
    if (value !== 'true' && value !== 'false') throw new ValidationError('reservations_enabled must be true or false');
  }
  if (key === 'loyalty_enabled') {
    if (value !== 'true' && value !== 'false') throw new ValidationError('loyalty_enabled must be true or false');
  }
  if (key === 'restaurant_open') {
    if (value !== 'true' && value !== 'false') throw new ValidationError('restaurant_open must be true or false');
  }
  if (key === 'loyalty_points_per_unit') {
    const n = parseFloat(value);
    if (isNaN(n) || n <= 0) throw new ValidationError('loyalty_points_per_unit must be a positive number');
  }
  if (key === 'loyalty_points_value') {
    const n = parseFloat(value);
    if (isNaN(n) || n <= 0) throw new ValidationError('loyalty_points_value must be a positive number');
  }
  if (key === 'cash_denominations') {
    const parts = String(value).split(',').map((s) => parseFloat(s.trim()));
    if (parts.length === 0 || parts.some((n) => isNaN(n) || n <= 0)) {
      throw new ValidationError('cash_denominations must be a comma-separated list of positive numbers');
    }
  }
  await repo.set(restaurantId, key, value);
  return repo.getAll(restaurantId);
}

module.exports = { getAll, update };
