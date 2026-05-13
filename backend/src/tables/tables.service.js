const repo = require('./tables.repository');
const { NotFoundError, ValidationError } = require('../shared/errors');

async function getAll(restaurantId) {
  return repo.getAll(restaurantId);
}

async function getById(id, restaurantId) {
  const table = await repo.getById(id, restaurantId);
  if (!table) throw new NotFoundError('Table');
  return table;
}

async function getByStatus(status, restaurantId) {
  return repo.getByStatus(status, restaurantId);
}

async function create({ number, seats }, restaurantId) {
  if (!number || !seats)
    throw new ValidationError('number and seats are required');
  try {
    return await repo.create({ number, seats, restaurantId });
  } catch (e) {
    if (e.code === '23505') // unique_violation
      throw new ValidationError(`Table ${number} already exists`);
    throw e;
  }
}

async function updateStatus(tableId, status, restaurantId) {
  const VALID = ['available', 'occupied', 'reserved', 'cleaning'];
  if (!VALID.includes(status))
    throw new ValidationError(`status must be one of: ${VALID.join(', ')}`);
  await getById(tableId, restaurantId);
  return repo.updateStatus(tableId, status, restaurantId);
}

async function updatePosition(id, x, y, restaurantId) {
  await getById(id, restaurantId);
  return repo.updatePosition(id, x, y, restaurantId);
}

async function remove(id, restaurantId) {
  await getById(id, restaurantId);
  return repo.remove(id, restaurantId);
}

module.exports = { getAll, getById, getByStatus, create, updateStatus, updatePosition, remove };
