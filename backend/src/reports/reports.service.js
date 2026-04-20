const repo = require('./reports.repository');
const { ValidationError } = require('../shared/errors');

function parseDate(dateStr) {
  if (!dateStr) throw new ValidationError('date is required (YYYY-MM-DD)');
  const d = new Date(dateStr);
  if (isNaN(d)) throw new ValidationError('Invalid date format — use YYYY-MM-DD');
  return dateStr;
}

function validateTz(tz) {
  if (typeof tz !== 'string' || !/^[A-Za-z0-9/_+\-]+$/.test(tz)) {
    throw new ValidationError('Invalid timezone identifier');
  }
  return tz;
}

async function getDailySummary(dateStr, tzStr = 'UTC', restaurantId) {
  const date = parseDate(dateStr);
  const tz   = validateTz(tzStr);
  const [summary, byCategory, topItems, hourly] = await Promise.all([
    repo.getDailySummary(date, tz, restaurantId),
    repo.getRevenueByCategory(date, tz, restaurantId),
    repo.getTopItems(date, tz, 10, restaurantId),
    repo.getHourlySales(date, tz, restaurantId),
  ]);
  return { date, summary, byCategory, topItems, hourly };
}

module.exports = { getDailySummary };
