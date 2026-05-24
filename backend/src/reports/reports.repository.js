const db = require('../shared/db');

// Reports is READ-ONLY — never writes to any table

const getDailySummary = (date, tz = 'UTC', restaurantId) =>
  db
    .query(
      `
    SELECT
      COUNT(DISTINCT o.id)       AS total_orders,
      COALESCE(SUM(p.amount), 0) AS total_revenue
    FROM orders o
    JOIN payments p ON p.order_id = o.id
    WHERE (o.created_at AT TIME ZONE $2)::date = $1
      AND p.status = 'completed'
      AND o.restaurant_id = $3
  `,
      [date, tz, restaurantId],
    )
    .then((r) => r.rows[0]);

const getRevenueByCategory = (date, tz = 'UTC', restaurantId) =>
  db
    .query(
      `
    SELECT
      mi.category,
      COUNT(oi.id)                    AS items_sold,
      SUM(mi.price * oi.quantity)     AS revenue
    FROM order_items oi
    JOIN menu_items mi ON mi.id = oi.menu_item_id
    JOIN orders o      ON o.id = oi.order_id
    JOIN payments p    ON p.order_id = o.id
    WHERE (o.created_at AT TIME ZONE $2)::date = $1
      AND p.status = 'completed'
      AND o.restaurant_id = $3
    GROUP BY mi.category
    ORDER BY revenue DESC
  `,
      [date, tz, restaurantId],
    )
    .then((r) => r.rows);

const getTopItems = (date, tz = 'UTC', limit = 10, restaurantId) =>
  db
    .query(
      `
    SELECT
      mi.name,
      mi.category,
      SUM(oi.quantity)                AS total_sold,
      SUM(mi.price * oi.quantity)     AS revenue
    FROM order_items oi
    JOIN menu_items mi ON mi.id = oi.menu_item_id
    JOIN orders o      ON o.id = oi.order_id
    JOIN payments p    ON p.order_id = o.id
    WHERE (o.created_at AT TIME ZONE $2)::date = $1
      AND p.status = 'completed'
      AND o.restaurant_id = $4
    GROUP BY mi.id, mi.name, mi.category
    ORDER BY total_sold DESC
    LIMIT $3
  `,
      [date, tz, limit, restaurantId],
    )
    .then((r) => r.rows);

const getHourlySales = (date, tz = 'UTC', restaurantId) =>
  db
    .query(
      `
    SELECT
      EXTRACT(HOUR FROM o.created_at AT TIME ZONE $2)::int AS hour,
      COUNT(DISTINCT o.id)                                  AS orders,
      COALESCE(SUM(p.amount), 0)                            AS revenue
    FROM orders o
    JOIN payments p ON p.order_id = o.id
    WHERE (o.created_at AT TIME ZONE $2)::date = $1
      AND p.status = 'completed'
      AND o.restaurant_id = $3
    GROUP BY hour
    ORDER BY hour
  `,
      [date, tz, restaurantId],
    )
    .then((r) => r.rows);

// ── New range-based queries ───────────────────────────────────────────────────

// group must be one of 'day' | 'week' | 'month' — validated before this call
const getTrends = (from, to, tz = 'UTC', group, restaurantId) =>
  db
    .query(
      `
    SELECT
      date_trunc('${group}', o.created_at AT TIME ZONE $3)::date::text AS period,
      COUNT(DISTINCT o.id)::int                                          AS orders,
      COALESCE(SUM(p.amount), 0)                                         AS revenue
    FROM orders o
    JOIN payments p ON p.order_id = o.id
    WHERE (o.created_at AT TIME ZONE $3)::date BETWEEN $1 AND $2
      AND p.status = 'completed'
      AND o.restaurant_id = $4
    GROUP BY 1
    ORDER BY 1
  `,
      [from, to, tz, restaurantId],
    )
    .then((r) => r.rows);

const getItemProfitability = (from, to, tz = 'UTC', limit = 50, restaurantId) =>
  db
    .query(
      `
    SELECT
      mi.id,
      mi.name,
      mi.category,
      mi.price                              AS selling_price,
      SUM(oi.quantity)::int                 AS total_sold,
      SUM(mi.price * oi.quantity)           AS revenue,
      (
        SELECT COALESCE(SUM(ri.quantity * ri.cost_per_unit), NULL)
        FROM recipe_ingredients ri
        WHERE ri.recipe_id = mi.recipe_id
      )                                     AS cost_per_unit
    FROM order_items oi
    JOIN menu_items mi ON mi.id = oi.menu_item_id
    JOIN orders o      ON o.id = oi.order_id
    JOIN payments p    ON p.order_id = o.id
    WHERE (o.created_at AT TIME ZONE $3)::date BETWEEN $1 AND $2
      AND p.status = 'completed'
      AND o.restaurant_id = $4
    GROUP BY mi.id, mi.name, mi.category, mi.price
    ORDER BY revenue DESC
    LIMIT $5
  `,
      [from, to, tz, restaurantId, limit],
    )
    .then((r) => r.rows);

const getStaffPerformance = (from, to, tz = 'UTC', restaurantId) =>
  db
    .query(
      `
    SELECT
      u.id,
      COALESCE(u.name, u.email)             AS name,
      u.email,
      u.role,
      COUNT(DISTINCT o.id)::int             AS orders_created,
      COALESCE(SUM(p.amount), 0)            AS revenue_handled
    FROM users u
    LEFT JOIN orders o ON o.created_by = u.id
      AND (o.created_at AT TIME ZONE $3)::date BETWEEN $1 AND $2
    LEFT JOIN payments p ON p.order_id = o.id AND p.status = 'completed'
    WHERE u.restaurant_id = $4
      AND u.is_active = true
      AND u.role IN ('admin', 'staff', 'cashier')
    GROUP BY u.id, u.name, u.email, u.role
    ORDER BY revenue_handled DESC
  `,
      [from, to, tz, restaurantId],
    )
    .then((r) => r.rows);

// Revenue of the top `limit` items broken down by time period.
// Uses a CTE to identify top items first, then fetches their time series.
const getItemsByPeriod = (from, to, tz = 'UTC', group, limit = 8, restaurantId) =>
  db
    .query(
      `
    WITH top_items AS (
      SELECT mi.id
      FROM order_items oi
      JOIN menu_items mi ON mi.id = oi.menu_item_id
      JOIN orders o      ON o.id  = oi.order_id
      JOIN payments p    ON p.order_id = o.id
      WHERE (o.created_at AT TIME ZONE $3)::date BETWEEN $1 AND $2
        AND p.status = 'completed'
        AND o.restaurant_id = $4
      GROUP BY mi.id
      ORDER BY SUM(mi.price * oi.quantity) DESC
      LIMIT $5
    )
    SELECT
      date_trunc('${group}', o.created_at AT TIME ZONE $3)::date::text AS period,
      mi.name,
      SUM(oi.quantity)::int                AS total_sold,
      SUM(mi.price * oi.quantity)          AS revenue
    FROM order_items oi
    JOIN menu_items mi ON mi.id = oi.menu_item_id AND mi.id IN (SELECT id FROM top_items)
    JOIN orders o      ON o.id  = oi.order_id
    JOIN payments p    ON p.order_id = o.id
    WHERE (o.created_at AT TIME ZONE $3)::date BETWEEN $1 AND $2
      AND p.status = 'completed'
      AND o.restaurant_id = $4
    GROUP BY 1, mi.name
    ORDER BY 1, revenue DESC
  `,
      [from, to, tz, restaurantId, limit],
    )
    .then((r) => r.rows);

// Orders and revenue per staff member broken down by time period.
const getStaffByPeriod = (from, to, tz = 'UTC', group, restaurantId) =>
  db
    .query(
      `
    SELECT
      date_trunc('${group}', o.created_at AT TIME ZONE $3)::date::text AS period,
      COALESCE(u.name, u.email)              AS name,
      COUNT(DISTINCT o.id)::int              AS orders_created,
      COALESCE(SUM(p.amount), 0)             AS revenue_handled
    FROM users u
    JOIN orders o   ON o.created_by = u.id
      AND (o.created_at AT TIME ZONE $3)::date BETWEEN $1 AND $2
    JOIN payments p ON p.order_id = o.id AND p.status = 'completed'
    WHERE u.restaurant_id = $4
      AND u.is_active = true
      AND u.role IN ('admin', 'staff', 'cashier')
    GROUP BY 1, u.id, u.name, u.email
    ORDER BY 1, revenue_handled DESC
  `,
      [from, to, tz, restaurantId],
    )
    .then((r) => r.rows);

module.exports = {
  getDailySummary,
  getRevenueByCategory,
  getTopItems,
  getHourlySales,
  getTrends,
  getItemProfitability,
  getStaffPerformance,
  getItemsByPeriod,
  getStaffByPeriod,
};
