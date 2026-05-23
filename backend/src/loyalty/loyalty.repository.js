const db = require('../shared/db');

const findByPhone = (restaurantId, phone) =>
  db.query(
    'SELECT * FROM loyalty_customers WHERE restaurant_id = $1 AND phone = $2',
    [restaurantId, phone],
  ).then((r) => r.rows[0] || null);

const findById = (restaurantId, id) =>
  db.query(
    'SELECT * FROM loyalty_customers WHERE restaurant_id = $1 AND id = $2',
    [restaurantId, id],
  ).then((r) => r.rows[0] || null);

const findOrCreate = async (restaurantId, phone, name) => {
  const res = await db.query(
    `INSERT INTO loyalty_customers (restaurant_id, phone, name)
     VALUES ($1, $2, $3)
     ON CONFLICT (restaurant_id, phone) DO UPDATE SET name = COALESCE(EXCLUDED.name, loyalty_customers.name)
     RETURNING *`,
    [restaurantId, phone, name || null],
  );
  return res.rows[0];
};

const list = (restaurantId, { search = '', limit = 50, offset = 0 } = {}) => {
  const like = `%${search}%`;
  return db.query(
    `SELECT * FROM loyalty_customers
     WHERE restaurant_id = $1 AND ($2 = '' OR phone ILIKE $3 OR name ILIKE $3)
     ORDER BY created_at DESC LIMIT $4 OFFSET $5`,
    [restaurantId, search, like, limit, offset],
  ).then((r) => r.rows);
};

const getTransactions = (restaurantId, customerId, { limit = 30, offset = 0 } = {}) =>
  db.query(
    `SELECT * FROM loyalty_transactions
     WHERE restaurant_id = $1 AND customer_id = $2
     ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
    [restaurantId, customerId, limit, offset],
  ).then((r) => r.rows);

// Transactionally add a transaction row and update the customer balance.
const addTransaction = async (restaurantId, { customerId, orderId, type, points, description }) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO loyalty_transactions (restaurant_id, customer_id, order_id, type, points, description)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [restaurantId, customerId, orderId || null, type, points, description || null],
    );
    const res = await client.query(
      'UPDATE loyalty_customers SET points_balance = points_balance + $1 WHERE id = $2 RETURNING *',
      [points, customerId],
    );
    await client.query('COMMIT');
    return res.rows[0];
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

module.exports = { findByPhone, findById, findOrCreate, list, getTransactions, addTransaction };
