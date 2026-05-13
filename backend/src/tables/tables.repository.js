const db = require('../shared/db');

const getAll = (restaurantId) =>
  db
    .query('SELECT * FROM tables WHERE restaurant_id = $1 ORDER BY number', [restaurantId])
    .then((r) => r.rows);

const getById = (id, restaurantId) =>
  db
    .query('SELECT * FROM tables WHERE id = $1 AND restaurant_id = $2', [id, restaurantId])
    .then((r) => r.rows[0]);

const getByStatus = (status, restaurantId) =>
  db
    .query(
      'SELECT * FROM tables WHERE status = $1 AND restaurant_id = $2 ORDER BY number',
      [status, restaurantId],
    )
    .then((r) => r.rows);

const create = ({ number, seats, restaurantId }) =>
  db
    .query(
      'INSERT INTO tables (number, seats, status, restaurant_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [number, seats, 'available', restaurantId],
    )
    .then((r) => r.rows[0]);

const updateStatus = (id, status, restaurantId) =>
  db
    .query(
      'UPDATE tables SET status = $1 WHERE id = $2 AND restaurant_id = $3 RETURNING *',
      [status, id, restaurantId],
    )
    .then((r) => r.rows[0]);

const updatePosition = (id, x, y, restaurantId) =>
  db
    .query(
      'UPDATE tables SET x_pos = $1, y_pos = $2 WHERE id = $3 AND restaurant_id = $4 RETURNING *',
      [x ?? null, y ?? null, id, restaurantId],
    )
    .then((r) => r.rows[0]);

const remove = (id, restaurantId) =>
  db
    .query('DELETE FROM tables WHERE id = $1 AND restaurant_id = $2 RETURNING *', [id, restaurantId])
    .then((r) => r.rows[0]);

module.exports = { getAll, getById, getByStatus, create, updateStatus, updatePosition, remove };
