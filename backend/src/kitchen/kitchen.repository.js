const db = require('../shared/db');

const getPendingItems = (restaurantId) =>
  db
    .query(
      `
    SELECT
      oi.id          AS order_item_id,
      oi.order_id,
      oi.quantity,
      oi.notes,
      mi.name        AS item_name,
      mi.category,
      o.table_id,
      o.channel,
      o.customer_ref,
      o.status       AS order_status,
      t.number       AS table_number,
      o.created_at   AS order_created_at
    FROM order_items oi
    JOIN orders o        ON o.id = oi.order_id
    JOIN menu_items mi   ON mi.id = oi.menu_item_id
    LEFT JOIN tables t   ON t.id = o.table_id
    WHERE o.status IN ('received', 'preparing', 'ready', 'served')
      AND o.restaurant_id = $1
    ORDER BY o.created_at ASC
  `,
      [restaurantId],
    )
    .then((r) => r.rows);

module.exports = { getPendingItems };
