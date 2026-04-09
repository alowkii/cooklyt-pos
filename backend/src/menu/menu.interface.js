// The ONLY way other modules touch menu data.
// Never import menu.repository or menu.service directly from outside this module.
const service = require("./menu.service");

module.exports = {
  getAvailableItems: () => service.getAvailable(),
  getItemById: (id) => service.getById(id),
  getItemPrice: (id) => service.getById(id).then((i) => i?.price),
};
