const repo = require('./menu.repository');
const { NotFoundError, ValidationError } = require('../shared/errors');

async function getAll(restaurantId) {
  return repo.getAll(restaurantId);
}

async function getAvailable(restaurantId) {
  return repo.getAvailable(restaurantId);
}

async function getById(id, restaurantId) {
  const item = await repo.getById(id, restaurantId);
  if (!item) throw new NotFoundError('Menu item');
  return item;
}

async function create({ name, price, category, sku }, restaurantId) {
  if (!name || price === undefined)
    throw new ValidationError('name and price are required');
  if (price < 0) throw new ValidationError('price must be non-negative');
  return repo.create({ name, price, category, sku: sku || null, restaurantId });
}

async function update(id, fields, restaurantId) {
  await getById(id, restaurantId);
  const updated = await repo.update(id, fields, restaurantId);
  return updated;
}

async function remove(id, restaurantId) {
  await getById(id, restaurantId);
  return repo.remove(id, restaurantId);
}

module.exports = { getAll, getAvailable, getById, create, update, remove };
