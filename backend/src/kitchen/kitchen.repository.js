const db = require("../shared/db");

// Kitchen gets a denormalized view of what needs to be prepared
const getPendingItems = () =>
  db
    .query(
      `
    SELECT
      oi.id         AS order_item_id,
      oi.order_id,
      oi.quantity,
      oi.notes,
      mi.name       AS item_name,
      mi.category,
      o.table_id,
      t.number      AS table_number,
      o.created_at  AS order_created_at
    FROM order_items oi
    JOIN orders o       ON o.id = oi.order_id
    JOIN menu_items mi  ON mi.id = oi.menu_item_id
    JOIN tables t       ON t.id = o.table_id
    WHERE o.status IN ('open', 'preparing')
    ORDER BY o.created_at ASC
  `,
    )
    .then((r) => r.rows);

module.exports = { getPendingItems };
