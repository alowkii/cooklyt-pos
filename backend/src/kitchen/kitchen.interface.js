// The ONLY way other modules touch kitchen data.
const service = require("./kitchen.service");

module.exports = {
  getKitchenQueue: () => service.getKitchenQueue(),
  markOrderPreparing: (orderId) => service.markOrderPreparing(orderId),
  markOrderReady: (orderId) => service.markOrderReady(orderId),
};
