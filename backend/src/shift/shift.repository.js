const db = require('../shared/db');

// Sum all cash received since a given timestamp.
// Handles both single-method cash payments and multi-tender payments that include cash.
const getCashSince = (restaurantId, since) =>
  db.query(
    `SELECT COALESCE(SUM(
       CASE
         WHEN (tenders IS NULL OR jsonb_array_length(tenders) = 0) AND method = 'cash'
           THEN total_charged
         WHEN tenders IS NOT NULL AND jsonb_array_length(tenders) > 0
           THEN (
             SELECT COALESCE(SUM((t->>'amount')::numeric), 0)
             FROM jsonb_array_elements(tenders) t
             WHERE t->>'method' = 'cash'
           )
         ELSE 0
       END
     ), 0) AS cash_total,
     COUNT(*) AS order_count
     FROM payments
     WHERE status = 'completed' AND restaurant_id = $1 AND created_at > $2`,
    [restaurantId, since],
  ).then((r) => r.rows[0]);

const getLastCount = (restaurantId) =>
  db.query(
    'SELECT * FROM shift_counts WHERE restaurant_id = $1 ORDER BY counted_at DESC LIMIT 1',
    [restaurantId],
  ).then((r) => r.rows[0] || null);

const getHistory = (restaurantId, limit = 30) =>
  db.query(
    `SELECT sc.*, u.email AS counted_by_email
     FROM shift_counts sc
     LEFT JOIN users u ON u.id = sc.counted_by
     WHERE sc.restaurant_id = $1
     ORDER BY sc.counted_at DESC LIMIT $2`,
    [restaurantId, limit],
  ).then((r) => r.rows);

const create = ({ restaurantId, countedBy, expectedCash, actualCash, variance, notes, denominations }) =>
  db.query(
    `INSERT INTO shift_counts
       (restaurant_id, counted_by, expected_cash, actual_cash, variance, notes, denominations)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      restaurantId,
      countedBy || null,
      expectedCash,
      actualCash,
      variance,
      notes || null,
      denominations ? JSON.stringify(denominations) : null,
    ],
  ).then((r) => r.rows[0]);

module.exports = { getCashSince, getLastCount, getHistory, create };
