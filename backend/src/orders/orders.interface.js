// The ONLY way other modules touch order data.
const service = require("./orders.service");

module.exports = {
  getActiveOrdersForTable: (tableId) => service.getActiveByTable(tableId),
  getOrderTotal: (orderId) => service.calculateTotal(orderId),
  markOrderPaid: (orderId) => service.markOrderPaid(orderId),
  getOrderById: (orderId) => service.getById(orderId),
  updateOrderStatus: (orderId, status) => service.updateStatus(orderId, status),
};
