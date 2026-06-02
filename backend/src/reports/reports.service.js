const repo = require('./reports.repository');
const { ValidationError } = require('../shared/errors');

const VALID_GROUPS   = ['day', 'week', 'month'];
const VALID_CHANNELS = new Set(['dining', 'takeaway', 'delivery']);

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

function validateChannel(ch) {
  if (!ch || ch === 'all') return null;
  if (!VALID_CHANNELS.has(ch)) throw new ValidationError(`channel must be one of: ${[...VALID_CHANNELS].join(', ')}`);
  return ch;
}

function validateRange(from, to) {
  if (from > to) throw new ValidationError('from must be on or before to');
  const days = (new Date(to) - new Date(from)) / 86_400_000;
  if (days > 366) throw new ValidationError('Date range cannot exceed 366 days');
}

async function getDailySummary(dateStr, tzStr = 'UTC', restaurantId, channelRaw) {
  const date    = parseDate(dateStr);
  const tz      = validateTz(tzStr);
  const channel = validateChannel(channelRaw);
  const [summary, byCategory, topItems, hourly] = await Promise.all([
    repo.getDailySummary(date, tz, restaurantId, channel),
    repo.getRevenueByCategory(date, tz, restaurantId, channel),
    repo.getTopItems(date, tz, 10, restaurantId, channel),
    repo.getHourlySales(date, tz, restaurantId, channel),
  ]);
  return { date, summary, byCategory, topItems, hourly };
}

async function getTrends(fromStr, toStr, tzStr = 'UTC', groupStr = 'day', restaurantId, channelRaw) {
  const from    = parseDate(fromStr, 'from');
  const to      = parseDate(toStr,   'to');
  const tz      = validateTz(tzStr);
  const group   = validateGroup(groupStr);
  const channel = validateChannel(channelRaw);
  validateRange(from, to);

  const rows = await repo.getTrends(from, to, tz, group, restaurantId, channel);
  return {
    from, to, group,
    rows: rows.map((r) => ({
      period:  r.period,
      orders:  r.orders,
      revenue: parseFloat(r.revenue),
    })),
  };
}

async function getItemProfitability(fromStr, toStr, tzStr = 'UTC', limitRaw, restaurantId, channelRaw) {
  const from    = parseDate(fromStr, 'from');
  const to      = parseDate(toStr,   'to');
  const tz      = validateTz(tzStr);
  const limit   = Math.min(parseInt(limitRaw, 10) || 50, 200);
  const channel = validateChannel(channelRaw);
  validateRange(from, to);

  const rows = await repo.getItemProfitability(from, to, tz, limit, restaurantId, channel);
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

async function getStaffPerformance(fromStr, toStr, tzStr = 'UTC', restaurantId, channelRaw) {
  const from    = parseDate(fromStr, 'from');
  const to      = parseDate(toStr,   'to');
  const tz      = validateTz(tzStr);
  const channel = validateChannel(channelRaw);
  validateRange(from, to);

  const rows = await repo.getStaffPerformance(from, to, tz, restaurantId, channel);
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

async function getItemsByPeriod(fromStr, toStr, tzStr = 'UTC', groupStr = 'day', limitRaw, restaurantId, channelRaw) {
  const from    = parseDate(fromStr, 'from');
  const to      = parseDate(toStr,   'to');
  const tz      = validateTz(tzStr);
  const group   = validateGroup(groupStr);
  const limit   = Math.min(parseInt(limitRaw, 10) || 8, 20);
  const channel = validateChannel(channelRaw);
  validateRange(from, to);

  const rows = await repo.getItemsByPeriod(from, to, tz, group, limit, restaurantId, channel);
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

async function getStaffByPeriod(fromStr, toStr, tzStr = 'UTC', groupStr = 'day', restaurantId, channelRaw) {
  const from    = parseDate(fromStr, 'from');
  const to      = parseDate(toStr,   'to');
  const tz      = validateTz(tzStr);
  const group   = validateGroup(groupStr);
  const channel = validateChannel(channelRaw);
  validateRange(from, to);

  const rows = await repo.getStaffByPeriod(from, to, tz, group, restaurantId, channel);
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

async function getSalesSummaryReport(fromStr, toStr, tzStr = 'UTC', restaurantId, channelRaw) {
  const from    = parseDate(fromStr, 'from');
  const to      = parseDate(toStr,   'to');
  const tz      = validateTz(tzStr);
  const channel = validateChannel(channelRaw);
  validateRange(from, to);

  const [summary, byChannel] = await Promise.all([
    repo.getSalesSummary(from, to, tz, restaurantId, channel),
    repo.getRevenueByChannel(from, to, tz, restaurantId), // always all channels
  ]);
  const f = (v) => parseFloat(v ?? 0);
  return {
    from, to,
    summary: {
      total_orders:            parseInt(summary.total_orders, 10) || 0,
      total_revenue:           f(summary.total_revenue),
      subtotal:                f(summary.subtotal),
      tax_amount:              f(summary.tax_amount),
      service_charge:          f(summary.service_charge),
      discount_amount:         f(summary.discount_amount),
      coupon_discount_amount:  f(summary.coupon_discount_amount),
      loyalty_discount_amount: f(summary.loyalty_discount_amount),
      packaging_fee:           f(summary.packaging_fee),
      total_items_sold:        parseInt(summary.total_items_sold, 10) || 0,
    },
    byChannel: byChannel.map((r) => ({
      channel:         r.channel,
      orders:          r.orders,
      revenue:         f(r.revenue),
      avg_order_value: f(r.avg_order_value),
    })),
  };
}

async function getCollectionReport(fromStr, toStr, tzStr = 'UTC', restaurantId, channelRaw) {
  const from    = parseDate(fromStr, 'from');
  const to      = parseDate(toStr,   'to');
  const tz      = validateTz(tzStr);
  const channel = validateChannel(channelRaw);
  validateRange(from, to);

  const [byMethod, byCounter] = await Promise.all([
    repo.getCollectionByMethod(from, to, tz, restaurantId, channel),
    repo.getCollectionByCounter(from, to, tz, restaurantId, channel),
  ]);
  return {
    from, to,
    byMethod:  byMethod.map((r)  => ({ method: r.method, orders: r.orders, amount: parseFloat(r.amount) })),
    byCounter: byCounter.map((r) => ({ counter_name: r.counter_name, email: r.email, role: r.role, orders: r.orders, amount: parseFloat(r.amount) })),
  };
}

async function getItemGroupsReport(fromStr, toStr, tzStr = 'UTC', limitRaw, restaurantId, channelRaw) {
  const from    = parseDate(fromStr, 'from');
  const to      = parseDate(toStr,   'to');
  const tz      = validateTz(tzStr);
  const limit   = Math.min(parseInt(limitRaw, 10) || 100, 200);
  const channel = validateChannel(channelRaw);
  validateRange(from, to);

  const [byGroup, topItems] = await Promise.all([
    repo.getRevenueByItemGroup(from, to, tz, restaurantId, channel),
    repo.getTopSellingItems(from, to, tz, limit, restaurantId, channel),
  ]);
  return {
    from, to,
    byGroup:  byGroup.map((r)  => ({ item_group: r.item_group, orders: r.orders, items_sold: r.items_sold, revenue: parseFloat(r.revenue) })),
    topItems: topItems.map((r) => ({ id: r.id, name: r.name, category: r.category, total_sold: r.total_sold, revenue: parseFloat(r.revenue) })),
  };
}

async function getTableWiseSalesReport(fromStr, toStr, tzStr = 'UTC', restaurantId) {
  const from = parseDate(fromStr, 'from');
  const to   = parseDate(toStr,   'to');
  const tz   = validateTz(tzStr);
  validateRange(from, to);

  const rows = await repo.getTableWiseSales(from, to, tz, restaurantId);
  return {
    from, to,
    tables: rows.map((r) => ({
      table_number:    r.table_number,
      orders:          r.orders,
      revenue:         parseFloat(r.revenue),
      avg_order_value: parseFloat(r.avg_order_value),
    })),
  };
}

async function getNCSalesReport(fromStr, toStr, tzStr = 'UTC', restaurantId, channelRaw) {
  const from    = parseDate(fromStr, 'from');
  const to      = parseDate(toStr,   'to');
  const tz      = validateTz(tzStr);
  const channel = validateChannel(channelRaw);
  validateRange(from, to);

  const rows = await repo.getNCSales(from, to, tz, restaurantId, channel);
  const totalValue = rows.reduce((s, r) => s + parseFloat(r.order_value || 0), 0);
  return {
    from, to,
    summary: { total_cancelled: rows.length, total_value_cancelled: totalValue },
    orders: rows.map((r) => ({
      id:           r.id,
      channel:      r.channel,
      created_at:   r.created_at,
      created_by:   r.created_by,
      table_number: r.table_number,
      order_value:  parseFloat(r.order_value || 0),
    })),
  };
}

module.exports = { getDailySummary, getTrends, getItemProfitability, getStaffPerformance, getItemsByPeriod, getStaffByPeriod, getSalesSummaryReport, getCollectionReport, getItemGroupsReport, getTableWiseSalesReport, getNCSalesReport };
