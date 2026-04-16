const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const repo = require("./auth.repository");
const { UnauthorizedError, ValidationError, NotFoundError } = require("../shared/errors");

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

async function getAllUsers() {
  return repo.findAllUsers();
}

async function deleteUser(targetId, requestingUserId) {
  if (targetId === requestingUserId)
    throw new ValidationError("You cannot delete your own account");
  const user = await repo.findUserById(targetId);
  if (!user) throw new NotFoundError("User");
  return repo.deleteUser(targetId);
}

const VALID_ROLES = ["admin", "staff", "kitchen"];

async function updateUserRole(targetId, role, requestingUserId) {
  if (targetId === requestingUserId)
    throw new ValidationError("You cannot change your own role");
  if (!VALID_ROLES.includes(role))
    throw new ValidationError(`role must be one of: ${VALID_ROLES.join(", ")}`);
  const user = await repo.findUserById(targetId);
  if (!user) throw new NotFoundError("User");
  return repo.updateUserRole(targetId, role);
}

module.exports = { login, register, me, getAllUsers, deleteUser, updateUserRole };
