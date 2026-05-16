const db = require('../shared/db');

const getAll = (restaurantId) =>
  db
    .query('SELECT * FROM ingredients WHERE restaurant_id = $1 ORDER BY name', [restaurantId])
    .then((r) => r.rows);

const getLowStock = (restaurantId) =>
  db
    .query(
      `SELECT * FROM ingredients
       WHERE restaurant_id = $1 AND is_active = true AND stock_on_hand <= reorder_level
       ORDER BY (reorder_level - stock_on_hand) DESC`,
      [restaurantId],
    )
    .then((r) => r.rows);

const getById = (id, restaurantId) =>
  db
    .query('SELECT * FROM ingredients WHERE id = $1 AND restaurant_id = $2', [id, restaurantId])
    .then((r) => r.rows[0]);

const create = ({ restaurantId, name, unit, reorderLevel, reorderQty, latestUnitCost }) =>
  db
    .query(
      `INSERT INTO ingredients (restaurant_id, name, unit, reorder_level, reorder_qty, latest_unit_cost)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [restaurantId, name, unit, reorderLevel || 0, reorderQty || 0, latestUnitCost || 0],
    )
    .then((r) => r.rows[0]);

const update = (id, { name, unit, reorderLevel, reorderQty, latestUnitCost, isActive }, restaurantId) =>
  db
    .query(
      `UPDATE ingredients
       SET name             = COALESCE($1, name),
           unit             = COALESCE($2, unit),
           reorder_level    = COALESCE($3, reorder_level),
           reorder_qty      = COALESCE($4, reorder_qty),
           latest_unit_cost = COALESCE($5, latest_unit_cost),
           is_active        = COALESCE($6, is_active)
       WHERE id = $7 AND restaurant_id = $8 RETURNING *`,
      [name ?? null, unit ?? null, reorderLevel ?? null, reorderQty ?? null, latestUnitCost ?? null, isActive ?? null, id, restaurantId],
    )
    .then((r) => r.rows[0]);

const adjustStock = (id, delta, restaurantId) =>
  db
    .query(
      `UPDATE ingredients SET stock_on_hand = stock_on_hand + $1
       WHERE id = $2 AND restaurant_id = $3 RETURNING *`,
      [delta, id, restaurantId],
    )
    .then((r) => r.rows[0]);

module.exports = { getAll, getLowStock, getById, create, update, adjustStock };
