const repo = require('./orders.repository');
const tablesInterface = require('../tables/tables.interface');
const menuInterface = require('../menu/menu.interface');
const settingsRepo = require('../settings/settings.repository');
const inventoryService = require('../inventory/inventory.service');
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

async function createOrder({ restaurantId, tableId, createdBy, items, channel = 'dining', customerRef = null, assignedStaffId = null }) {
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

  const order = await repo.create({ restaurantId, tableId, createdBy, items, channel, customerRef, assignedStaffId });

  if (tableId) {
    await tablesInterface.setTableStatus(tableId, 'occupied', restaurantId);
  }

  // Deduct recipe ingredients immediately when order is placed — fire-and-forget
  inventoryService.deductForOrder(
    order.id, restaurantId,
    items.map(i => ({ menu_item_id: i.menuItemId, quantity: i.quantity })),
  );

  ws.broadcast('NEW_ORDER', { orderId: order.id, tableId: order.table_id }, restaurantId);

  return order;
}

async function addItems(orderId, items, restaurantId) {
  const order = await getById(orderId, restaurantId);
  if (['paid', 'cancelled'].includes(order.status)) {
    throw new ValidationError('Cannot add items to a paid or cancelled order');
  }
  await repo.addItems(orderId, items);
  // New items on a served order go back to kitchen — reset to received
  if (order.status === 'served') {
    await repo.updateStatus(orderId, 'received');
  }

  // Deduct ingredients for the newly added items — fire-and-forget
  inventoryService.deductForOrder(
    orderId, restaurantId,
    items.map(i => ({ menu_item_id: i.menuItemId, quantity: i.quantity })),
  );

  ws.broadcast('ORDER_UPDATED', { orderId }, restaurantId);
  return getById(orderId, restaurantId);
}

const ITEM_STATUS_ORDER = ['pending', 'preparing', 'ready', 'served'];
const CANCELLABLE_ITEM_STATUSES = ['pending', 'preparing'];

async function updateItemStatus(orderId, itemId, status, restaurantId) {
  const validStatuses = [...ITEM_STATUS_ORDER, 'cancelled'];
  if (!validStatuses.includes(status))
    throw new ValidationError(`Invalid item status: ${status}`);

  if (status === 'cancelled') {
    const order = await getById(orderId, restaurantId);
    if (['paid', 'cancelled'].includes(order.status))
      throw new ValidationError('Cannot update items on a paid or cancelled order');
    // Fetch current item status to enforce cancellable constraint
    const [itemRow] = await repo.getItemStatuses(orderId).then((rows) => rows.filter((r) => r.id === itemId));
    if (!itemRow) throw new NotFoundError('Order item');
    const currentStatus = itemRow.status ?? 'pending';
    if (!CANCELLABLE_ITEM_STATUSES.includes(currentStatus))
      throw new ValidationError(`Cannot cancel an item that is already ${currentStatus}`);
    const updated = await repo.updateItemStatus(itemId, orderId, 'cancelled');
    if (!updated) throw new NotFoundError('Order item');

    // Return ingredients for the cancelled item — fire-and-forget
    inventoryService.returnStock(orderId, restaurantId, [
      { menu_item_id: itemRow.menu_item_id, quantity: itemRow.quantity },
    ]);

    // Re-evaluate order status now that this item is gone
    const allItems = await repo.getItemStatuses(orderId);
    const remaining = allItems.filter((i) => i.status !== 'cancelled');
    let nextOrderStatus = null;
    if (remaining.length === 0) {
      nextOrderStatus = 'cancelled';
    } else if (remaining.every((i) => (i.status ?? 'pending') === 'served')) {
      nextOrderStatus = 'served';
    } else if (remaining.every((i) => ['ready', 'served'].includes(i.status ?? 'pending'))) {
      nextOrderStatus = 'ready';
    }
    if (nextOrderStatus) await repo.updateStatus(orderId, nextOrderStatus);

    ws.broadcast('ORDER_UPDATED', { orderId }, restaurantId);
    return getById(orderId, restaurantId);
  }

  const order = await getById(orderId, restaurantId);
  if (['paid', 'cancelled'].includes(order.status))
    throw new ValidationError('Cannot update items on a paid or cancelled order');

  const updated = await repo.updateItemStatus(itemId, orderId, status);
  if (!updated) throw new NotFoundError('Order item');

  // Auto-advance order status based on collective item state (ignore cancelled)
  const allItems = await repo.getItemStatuses(orderId);
  const statuses = allItems.filter((i) => i.status !== 'cancelled').map((i) => i.status ?? 'pending');
  const allAtLeast = (min) => statuses.every((s) => ITEM_STATUS_ORDER.indexOf(s) >= ITEM_STATUS_ORDER.indexOf(min));

  let nextOrderStatus = null;
  if (allAtLeast('served')   && order.status === 'ready')     nextOrderStatus = 'served';
  else if (allAtLeast('ready')    && order.status === 'preparing') nextOrderStatus = 'ready';
  else if (statuses.some((s) => s === 'preparing') && order.status === 'received') nextOrderStatus = 'preparing';

  if (nextOrderStatus) await repo.updateStatus(orderId, nextOrderStatus);

  ws.broadcast('ORDER_UPDATED', { orderId }, restaurantId);
  return getById(orderId, restaurantId);
}

async function cancelPendingItems(orderId, restaurantId) {
  const order = await getById(orderId, restaurantId);
  if (['paid', 'cancelled'].includes(order.status))
    throw new ValidationError('Cannot cancel a paid or already-cancelled order');

  const allItems = await repo.getItemStatuses(orderId);
  const toCancelIds = allItems
    .filter((i) => CANCELLABLE_ITEM_STATUSES.includes(i.status))
    .map((i) => i.id);

  if (toCancelIds.length === 0)
    throw new ValidationError('No pending or preparing items to cancel');

  for (const itemId of toCancelIds) {
    await repo.updateItemStatus(itemId, orderId, 'cancelled');
  }

  // Return ingredients for all bulk-cancelled items — fire-and-forget
  inventoryService.returnStock(
    orderId, restaurantId,
    allItems
      .filter((i) => toCancelIds.includes(i.id))
      .map((i) => ({ menu_item_id: i.menu_item_id, quantity: i.quantity })),
  );

  // Determine what remains
  const remaining = allItems.filter((i) => !toCancelIds.includes(i.id) && i.status !== 'cancelled');

  let nextStatus;
  if (remaining.length === 0) {
    nextStatus = 'cancelled';
  } else if (remaining.every((i) => i.status === 'served')) {
    nextStatus = 'served';
  } else {
    nextStatus = 'ready';
  }
  await repo.updateStatus(orderId, nextStatus);

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
  updateItemStatus,
  cancelPendingItems,
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
