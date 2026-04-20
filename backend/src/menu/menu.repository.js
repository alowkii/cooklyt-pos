const db = require('../shared/db');

const getAll = (restaurantId) =>
  db
    .query(
      'SELECT * FROM menu_items WHERE restaurant_id = $1 ORDER BY category, name',
      [restaurantId],
    )
    .then((r) => r.rows);

const getAvailable = (restaurantId) =>
  db
    .query(
      'SELECT * FROM menu_items WHERE restaurant_id = $1 AND available = true ORDER BY category, name',
      [restaurantId],
    )
    .then((r) => r.rows);

const getById = (id, restaurantId) =>
  db
    .query('SELECT * FROM menu_items WHERE id = $1 AND restaurant_id = $2', [id, restaurantId])
    .then((r) => r.rows[0]);

const create = ({ name, price, category, restaurantId }) =>
  db
    .query(
      'INSERT INTO menu_items (name, price, category, restaurant_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, price, category, restaurantId],
    )
    .then((r) => r.rows[0]);

const update = (id, { name, price, category, available }, restaurantId) =>
  db
    .query(
      `UPDATE menu_items
       SET name      = COALESCE($1, name),
           price     = COALESCE($2, price),
           category  = COALESCE($3, category),
           available = COALESCE($4, available)
       WHERE id = $5 AND restaurant_id = $6
       RETURNING *`,
      [name, price, category, available, id, restaurantId],
    )
    .then((r) => r.rows[0]);

const remove = (id, restaurantId) =>
  db
    .query(
      'DELETE FROM menu_items WHERE id = $1 AND restaurant_id = $2 RETURNING *',
      [id, restaurantId],
    )
    .then((r) => r.rows[0]);

module.exports = { getAll, getAvailable, getById, create, update, remove };
