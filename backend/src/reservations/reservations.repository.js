const db = require('../shared/db');

const BASE_SELECT = `
  SELECT r.*,
         t.number AS table_number,
         t.seats  AS table_seats
  FROM reservations r
  LEFT JOIN tables t ON t.id = r.table_id
`;

const getAll = (restaurantId, { date, status } = {}) => {
  const params = [restaurantId];
  let where = 'WHERE r.restaurant_id = $1';
  if (date) {
    params.push(date);
    where += ` AND r.reserved_at::date = $${params.length}::date`;
  }
  if (status) {
    params.push(status);
    where += ` AND r.status = $${params.length}`;
  }
  return db.query(`${BASE_SELECT} ${where} ORDER BY r.reserved_at ASC`, params).then((r) => r.rows);
};

const getById = (id, restaurantId) =>
  db.query('SELECT * FROM reservations WHERE id = $1 AND restaurant_id = $2', [id, restaurantId])
    .then((r) => r.rows[0]);

const create = ({ restaurantId, tableId, guestName, guestPhone, partySize, reservedAt, notes }) =>
  db.query(
    `INSERT INTO reservations (restaurant_id, table_id, guest_name, guest_phone, party_size, reserved_at, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [restaurantId, tableId || null, guestName, guestPhone || null, partySize || null, reservedAt, notes || null],
  ).then((r) => r.rows[0]);

const update = (id, restaurantId, fields) => {
  const sets = [];
  const params = [id, restaurantId];
  const map = {
    guestName:  'guest_name',
    guestPhone: 'guest_phone',
    partySize:  'party_size',
    reservedAt: 'reserved_at',
    notes:      'notes',
    tableId:    'table_id',
    status:     'status',
  };
  for (const [key, col] of Object.entries(map)) {
    if (key in fields) {
      params.push(fields[key] ?? null);
      sets.push(`${col} = $${params.length}`);
    }
  }
  if (!sets.length) return getById(id, restaurantId);
  return db.query(
    `UPDATE reservations SET ${sets.join(', ')} WHERE id = $1 AND restaurant_id = $2 RETURNING *`,
    params,
  ).then((r) => r.rows[0]);
};

const remove = (id, restaurantId) =>
  db.query('DELETE FROM reservations WHERE id = $1 AND restaurant_id = $2 RETURNING *', [id, restaurantId])
    .then((r) => r.rows[0]);

module.exports = { getAll, getById, create, update, remove };
