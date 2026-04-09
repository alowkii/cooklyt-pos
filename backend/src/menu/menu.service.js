const repo = require("./menu.repository");
const { NotFoundError, ValidationError } = require("../shared/errors");

async function getAll() {
  return repo.getAll();
}

async function getAvailable() {
  return repo.getAvailable();
}

async function getById(id) {
  const item = await repo.getById(id);
  if (!item) throw new NotFoundError("Menu item");
  return item;
}

async function create({ name, price, category }) {
  if (!name || price === undefined)
    throw new ValidationError("name and price are required");
  if (price < 0) throw new ValidationError("price must be non-negative");
  return repo.create({ name, price, category });
}

async function update(id, fields) {
  await getById(id); // ensure it exists
  const updated = await repo.update(id, fields);
  return updated;
}

async function remove(id) {
  await getById(id);
  return repo.remove(id);
}

module.exports = { getAll, getAvailable, getById, create, update, remove };
