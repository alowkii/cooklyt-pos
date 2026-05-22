const jwt = require('jsonwebtoken');
const { UnauthorizedError, ForbiddenError } = require('../shared/errors');

function authenticateSuperAdmin(req, res, next) {
  const cookieToken = req.cookies?.admin_token;
  const authHeader  = req.headers['authorization'];
  const token       = cookieToken || (authHeader && authHeader.split(' ')[1]);

  if (!token) return next(new UnauthorizedError('No token provided'));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'super_admin') {
      return next(new ForbiddenError('Super admin access required'));
    }
    req.superAdmin = decoded;
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}

module.exports = { authenticateSuperAdmin };
