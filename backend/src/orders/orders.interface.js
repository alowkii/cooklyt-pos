// The ONLY way other modules touch order data.
const service = require('./orders.service');

module.exports = {
  getActiveOrdersForTable: (tableId, restaurantId) => service.getActiveByTable(tableId, restaurantId),
  getOrderTotal:           (orderId, restaurantId) => service.calculateTotal(orderId, restaurantId),
  markOrderPaid:           (orderId, restaurantId) => service.markOrderPaid(orderId, restaurantId),
  getOrderById:            (orderId, restaurantId) => service.getById(orderId, restaurantId),
  updateOrderStatus:       (orderId, status, restaurantId) => service.updateStatus(orderId, status, restaurantId),
};
