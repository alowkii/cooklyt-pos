// The ONLY way other modules touch menu data.
const service = require('./menu.service');

module.exports = {
  getAvailableItems: (restaurantId) => service.getAvailable(restaurantId),
  getItemById:       (id, restaurantId) => service.getById(id, restaurantId),
  getItemPrice:      (id, restaurantId) => service.getById(id, restaurantId).then((i) => i?.price),
};
