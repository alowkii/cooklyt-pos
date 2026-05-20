// The ONLY way other modules touch table data.
const service = require('./tables.service');

const repo = require('./tables.repository');

module.exports = {
  getOccupiedTables:  (restaurantId) => service.getByStatus('occupied', restaurantId),
  getAvailableTables: (restaurantId) => service.getByStatus('available', restaurantId),
  setTableStatus:     (tableId, status, restaurantId) => service.updateStatus(tableId, status, restaurantId),
  getTableById:       (tableId, restaurantId) => service.getById(tableId, restaurantId),
  // Internal-only: updates table.assigned_staff_id without the user-facing role check
  setTableStaff:      (tableId, staffId, restaurantId) => repo.assignStaff(tableId, staffId, restaurantId),
};
