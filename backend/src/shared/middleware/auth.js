const jwt = require('jsonwebtoken');
const db = require('../db');
const { UnauthorizedError, ForbiddenError } = require('../errors');

async function authenticate(req, res, next) {
  // HttpOnly cookie takes priority; fall back to Authorization header for
  // non-browser clients (CLI tools, tests, mobile apps).
  const cookieToken = req.cookies?.pos_token;
  const authHeader  = req.headers['authorization'];
  const token       = cookieToken || (authHeader && authHeader.split(' ')[1]);

  if (!token) return next(new UnauthorizedError('No token provided'));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // For a normal staff token, validate the live user account in a single query:
    //   - the user must still exist (catches deleted accounts whose JWT is unexpired)
    //   - the user must be active (catches disabled accounts immediately)
    //   - the token must post-date the last password change (revocation)
    if (decoded.userId) {
      const { rows } = await db.query(
        'SELECT is_active, EXTRACT(EPOCH FROM password_changed_at)::bigint AS pca FROM users WHERE id = $1',
        [decoded.userId],
      );
      const user = rows[0];
      if (!user) return next(new UnauthorizedError('Account no longer exists'));
      if (user.is_active === false) return next(new UnauthorizedError('Account is disabled'));
      if (decoded.iat && user.pca != null && Number(user.pca) > decoded.iat) {
        return next(new UnauthorizedError('Token revoked — please sign in again'));
      }
    } else if (decoded.restaurantId) {
      // Tokens without a userId (if any) still get the tenant-exists check.
      const { rowCount } = await db.query(
        'SELECT 1 FROM restaurants WHERE id = $1',
        [decoded.restaurantId],
      );
      if (rowCount === 0) return next(new UnauthorizedError('Restaurant no longer exists'));
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
