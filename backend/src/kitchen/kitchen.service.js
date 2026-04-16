const repo = require("./kitchen.repository");
const ordersInterface = require("../orders/orders.interface");
const tablesInterface = require("../tables/tables.interface");
const ws = require("../shared/websocket");

async function getKitchenQueue() {
  // Can also be built from interface calls — repo gives us a richer joined view
  return repo.getPendingItems();
}

async function markOrderPreparing(orderId) {
  const updated = await ordersInterface.updateOrderStatus(orderId, "preparing");
  ws.broadcast("ORDER_PREPARING", { orderId });
  return updated;
}

async function markOrderReady(orderId) {
  const updated = await ordersInterface.updateOrderStatus(orderId, "ready");
  ws.broadcast("ORDER_READY", { orderId });
  return updated;
}

async function markOrderServed(orderId) {
  const updated = await ordersInterface.updateOrderStatus(orderId, "served");
  ws.broadcast("ORDER_SERVED", { orderId });
  return updated;
}

module.exports = { getKitchenQueue, markOrderPreparing, markOrderReady, markOrderServed };
