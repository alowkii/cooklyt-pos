const router = require('express').Router();
const db = require('../shared/db');
const { authenticate } = require('../shared/middleware/auth');
const { asyncHandler } = require('../shared/asyncHandler');

// GET /api/notifications — fetch unread notifications for the current user
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, event, data, read, created_at
     FROM staff_notifications
     WHERE user_id = $1 AND restaurant_id = $2
     ORDER BY created_at DESC
     LIMIT 100`,
    [req.user.userId, req.user.restaurantId],
  );
  res.json(rows);
}));

// PATCH /api/notifications/read-all — mark all as read
router.patch('/read-all', authenticate, asyncHandler(async (req, res) => {
  await db.query(
    'UPDATE staff_notifications SET read = true WHERE user_id = $1 AND restaurant_id = $2',
    [req.user.userId, req.user.restaurantId],
  );
  res.json({ ok: true });
}));

// DELETE /api/notifications — clear all for current user
router.delete('/', authenticate, asyncHandler(async (req, res) => {
  await db.query(
    'DELETE FROM staff_notifications WHERE user_id = $1 AND restaurant_id = $2',
    [req.user.userId, req.user.restaurantId],
  );
  res.json({ ok: true });
}));

module.exports = router;
