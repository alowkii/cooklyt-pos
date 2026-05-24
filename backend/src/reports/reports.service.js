const repo = require('./reports.repository');
const { ValidationError } = require('../shared/errors');

const VALID_GROUPS = ['day', 'week', 'month'];

function parseDate(dateStr, field = 'date') {
  if (!dateStr) throw new ValidationError(`${field} is required (YYYY-MM-DD)`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) throw new ValidationError(`${field} must be YYYY-MM-DD`);
  const d = new Date(dateStr);
  if (isNaN(d)) throw new ValidationError(`${field} is not a valid date`);
  return dateStr;
}

function validateTz(tz) {
  if (typeof tz !== 'string' || !/^[A-Za-z0-9/_+\-]+$/.test(tz)) {
    throw new ValidationError('Invalid timezone identifier');
  }
  return tz;
}

function validateGroup(g) {
  if (!VALID_GROUPS.includes(g)) {
    throw new ValidationError(`group must be one of: ${VALID_GROUPS.join(', ')}`);
  }
  return g;
}

function validateRange(from, to) {
  if (from > to) throw new ValidationError('from must be on or before to');
  const days = (new Date(to) - new Date(from)) / 86_400_000;
  if (days > 366) throw new ValidationError('Date range cannot exceed 366 days');
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

async function getTrends(fromStr, toStr, tzStr = 'UTC', groupStr = 'day', restaurantId) {
  const from  = parseDate(fromStr, 'from');
  const to    = parseDate(toStr,   'to');
  const tz    = validateTz(tzStr);
  const group = validateGroup(groupStr);
  validateRange(from, to);

  const rows = await repo.getTrends(from, to, tz, group, restaurantId);
  return {
    from, to, group,
    rows: rows.map((r) => ({
      period:  r.period,
      orders:  r.orders,
      revenue: parseFloat(r.revenue),
    })),
  };
}

async function getItemProfitability(fromStr, toStr, tzStr = 'UTC', limitRaw, restaurantId) {
  const from  = parseDate(fromStr, 'from');
  const to    = parseDate(toStr,   'to');
  const tz    = validateTz(tzStr);
  const limit = Math.min(parseInt(limitRaw, 10) || 50, 200);
  validateRange(from, to);

  const rows = await repo.getItemProfitability(from, to, tz, limit, restaurantId);
  return {
    from, to,
    items: rows.map((r) => {
      const revenue      = parseFloat(r.revenue);
      const costPerUnit  = r.cost_per_unit != null ? parseFloat(r.cost_per_unit) : null;
      const sellingPrice = parseFloat(r.selling_price);
      const totalCost    = costPerUnit != null ? costPerUnit * r.total_sold : null;
      const profit       = totalCost   != null ? revenue - totalCost : null;
      const marginPct    = profit != null && revenue > 0 ? (profit / revenue) * 100 : null;
      return {
        id:            r.id,
        name:          r.name,
        category:      r.category,
        selling_price: sellingPrice,
        total_sold:    r.total_sold,
        revenue,
        cost_per_unit: costPerUnit,
        total_cost:    totalCost,
        profit,
        margin_pct:    marginPct != null ? parseFloat(marginPct.toFixed(2)) : null,
      };
    }),
  };
}

async function getStaffPerformance(fromStr, toStr, tzStr = 'UTC', restaurantId) {
  const from = parseDate(fromStr, 'from');
  const to   = parseDate(toStr,   'to');
  const tz   = validateTz(tzStr);
  validateRange(from, to);

  const rows = await repo.getStaffPerformance(from, to, tz, restaurantId);
  return {
    from, to,
    staff: rows.map((r) => ({
      id:              r.id,
      name:            r.name,
      email:           r.email,
      role:            r.role,
      orders_created:  r.orders_created,
      revenue_handled: parseFloat(r.revenue_handled),
    })),
  };
}

async function getItemsByPeriod(fromStr, toStr, tzStr = 'UTC', groupStr = 'day', limitRaw, restaurantId) {
  const from  = parseDate(fromStr, 'from');
  const to    = parseDate(toStr,   'to');
  const tz    = validateTz(tzStr);
  const group = validateGroup(groupStr);
  const limit = Math.min(parseInt(limitRaw, 10) || 8, 20);
  validateRange(from, to);

  const rows = await repo.getItemsByPeriod(from, to, tz, group, limit, restaurantId);
  return {
    from, to, group,
    rows: rows.map((r) => ({
      period:     r.period,
      name:       r.name,
      total_sold: r.total_sold,
      revenue:    parseFloat(r.revenue),
    })),
  };
}

async function getStaffByPeriod(fromStr, toStr, tzStr = 'UTC', groupStr = 'day', restaurantId) {
  const from  = parseDate(fromStr, 'from');
  const to    = parseDate(toStr,   'to');
  const tz    = validateTz(tzStr);
  const group = validateGroup(groupStr);
  validateRange(from, to);

  const rows = await repo.getStaffByPeriod(from, to, tz, group, restaurantId);
  return {
    from, to, group,
    rows: rows.map((r) => ({
      period:          r.period,
      name:            r.name,
      orders_created:  r.orders_created,
      revenue_handled: parseFloat(r.revenue_handled),
    })),
  };
}

module.exports = { getDailySummary, getTrends, getItemProfitability, getStaffPerformance, getItemsByPeriod, getStaffByPeriod };
