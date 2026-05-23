const db = require('../shared/db');

const list = (restaurantId, { includeInactive = false } = {}) =>
  db.query(
    `SELECT * FROM coupons WHERE restaurant_id = $1 ${includeInactive ? '' : 'AND is_active = true'}
     ORDER BY created_at DESC`,
    [restaurantId],
  ).then((r) => r.rows);

const getById = (restaurantId, id) =>
  db.query(
    'SELECT * FROM coupons WHERE restaurant_id = $1 AND id = $2',
    [restaurantId, id],
  ).then((r) => r.rows[0] || null);

const getByCode = (restaurantId, code) =>
  db.query(
    'SELECT * FROM coupons WHERE restaurant_id = $1 AND code = $2',
    [restaurantId, code.toUpperCase()],
  ).then((r) => r.rows[0] || null);

const create = (restaurantId, { code, description, discountType, discountValue, minOrderAmount, maxUses, expiresAt }) =>
  db.query(
    `INSERT INTO coupons
       (restaurant_id, code, description, discount_type, discount_value, min_order_amount, max_uses, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      restaurantId,
      code.toUpperCase(),
      description || null,
      discountType,
      discountValue,
      minOrderAmount || 0,
      maxUses || null,
      expiresAt || null,
    ],
  ).then((r) => r.rows[0]);

const update = (restaurantId, id, fields) => {
  const sets = [];
  const vals = [restaurantId, id];
  let i = 3;
  if (fields.code        !== undefined) { sets.push(`code = $${i++}`);              vals.push(fields.code.toUpperCase()); }
  if (fields.description !== undefined) { sets.push(`description = $${i++}`);       vals.push(fields.description); }
  if (fields.discountType  !== undefined) { sets.push(`discount_type = $${i++}`);   vals.push(fields.discountType); }
  if (fields.discountValue !== undefined) { sets.push(`discount_value = $${i++}`);  vals.push(fields.discountValue); }
  if (fields.minOrderAmount !== undefined) { sets.push(`min_order_amount = $${i++}`); vals.push(fields.minOrderAmount); }
  if (fields.maxUses  !== undefined) { sets.push(`max_uses = $${i++}`);             vals.push(fields.maxUses); }
  if (fields.expiresAt !== undefined) { sets.push(`expires_at = $${i++}`);          vals.push(fields.expiresAt); }
  if (fields.isActive  !== undefined) { sets.push(`is_active = $${i++}`);           vals.push(fields.isActive); }
  if (!sets.length) return getById(restaurantId, id);
  return db.query(
    `UPDATE coupons SET ${sets.join(', ')} WHERE restaurant_id = $1 AND id = $2 RETURNING *`,
    vals,
  ).then((r) => r.rows[0]);
};

const remove = (id) =>
  db.query('DELETE FROM coupons WHERE id = $1', [id]);

const hasRedemptions = (id) =>
  db.query('SELECT 1 FROM coupon_redemptions WHERE coupon_id = $1 LIMIT 1', [id])
    .then((r) => r.rows.length > 0);

// Atomically record redemption + increment uses_count
const recordRedemption = async (restaurantId, couponId, orderId, discountAmount) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO coupon_redemptions (coupon_id, order_id, restaurant_id, discount_amount)
       VALUES ($1, $2, $3, $4)`,
      [couponId, orderId, restaurantId, discountAmount],
    );
    await client.query(
      'UPDATE coupons SET uses_count = uses_count + 1 WHERE id = $1',
      [couponId],
    );
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

// Undo redemption if coupon is removed from an order before payment
const removeRedemption = async (orderId) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const res = await client.query(
      'DELETE FROM coupon_redemptions WHERE order_id = $1 RETURNING coupon_id',
      [orderId],
    );
    if (res.rows.length) {
      await client.query(
        'UPDATE coupons SET uses_count = GREATEST(uses_count - 1, 0) WHERE id = $1',
        [res.rows[0].coupon_id],
      );
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

module.exports = { list, getById, getByCode, create, update, remove, hasRedemptions, recordRedemption, removeRedemption };
