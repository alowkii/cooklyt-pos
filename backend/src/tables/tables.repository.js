const db = require("../shared/db");

const getAll = () =>
  db.query("SELECT * FROM tables ORDER BY number").then((r) => r.rows);

const getById = (id) =>
  db.query("SELECT * FROM tables WHERE id = $1", [id]).then((r) => r.rows[0]);

const getByStatus = (status) =>
  db
    .query("SELECT * FROM tables WHERE status = $1 ORDER BY number", [status])
    .then((r) => r.rows);

const create = ({ number, seats }) =>
  db
    .query(
      "INSERT INTO tables (number, seats, status) VALUES ($1, $2, 'available') RETURNING *",
      [number, seats],
    )
    .then((r) => r.rows[0]);

const updateStatus = (id, status) =>
  db
    .query("UPDATE tables SET status = $1 WHERE id = $2 RETURNING *", [
      status,
      id,
    ])
    .then((r) => r.rows[0]);

const remove = (id) =>
  db
    .query("DELETE FROM tables WHERE id = $1 RETURNING *", [id])
    .then((r) => r.rows[0]);

module.exports = { getAll, getById, getByStatus, create, updateStatus, remove };
