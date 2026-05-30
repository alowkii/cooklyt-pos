const jwt  = require('jsonwebtoken');
const repo = require('./admin.repository');
const { UnauthorizedError, ForbiddenError } = require('../shared/errors');

async function authenticateSuperAdmin(req, res, next) {
  const cookieToken = req.cookies?.admin_token;
  const authHeader  = req.headers['authorization'];
  const token       = cookieToken || (authHeader && authHeader.split(' ')[1]);

  if (!token) return next(new UnauthorizedError('No token provided'));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'super_admin') {
      return next(new ForbiddenError('Super admin access required'));
    }

    // Verify the account still exists — catches deleted admins whose JWT is still valid
    const admin = await repo.findSuperAdminById(decoded.superAdminId);
    if (!admin) return next(new UnauthorizedError('Account not found'));

    req.superAdmin = decoded;
    next();
  } catch (e) {
    next(e instanceof UnauthorizedError || e instanceof ForbiddenError
      ? e
      : new UnauthorizedError('Invalid or expired token'));
  }
}

function requireEmailVerified(req, res, next) {
  if (!req.superAdmin?.emailVerified) {
    return next(new ForbiddenError('Please verify your email address to perform this action'));
  }
  next();
}

module.exports = { authenticateSuperAdmin, requireEmailVerified };
