const db = require("../shared/db");

const getById = (id) =>
  db.query("SELECT * FROM payments WHERE id = $1", [id]).then((r) => r.rows[0]);

const getByOrderId = (orderId) =>
  db
    .query("SELECT * FROM payments WHERE order_id = $1", [orderId])
    .then((r) => r.rows);

const create = ({ orderId, amount, method }) =>
  db
    .query(
      `INSERT INTO payments (order_id, amount, method, status)
     VALUES ($1, $2, $3, 'pending')
     RETURNING *`,
      [orderId, amount, method],
    )
    .then((r) => r.rows[0]);

const updateStatus = (id, status) =>
  db
    .query("UPDATE payments SET status = $1 WHERE id = $2 RETURNING *", [
      status,
      id,
    ])
    .then((r) => r.rows[0]);

module.exports = { getById, getByOrderId, create, updateStatus };
