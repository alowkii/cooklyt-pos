const db = require("../shared/db");

async function findUserByEmail(email) {
  const { rows } = await db.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);
  return rows[0];
}

async function findUserById(id) {
  const { rows } = await db.query(
    "SELECT id, email, role, created_at FROM users WHERE id = $1",
    [id],
  );
  return rows[0];
}

async function createUser({ email, password, role }) {
  const { rows } = await db.query(
    "INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id, email, role, created_at",
    [email, password, role],
  );
  return rows[0];
}

module.exports = { findUserByEmail, findUserById, createUser };
