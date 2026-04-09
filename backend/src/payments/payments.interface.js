// The ONLY way other modules touch payment data.
const service = require("./payments.service");

module.exports = {
  processPayment: (orderId, details) =>
    service.processPayment(orderId, details),
  getPaymentsForOrder: (orderId) => service.getPaymentsForOrder(orderId),
};
