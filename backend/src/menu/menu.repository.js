const db = require("../shared/db");

const getAll = () =>
  db
    .query("SELECT * FROM menu_items ORDER BY category, name")
    .then((r) => r.rows);

const getAvailable = () =>
  db
    .query(
      "SELECT * FROM menu_items WHERE available = true ORDER BY category, name",
    )
    .then((r) => r.rows);

const getById = (id) =>
  db
    .query("SELECT * FROM menu_items WHERE id = $1", [id])
    .then((r) => r.rows[0]);

const create = ({ name, price, category }) =>
  db
    .query(
      "INSERT INTO menu_items (name, price, category) VALUES ($1, $2, $3) RETURNING *",
      [name, price, category],
    )
    .then((r) => r.rows[0]);

const update = (id, { name, price, category, available }) =>
  db
    .query(
      `UPDATE menu_items
     SET name = COALESCE($1, name),
         price = COALESCE($2, price),
         category = COALESCE($3, category),
         available = COALESCE($4, available)
     WHERE id = $5
     RETURNING *`,
      [name, price, category, available, id],
    )
    .then((r) => r.rows[0]);

const remove = (id) =>
  db
    .query("DELETE FROM menu_items WHERE id = $1 RETURNING *", [id])
    .then((r) => r.rows[0]);

module.exports = { getAll, getAvailable, getById, create, update, remove };
