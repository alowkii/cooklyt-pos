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

module.exports = {
  getById,
  getActiveByTable,
  getItemsByOrderId,
  create,
  addItems,
  updateStatus,
  calculateTotal,
};
