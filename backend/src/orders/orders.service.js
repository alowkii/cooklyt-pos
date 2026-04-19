const repo = require("./orders.repository");
const tablesInterface = require("../tables/tables.interface");
const menuInterface = require("../menu/menu.interface");
const ws = require("../shared/websocket");
const { NotFoundError, ValidationError } = require("../shared/errors");

async function getById(orderId) {
  const order = await repo.getById(orderId);
  if (!order) throw new NotFoundError("Order");
  return order;
}

async function getActiveByTable(tableId) {
  return repo.getActiveByTable(tableId);
}

async function createOrder({ tableId, createdBy, items, channel = 'dining', customerRef = null }) {
  const VALID_CHANNELS = ['dining', 'takeaway', 'delivery'];
  if (!VALID_CHANNELS.includes(channel)) {
    throw new ValidationError(`Invalid channel: ${channel}`);
  }
  if (channel === 'dining' && !tableId) {
    throw new ValidationError("tableId is required for dining orders");
  }
  if (!items || items.length === 0) {
    throw new ValidationError("At least one item is required");
  }

  // Validate all menu items exist and are available
  const menuItems = await menuInterface.getAvailableItems();
  const availableIds = new Set(menuItems.map((i) => i.id));
  for (const item of items) {
    if (!availableIds.has(item.menuItemId)) {
      throw new ValidationError(
        `Menu item ${item.menuItemId} is not available`,
      );
    }
  }

  const order = await repo.create({ tableId, createdBy, items, channel, customerRef });

  // Only mark table occupied for dine-in
  if (tableId) {
    await tablesInterface.setTableStatus(tableId, "occupied");
  }

  ws.broadcast("NEW_ORDER", { orderId: order.id, tableId: order.table_id });

  return order;
}

async function addItems(orderId, items) {
  await getById(orderId);
  await repo.addItems(orderId, items);
  ws.broadcast("ORDER_UPDATED", { orderId });
  return getById(orderId);
}

async function updateStatus(orderId, status) {
  const VALID = ["received", "preparing", "ready", "served", "paid", "cancelled"];
  if (!VALID.includes(status))
    throw new ValidationError(`Invalid status: ${status}`);
  await getById(orderId);
  const updated = await repo.updateStatus(orderId, status);
  ws.broadcast("ORDER_STATUS_CHANGED", { orderId, status });
  return updated;
}

async function calculateTotal(orderId) {
  return repo.calculateTotal(orderId);
}

async function markOrderPaid(orderId) {
  return updateStatus(orderId, "paid");
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
