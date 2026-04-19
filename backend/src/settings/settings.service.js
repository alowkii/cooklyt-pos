const repo = require('./settings.repository');
const { ValidationError } = require('../shared/errors');

const ALLOWED_KEYS = new Set(['timezone', 'currency']);

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

async function getAll() {
  return repo.getAll();
}

async function update(key, value) {
  if (!ALLOWED_KEYS.has(key)) {
    throw new ValidationError(`Unknown setting: ${key}`);
  }
  if (key === 'timezone') validateTz(value);
  if (key === 'currency') validateCurrency(value);

  await repo.set(key, value);
  return repo.getAll();
}

module.exports = { getAll, update };
