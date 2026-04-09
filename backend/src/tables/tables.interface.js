// The ONLY way other modules touch table data.
const service = require("./tables.service");

module.exports = {
  getOccupiedTables: () => service.getByStatus("occupied"),
  getAvailableTables: () => service.getByStatus("available"),
  setTableStatus: (tableId, status) => service.updateStatus(tableId, status),
  getTableById: (tableId) => service.getById(tableId),
};
