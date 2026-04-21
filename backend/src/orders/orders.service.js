const repo = require('./orders.repository');
const tablesInterface = require('../tables/tables.interface');
const menuInterface = require('../menu/menu.interface');
const settingsRepo = require('../settings/settings.repository');
const ws = require('../shared/websocket');
const { NotFoundError, ValidationError } = require('../shared/errors');

async function getById(orderId, restaurantId) {
  const order = await repo.getById(orderId, restaurantId);
  if (!order) throw new NotFoundError('Order');
  return order;
}

async function getActiveByTable(tableId, restaurantId) {
  return repo.getActiveByTable(tableId, restaurantId);
}

async function createOrder({ restaurantId, tableId, createdBy, items, channel = 'dining', customerRef = null }) {
  const VALID_CHANNELS = ['dining', 'takeaway', 'delivery'];
  if (!VALID_CHANNELS.includes(channel)) {
    throw new ValidationError(`Invalid channel: ${channel}`);
  }
  if (channel === 'dining' && !tableId) {
    throw new ValidationError('tableId is required for dining orders');
  }
  if (!items || items.length === 0) {
    throw new ValidationError('At least one item is required');
  }

  // Validate all menu items exist and are available for this restaurant
  const menuItems = await menuInterface.getAvailableItems(restaurantId);
  const availableIds = new Set(menuItems.map((i) => i.id));
  for (const item of items) {
    if (!availableIds.has(item.menuItemId)) {
      throw new ValidationError(`Menu item ${item.menuItemId} is not available`);
    }
  }

  const order = await repo.create({ restaurantId, tableId, createdBy, items, channel, customerRef });

  if (tableId) {
    await tablesInterface.setTableStatus(tableId, 'occupied', restaurantId);
  }

  ws.broadcast('NEW_ORDER', { orderId: order.id, tableId: order.table_id }, restaurantId);

  return order;
}

async function addItems(orderId, items, restaurantId) {
  await getById(orderId, restaurantId);
  await repo.addItems(orderId, items);
  ws.broadcast('ORDER_UPDATED', { orderId }, restaurantId);
  return getById(orderId, restaurantId);
}

async function updateStatus(orderId, status, restaurantId) {
  const VALID = ['received', 'preparing', 'ready', 'served', 'paid', 'cancelled'];
  if (!VALID.includes(status))
    throw new ValidationError(`Invalid status: ${status}`);
  await getById(orderId, restaurantId);
  const updated = await repo.updateStatus(orderId, status);
  ws.broadcast('ORDER_STATUS_CHANGED', { orderId, status }, restaurantId);
  return updated;
}

async function calculateTotal(orderId, restaurantId) {
  await getById(orderId, restaurantId);
  return repo.calculateTotal(orderId);
}

async function markOrderPaid(orderId, restaurantId) {
  return updateStatus(orderId, 'paid', restaurantId);
}

async function getItems(orderId, restaurantId) {
  await getById(orderId, restaurantId);
  return repo.getItemsByOrderId(orderId);
}

async function applyDiscount(orderId, discountType, discountValue, restaurantId) {
  const VALID_TYPES = ['percent', 'flat'];
  if (discountType !== null && !VALID_TYPES.includes(discountType))
    throw new ValidationError('discount_type must be percent, flat, or null');
  const value = parseFloat(discountValue ?? 0);
  if (isNaN(value) || value < 0)
    throw new ValidationError('discount_value must be a non-negative number');
  if (discountType === 'percent' && value > 100)
    throw new ValidationError('Percent discount cannot exceed 100');

  const order = await getById(orderId, restaurantId);
  if (['paid', 'cancelled'].includes(order.status))
    throw new ValidationError('Cannot modify a paid or cancelled order');

  return repo.setDiscount(orderId, discountType, value);
}

module.exports = {
  getById,
  getActiveByTable,
  createOrder,
  addItems,
  updateStatus,
  calculateTotal,
  markOrderPaid,
  getItems,
  applyDiscount,
  getHistory,
};

async function getHistory(restaurantId, { from, to, status, channel }) {
  const settings = await settingsRepo.getAll(restaurantId);
  const timezone = settings.timezone || 'UTC';
  const orders = await repo.getHistory(restaurantId, { from, to, status, channel, timezone });

  const stats = orders.reduce(
    (acc, o) => {
      acc.total += 1;
      if (o.status === 'paid') { acc.paid += 1; acc.revenue += parseFloat(o.total_charged || 0); }
      if (o.status === 'cancelled') acc.cancelled += 1;
      return acc;
    },
    { total: 0, paid: 0, cancelled: 0, revenue: 0 },
  );
  stats.revenue = parseFloat(stats.revenue.toFixed(2));

  return { orders, stats };
}
