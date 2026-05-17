const db = require('../shared/db');

async function findUserByEmail(email) {
  const { rows } = await db.query(
    `SELECT u.*, r.name AS restaurant_name
     FROM users u
     JOIN restaurants r ON r.id = u.restaurant_id
     WHERE u.email = $1`,
    [email],
  );
  return rows[0];
}

async function findUserById(id) {
  const { rows } = await db.query(
    'SELECT id, email, role, staff_pin, restaurant_id, created_at FROM users WHERE id = $1',
    [id],
  );
  return rows[0];
}

async function createUser({ email, password, role, restaurantId }) {
  const { rows } = await db.query(
    `INSERT INTO users (email, password, role, restaurant_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, role, restaurant_id, created_at`,
    [email, password, role, restaurantId],
  );
  return rows[0];
}

async function findAllUsers(restaurantId) {
  const { rows } = await db.query(
    `SELECT id, email, role, staff_pin, created_at FROM users
     WHERE restaurant_id = $1
     ORDER BY created_at DESC`,
    [restaurantId],
  );
  return rows;
}

async function setStaffPin(id, pin, restaurantId) {
  const { rows } = await db.query(
    `UPDATE users SET staff_pin = $1
     WHERE id = $2 AND restaurant_id = $3
     RETURNING id, email, role, staff_pin, created_at`,
    [pin, id, restaurantId],
  );
  return rows[0];
}

async function findUserByPin(restaurantId, pin) {
  const { rows } = await db.query(
    `SELECT id, email, role FROM users
     WHERE restaurant_id = $1 AND staff_pin = $2`,
    [restaurantId, pin],
  );
  return rows[0];
}

async function deleteUser(id, restaurantId) {
  const { rows } = await db.query(
    'DELETE FROM users WHERE id = $1 AND restaurant_id = $2 RETURNING id, email, role',
    [id, restaurantId],
  );
  return rows[0];
}

async function updatePassword(id, hashedPassword) {
  const { rows } = await db.query(
    `UPDATE users SET password = $1,
                       force_password_change = false,
                       password_changed_at = now()
     WHERE id = $2 RETURNING id`,
    [hashedPassword, id],
  );
  return rows[0];
}

async function updateUserRole(id, role, restaurantId) {
  const { rows } = await db.query(
    `UPDATE users SET role = $1
     WHERE id = $2 AND restaurant_id = $3
     RETURNING id, email, role, created_at`,
    [role, id, restaurantId],
  );
  return rows[0];
}

async function createRestaurantWithAdmin({ restaurantName, email, password }) {
  const db = require('../shared/db');
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { rows: [restaurant] } = await client.query(
      `INSERT INTO restaurants (name) VALUES ($1) RETURNING id, name, created_at`,
      [restaurantName],
    );

    const { rows: [user] } = await client.query(
      `INSERT INTO users (email, password, role, restaurant_id)
       VALUES ($1, $2, 'admin', $3)
       RETURNING id, email, role, restaurant_id, created_at`,
      [email, password, restaurant.id],
    );

    await client.query(
      `INSERT INTO settings (restaurant_id, key, value) VALUES
         ($1, 'timezone', 'UTC'),
         ($1, 'currency', 'USD')`,
      [restaurant.id],
    );

    await client.query('COMMIT');
    return { restaurant, user };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  findAllUsers,
  deleteUser,
  updatePassword,
  updateUserRole,
  setStaffPin,
  findUserByPin,
  createRestaurantWithAdmin,
};
