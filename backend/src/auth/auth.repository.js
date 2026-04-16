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

async function findAllUsers() {
  const { rows } = await db.query(
    "SELECT id, email, role, created_at FROM users ORDER BY created_at DESC",
  );
  return rows;
}

async function deleteUser(id) {
  const { rows } = await db.query(
    "DELETE FROM users WHERE id = $1 RETURNING id, email, role",
    [id],
  );
  return rows[0];
}

async function updateUserRole(id, role) {
  const { rows } = await db.query(
    "UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, role, created_at",
    [role, id],
  );
  return rows[0];
}

module.exports = { findUserByEmail, findUserById, createUser, findAllUsers, deleteUser, updateUserRole };
