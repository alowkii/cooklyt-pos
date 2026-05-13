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

const create = ({ name, price, category, sku, restaurantId }) =>
  db
    .query(
      'INSERT INTO menu_items (name, price, category, sku, restaurant_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, price, category, sku || null, restaurantId],
    )
    .then((r) => r.rows[0]);

const update = (id, { name, price, category, available, sku }, restaurantId) =>
  db
    .query(
      `UPDATE menu_items
       SET name      = COALESCE($1, name),
           price     = COALESCE($2, price),
           category  = COALESCE($3, category),
           available = COALESCE($4, available),
           sku       = COALESCE($5, sku)
       WHERE id = $6 AND restaurant_id = $7
       RETURNING *`,
      [name, price, category, available, sku || null, id, restaurantId],
    )
    .then((r) => r.rows[0]);

const remove = (id, restaurantId) =>
  db
    .query(
      'DELETE FROM menu_items WHERE id = $1 AND restaurant_id = $2 RETURNING *',
      [id, restaurantId],
    )
    .then((r) => r.rows[0]);

const getPopular = (restaurantId, limit = 6) =>
  db
    .query(
      `SELECT mi.*
       FROM menu_items mi
       INNER JOIN order_items oi ON oi.menu_item_id = mi.id
       INNER JOIN orders o ON o.id = oi.order_id
       WHERE mi.restaurant_id = $1
         AND mi.available = true
         AND o.created_at >= NOW() - INTERVAL '30 days'
       GROUP BY mi.id
       ORDER BY SUM(oi.quantity) DESC
       LIMIT $2`,
      [restaurantId, limit],
    )
    .then((r) => r.rows);

module.exports = { getAll, getAvailable, getById, create, update, remove, getPopular };
