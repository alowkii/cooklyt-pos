const db = require('../shared/db');

const createTransaction = ({ restaurantId, ingredientId, txnType, quantityDelta, refId, unitCost, performedBy }) =>
  db
    .query(
      `INSERT INTO inventory_transactions
         (restaurant_id, ingredient_id, txn_type, quantity_delta, ref_id, unit_cost, performed_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [restaurantId, ingredientId, txnType, quantityDelta, refId || null, unitCost || 0, performedBy || null],
    )
    .then((r) => r.rows[0]);

const getTransactions = (restaurantId, { ingredientId, txnType, from, to, limit = 100 } = {}) =>
  db
    .query(
      `SELECT it.*, i.name AS ingredient_name, i.unit AS ingredient_unit
       FROM inventory_transactions it
       JOIN ingredients i ON i.id = it.ingredient_id
       WHERE it.restaurant_id = $1
         AND ($2::uuid IS NULL OR it.ingredient_id = $2::uuid)
         AND ($3::text IS NULL OR it.txn_type = $3)
         AND ($4::date IS NULL OR it.created_at::date >= $4::date)
         AND ($5::date IS NULL OR it.created_at::date <= $5::date)
       ORDER BY it.created_at DESC
       LIMIT $6`,
      [restaurantId, ingredientId || null, txnType || null, from || null, to || null, limit],
    )
    .then((r) => r.rows);

const getWasteReport = (restaurantId, { from, to } = {}) =>
  db
    .query(
      `SELECT
         wl.reason,
         i.name  AS ingredient_name,
         i.unit,
         SUM(wl.quantity)   AS total_quantity,
         SUM(wl.total_cost) AS total_cost
       FROM waste_logs wl
       JOIN ingredients i ON i.id = wl.ingredient_id
       WHERE wl.restaurant_id = $1
         AND ($2::date IS NULL OR wl.logged_at::date >= $2::date)
         AND ($3::date IS NULL OR wl.logged_at::date <= $3::date)
       GROUP BY wl.reason, i.id, i.name, i.unit
       ORDER BY total_cost DESC`,
      [restaurantId, from || null, to || null],
    )
    .then((r) => r.rows);

module.exports = { createTransaction, getTransactions, getWasteReport };
