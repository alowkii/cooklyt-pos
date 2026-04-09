const db = require("../shared/db");

// Reports is READ-ONLY — never writes to any table

const getDailySummary = (date) =>
  db
    .query(
      `
    SELECT
      COUNT(DISTINCT o.id)  AS total_orders,
      COALESCE(SUM(p.amount), 0) AS total_revenue
    FROM orders o
    JOIN payments p ON p.order_id = o.id
    WHERE DATE(o.created_at) = $1
      AND p.status = 'completed'
  `,
      [date],
    )
    .then((r) => r.rows[0]);

const getRevenueByCategory = (date) =>
  db
    .query(
      `
    SELECT
      mi.category,
      COUNT(oi.id)          AS items_sold,
      SUM(mi.price * oi.quantity) AS revenue
    FROM order_items oi
    JOIN menu_items mi ON mi.id = oi.menu_item_id
    JOIN orders o      ON o.id = oi.order_id
    JOIN payments p    ON p.order_id = o.id
    WHERE DATE(o.created_at) = $1
      AND p.status = 'completed'
    GROUP BY mi.category
    ORDER BY revenue DESC
  `,
      [date],
    )
    .then((r) => r.rows);

const getTopItems = (date, limit = 10) =>
  db
    .query(
      `
    SELECT
      mi.name,
      mi.category,
      SUM(oi.quantity) AS total_sold,
      SUM(mi.price * oi.quantity) AS revenue
    FROM order_items oi
    JOIN menu_items mi ON mi.id = oi.menu_item_id
    JOIN orders o      ON o.id = oi.order_id
    JOIN payments p    ON p.order_id = o.id
    WHERE DATE(o.created_at) = $1
      AND p.status = 'completed'
    GROUP BY mi.id, mi.name, mi.category
    ORDER BY total_sold DESC
    LIMIT $2
  `,
      [date, limit],
    )
    .then((r) => r.rows);

const getHourlySales = (date) =>
  db
    .query(
      `
    SELECT
      EXTRACT(HOUR FROM o.created_at) AS hour,
      COUNT(DISTINCT o.id)            AS orders,
      COALESCE(SUM(p.amount), 0)      AS revenue
    FROM orders o
    JOIN payments p ON p.order_id = o.id
    WHERE DATE(o.created_at) = $1
      AND p.status = 'completed'
    GROUP BY hour
    ORDER BY hour
  `,
      [date],
    )
    .then((r) => r.rows);

module.exports = {
  getDailySummary,
  getRevenueByCategory,
  getTopItems,
  getHourlySales,
};
