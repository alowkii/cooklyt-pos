const repo = require('./reviews.repository');
const { ValidationError } = require('../shared/errors');

function validateTz(tz) {
  if (typeof tz !== 'string' || !/^[A-Za-z0-9/_+\-]+$/.test(tz)) {
    throw new ValidationError('Invalid timezone identifier');
  }
  return tz;
}

const list = (restaurantId, { from, to, rating, timezone = 'UTC' } = {}) =>
  repo.list(restaurantId, {
    from:     from || null,
    to:       to || null,
    rating:   rating ? parseInt(rating, 10) : null,
    timezone: validateTz(timezone),
  });

module.exports = { list };
