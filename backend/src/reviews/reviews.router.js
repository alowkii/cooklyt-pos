const router = require('express').Router();
const db     = require('../shared/db');
const { authenticate, authorize } = require('../shared/middleware/auth');
const { ValidationError } = require('../shared/errors');

function validateTz(tz) {
  if (typeof tz !== 'string' || !/^[A-Za-z0-9/_+\-]+$/.test(tz)) {
    throw new ValidationError('Invalid timezone identifier');
  }
  return tz;
}

router.get('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { from, to, rating, timezone: rawTz = 'UTC' } = req.query;
    const timezone = validateTz(rawTz);
    const { rows } = await db.query(
      `SELECT
         r.id,
         r.overall_rating,
         r.food_rating,
         r.service_rating,
         r.comment,
         r.created_at,
         r.customer_phone,
         r.loyalty_customer_id,
         t.number AS table_number,
         lc.name  AS customer_name
       FROM reviews r
       LEFT JOIN tables            t  ON t.id  = r.table_id
       LEFT JOIN loyalty_customers lc ON lc.id = r.loyalty_customer_id
       WHERE r.restaurant_id = $1
         AND ($2::text IS NULL OR (r.created_at AT TIME ZONE $3)::date >= $2::date)
         AND ($4::text IS NULL OR (r.created_at AT TIME ZONE $3)::date <= $4::date)
         AND ($5::int  IS NULL OR r.overall_rating >= $5)
       ORDER BY r.created_at DESC`,
      [
        req.user.restaurantId,
        from   || null,
        timezone,
        to     || null,
        rating ? parseInt(rating, 10) : null,
      ],
    );
    res.json(rows);
  } catch (e) { next(e); }
});

module.exports = router;
