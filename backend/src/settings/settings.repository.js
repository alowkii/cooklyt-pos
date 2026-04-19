const db = require('../shared/db');

const getAll = () =>
  db.query('SELECT key, value FROM settings')
    .then((r) => Object.fromEntries(r.rows.map((row) => [row.key, row.value])));

const set = (key, value) =>
  db.query(
    'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
    [key, value],
  );

module.exports = { getAll, set };
