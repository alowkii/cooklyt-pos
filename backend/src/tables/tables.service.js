const repo = require('./tables.repository');
const ws = require('../shared/websocket');
const db = require('../shared/db');
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

async function updateStatus(tableId, status, restaurantId, reservation = null) {
  const VALID = ['available', 'occupied', 'reserved', 'cleaning'];
  if (!VALID.includes(status))
    throw new ValidationError(`status must be one of: ${VALID.join(', ')}`);
  await getById(tableId, restaurantId);
  return repo.updateStatus(tableId, status, restaurantId, reservation);
}

async function updatePosition(id, x, y, restaurantId) {
  await getById(id, restaurantId);
  return repo.updatePosition(id, x, y, restaurantId);
}

async function remove(id, restaurantId) {
  await getById(id, restaurantId);
  return repo.remove(id, restaurantId);
}

async function assignStaff(tableId, staffId, restaurantId) {
  await getById(tableId, restaurantId);
  if (staffId !== null) {
    const { rows } = await require('../shared/db').query(
      'SELECT id FROM users WHERE id = $1 AND restaurant_id = $2 AND role = $3',
      [staffId, restaurantId, 'staff'],
    );
    if (!rows[0]) throw new NotFoundError('Staff member');
  }
  const updated = await repo.assignStaff(tableId, staffId, restaurantId);
  ws.broadcast('TABLE_UPDATED', { tableId }, restaurantId);
  if (staffId !== null) {
    const payload = { tableId, tableNumber: updated.number };
    // Persist notification so it survives logout/reload
    await db.query(
      `INSERT INTO staff_notifications (user_id, restaurant_id, event, data)
       VALUES ($1, $2, 'STAFF_ASSIGNED', $3)`,
      [staffId, restaurantId, JSON.stringify(payload)],
    );
    ws.sendToUser(staffId, 'STAFF_ASSIGNED', payload, restaurantId);
  }
  return updated;
}

module.exports = { getAll, getById, getByStatus, create, updateStatus, updatePosition, remove, assignStaff };
