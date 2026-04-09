const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const repo = require("./auth.repository");
const { UnauthorizedError, ValidationError } = require("../shared/errors");

const SALT_ROUNDS = 10;

async function login(email, password) {
  if (!email || !password)
    throw new ValidationError("Email and password are required");

  const user = await repo.findUserByEmail(email);
  if (!user) throw new UnauthorizedError("Invalid credentials");

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new UnauthorizedError("Invalid credentials");

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "8h" },
  );

  return {
    token,
    user: { id: user.id, email: user.email, role: user.role },
  };
}

async function register(email, password, role = "staff") {
  if (!email || !password)
    throw new ValidationError("Email and password are required");

  const existing = await repo.findUserByEmail(email);
  if (existing) throw new ValidationError("Email already in use");

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  return repo.createUser({ email, password: hashed, role });
}

async function me(userId) {
  const user = await repo.findUserById(userId);
  if (!user) throw new UnauthorizedError("User not found");
  return user;
}

module.exports = { login, register, me };
