const jwt = require("jsonwebtoken");
const { UnauthorizedError, ForbiddenError } = require("../errors");

function authenticate(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

  if (!token) return next(new UnauthorizedError("No token provided"));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { userId, role }
    next();
  } catch (err) {
    next(new UnauthorizedError("Invalid or expired token"));
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new UnauthorizedError());
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError("Insufficient permissions"));
    }
    next();
  };
}

module.exports = { authenticate, authorize };
