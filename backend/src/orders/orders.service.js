const repo = require('./orders.repository');
const tablesInterface = require('../tables/tables.interface');
const menuInterface = require('../menu/menu.interface');
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

module.exports = {
  getById,
  getActiveByTable,
  createOrder,
  addItems,
  updateStatus,
  calculateTotal,
  markOrderPaid,
};
