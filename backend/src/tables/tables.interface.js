// The ONLY way other modules touch table data.
const service = require('./tables.service');

module.exports = {
  getOccupiedTables:  (restaurantId) => service.getByStatus('occupied', restaurantId),
  getAvailableTables: (restaurantId) => service.getByStatus('available', restaurantId),
  setTableStatus:     (tableId, status, restaurantId) => service.updateStatus(tableId, status, restaurantId),
  getTableById:       (tableId, restaurantId) => service.getById(tableId, restaurantId),
};
