const jwt = require('jsonwebtoken');
const db = require('../db');
const { UnauthorizedError, ForbiddenError } = require('../errors');

async function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) return next(new UnauthorizedError('No token provided'));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.restaurantId) {
      const { rowCount } = await db.query(
        'SELECT 1 FROM restaurants WHERE id = $1',
        [decoded.restaurantId],
      );
      if (rowCount === 0) return next(new UnauthorizedError('Restaurant no longer exists'));
    }

    // Reject tokens issued before the user's most recent password change.
    if (decoded.userId && decoded.iat) {
      const { rows } = await db.query(
        'SELECT EXTRACT(EPOCH FROM password_changed_at)::bigint AS pca FROM users WHERE id = $1',
        [decoded.userId],
      );
      if (rows[0] && rows[0].pca != null && Number(rows[0].pca) > decoded.iat) {
        return next(new UnauthorizedError('Token revoked — please sign in again'));
      }
    }

    req.user = decoded; // { userId, role, restaurantId }
    next();
  } catch (err) {
    if (err instanceof UnauthorizedError) return next(err);
    next(new UnauthorizedError('Invalid or expired token'));
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new UnauthorizedError());
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }
    next();
  };
}

module.exports = { authenticate, authorize };
