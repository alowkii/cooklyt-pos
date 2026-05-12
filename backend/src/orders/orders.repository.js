const db = require('../shared/db');

const getById = (id, restaurantId) =>
  db
    .query('SELECT * FROM orders WHERE id = $1 AND restaurant_id = $2', [id, restaurantId])
    .then((r) => r.rows[0]);

const getActiveByTable = (tableId, restaurantId) =>
  db
    .query(
      `SELECT o.*,
              json_agg(json_build_object(
                'id', oi.id,
                'menu_item_id', oi.menu_item_id,
                'quantity', oi.quantity,
                'notes', oi.notes,
                'name', mi.name,
                'price', mi.price
              )) AS items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN menu_items mi  ON mi.id = oi.menu_item_id
       WHERE o.table_id = $1 AND o.restaurant_id = $2
         AND o.status NOT IN ('paid', 'cancelled')
       GROUP BY o.id`,
      [tableId, restaurantId],
    )
    .then((r) => r.rows);

const getItemsByOrderId = (orderId) =>
  db
    .query(
      `SELECT oi.*, mi.name, mi.price
       FROM order_items oi
       JOIN menu_items mi ON mi.id = oi.menu_item_id
       WHERE oi.order_id = $1`,
      [orderId],
    )
    .then((r) => r.rows);

const create = async ({ restaurantId, tableId, createdBy, items, channel = 'dining', customerRef = null }) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const {
      rows: [order],
    } = await client.query(
      `INSERT INTO orders (restaurant_id, table_id, created_by, status, channel, customer_ref)
       VALUES ($1, $2, $3, 'received', $4, $5) RETURNING *`,
      [restaurantId, tableId || null, createdBy, channel, customerRef],
    );

    for (const item of items) {
      await client.query(
        'INSERT INTO order_items (order_id, menu_item_id, quantity, notes) VALUES ($1, $2, $3, $4)',
        [order.id, item.menuItemId, item.quantity, item.notes || null],
      );
    }

    await client.query('COMMIT');
    return order;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

const addItems = async (orderId, items) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    for (const item of items) {
      await client.query(
        'INSERT INTO order_items (order_id, menu_item_id, quantity, notes) VALUES ($1, $2, $3, $4)',
        [orderId, item.menuItemId, item.quantity, item.notes || null],
      );
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

const updateStatus = (id, status) =>
  db
    .query('UPDATE orders SET status = $1 WHERE id = $2 RETURNING *', [status, id])
    .then((r) => r.rows[0]);

const setDiscount = (id, discountType, discountValue) =>
  db
    .query(
      'UPDATE orders SET discount_type = $1, discount_value = $2 WHERE id = $3 RETURNING *',
      [discountType, discountValue, id],
    )
    .then((r) => r.rows[0]);

const calculateTotal = (orderId) =>
  db
    .query(
      `SELECT COALESCE(SUM(mi.price * oi.quantity), 0) AS total
       FROM order_items oi
       JOIN menu_items mi ON mi.id = oi.menu_item_id
       WHERE oi.order_id = $1`,
      [orderId],
    )
    .then((r) => parseFloat(r.rows[0].total));

const getHistory = (restaurantId, { from, to, status, channel, timezone }) =>
  db.query(
    `SELECT
       o.id,
       o.status,
       o.channel,
       o.customer_ref,
       o.created_at,
       o.discount_type,
       o.discount_value,
       t.number        AS table_number,
       u.email         AS created_by_email,
       p.method        AS payment_method,
       p.total_charged,
       p.subtotal      AS bill_subtotal,
       p.tax_rate,
       p.tax_amount,
       p.service_charge_rate,
       p.service_charge_amount,
       p.discount_amount AS bill_discount_amount,
       COALESCE(SUM(mi.price * oi.quantity), 0) AS items_total,
       COALESCE(
         json_agg(
           json_build_object(
             'name',     mi.name,
             'quantity', oi.quantity,
             'price',    mi.price,
             'notes',    oi.notes
           ) ORDER BY mi.name
         ) FILTER (WHERE oi.id IS NOT NULL),
         '[]'::json
       ) AS items
     FROM orders o
     LEFT JOIN users       u  ON u.id  = o.created_by
     LEFT JOIN tables      t  ON t.id  = o.table_id
     LEFT JOIN (
       SELECT
         order_id,
         CASE WHEN COUNT(*) = 1 THEN MAX(method) ELSE 'split' END AS method,
         SUM(total_charged)         AS total_charged,
         SUM(subtotal)              AS subtotal,
         MAX(tax_rate)              AS tax_rate,
         SUM(tax_amount)            AS tax_amount,
         MAX(service_charge_rate)   AS service_charge_rate,
         SUM(service_charge_amount) AS service_charge_amount,
         SUM(discount_amount)       AS discount_amount
       FROM payments
       WHERE status = 'completed'
       GROUP BY order_id
     ) p ON p.order_id = o.id
     LEFT JOIN order_items oi ON oi.order_id = o.id
     LEFT JOIN menu_items  mi ON mi.id = oi.menu_item_id
     WHERE o.restaurant_id = $1
       AND (o.created_at AT TIME ZONE $2)::date >= $3::date
       AND (o.created_at AT TIME ZONE $2)::date <= $4::date
       AND ($5::text IS NULL OR o.status  = $5)
       AND ($6::text IS NULL OR o.channel = $6)
     GROUP BY o.id, t.number, u.email,
              p.method, p.total_charged, p.subtotal,
              p.tax_rate, p.tax_amount,
              p.service_charge_rate, p.service_charge_amount,
              p.discount_amount
     ORDER BY o.created_at DESC`,
    [restaurantId, timezone, from, to, status || null, channel || null],
  ).then((r) => r.rows);

module.exports = {
  getById,
  getActiveByTable,
  getItemsByOrderId,
  create,
  addItems,
  updateStatus,
  setDiscount,
  calculateTotal,
  getHistory,
};
