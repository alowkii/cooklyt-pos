const repo = require("./tables.repository");
const { NotFoundError, ValidationError } = require("../shared/errors");

async function getAll() {
  return repo.getAll();
}

async function getById(id) {
  const table = await repo.getById(id);
  if (!table) throw new NotFoundError("Table");
  return table;
}

async function getByStatus(status) {
  return repo.getByStatus(status);
}

async function create({ number, seats }) {
  if (!number || !seats)
    throw new ValidationError("number and seats are required");
  try {
    return await repo.create({ number, seats });
  } catch (e) {
    if (e.code === "23505") // unique_violation
      throw new ValidationError(`Table ${number} already exists`);
    throw e;
  }
}

async function updateStatus(tableId, status) {
  const VALID = ["available", "occupied", "reserved", "cleaning"];
  if (!VALID.includes(status))
    throw new ValidationError(`status must be one of: ${VALID.join(", ")}`);
  await getById(tableId);
  return repo.updateStatus(tableId, status);
}

async function remove(id) {
  await getById(id);
  return repo.remove(id);
}

module.exports = { getAll, getById, getByStatus, create, updateStatus, remove };
