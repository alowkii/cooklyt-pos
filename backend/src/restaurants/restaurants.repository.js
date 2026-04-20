const db = require('../shared/db');

const findById = (id) =>
  db.query('SELECT id, name, created_at FROM restaurants WHERE id = $1', [id])
    .then((r) => r.rows[0]);

const findAll = () =>
  db.query('SELECT id, name, created_at FROM restaurants ORDER BY created_at ASC')
    .then((r) => r.rows);

const create = (name) =>
  db.query(
    'INSERT INTO restaurants (name) VALUES ($1) RETURNING id, name, created_at',
    [name],
  ).then((r) => r.rows[0]);

module.exports = { findById, findAll, create };
