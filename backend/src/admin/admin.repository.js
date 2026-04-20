const db = require('../shared/db');

// ── Super admin auth ────────────────────────────────────────────────────────

const findSuperAdminByEmail = (email) =>
  db.query('SELECT * FROM super_admins WHERE email = $1', [email])
    .then((r) => r.rows[0]);

const countSuperAdmins = () =>
  db.query('SELECT COUNT(*) FROM super_admins')
    .then((r) => parseInt(r.rows[0].count, 10));

const createSuperAdmin = (email, password) =>
  db.query(
    'INSERT INTO super_admins (email, password) VALUES ($1, $2) RETURNING id, email, created_at',
    [email, password],
  ).then((r) => r.rows[0]);

// ── Restaurants (cross-tenant) ───────────────────────────────────────────────

const getAllRestaurants = () =>
  db.query(
    `SELECT r.id, r.name, r.created_at,
            COUNT(u.id)::int AS user_count
     FROM restaurants r
     LEFT JOIN users u ON u.restaurant_id = r.id
     GROUP BY r.id
     ORDER BY r.created_at DESC`,
  ).then((r) => r.rows);

const getRestaurantById = (id) =>
  db.query('SELECT * FROM restaurants WHERE id = $1', [id])
    .then((r) => r.rows[0]);

const createRestaurant = (name) =>
  db.query(
    'INSERT INTO restaurants (name) VALUES ($1) RETURNING *',
    [name],
  ).then((r) => r.rows[0]);

const updateRestaurant = (id, name) =>
  db.query(
    'UPDATE restaurants SET name = $1 WHERE id = $2 RETURNING *',
    [name, id],
  ).then((r) => r.rows[0]);

const deleteRestaurant = (id) =>
  db.query('DELETE FROM restaurants WHERE id = $1 RETURNING id', [id])
    .then((r) => r.rows[0]);

// ── Users (cross-tenant) ─────────────────────────────────────────────────────

const getUsersByRestaurant = (restaurantId) =>
  db.query(
    `SELECT id, email, role, created_at FROM users
     WHERE restaurant_id = $1 ORDER BY created_at DESC`,
    [restaurantId],
  ).then((r) => r.rows);

const createUserForRestaurant = ({ email, password, role, restaurantId }) =>
  db.query(
    `INSERT INTO users (email, password, role, restaurant_id, force_password_change)
     VALUES ($1, $2, $3, $4, true) RETURNING id, email, role, created_at`,
    [email, password, role, restaurantId],
  ).then((r) => r.rows[0]);

const deleteUser = (userId, restaurantId) =>
  db.query(
    'DELETE FROM users WHERE id = $1 AND restaurant_id = $2 RETURNING id, email',
    [userId, restaurantId],
  ).then((r) => r.rows[0]);

// ── Settings (cross-tenant) ──────────────────────────────────────────────────

const getSettings = (restaurantId) =>
  db.query('SELECT key, value FROM settings WHERE restaurant_id = $1', [restaurantId])
    .then((r) => Object.fromEntries(r.rows.map((row) => [row.key, row.value])));

const setSetting = (restaurantId, key, value) =>
  db.query(
    `INSERT INTO settings (restaurant_id, key, value) VALUES ($1, $2, $3)
     ON CONFLICT (restaurant_id, key) DO UPDATE SET value = $3`,
    [restaurantId, key, value],
  );

module.exports = {
  findSuperAdminByEmail,
  countSuperAdmins,
  createSuperAdmin,
  getAllRestaurants,
  getRestaurantById,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  getUsersByRestaurant,
  createUserForRestaurant,
  deleteUser,
  getSettings,
  setSetting,
};
