const repo = require('./modifiers.repository');
const { NotFoundError, ValidationError } = require('../shared/errors');

async function getGroups(restaurantId) {
  return repo.getGroups(restaurantId);
}

async function createGroup(data, restaurantId) {
  if (!data.name) throw new ValidationError('name is required');
  return repo.createGroup({ ...data, restaurantId });
}

async function updateGroup(id, data, restaurantId) {
  const updated = await repo.updateGroup(id, data, restaurantId);
  if (!updated) throw new NotFoundError('Modifier group');
  return updated;
}

async function deleteGroup(id, restaurantId) {
  const deleted = await repo.deleteGroup(id, restaurantId);
  if (!deleted) throw new NotFoundError('Modifier group');
  return deleted;
}

async function addOption(groupId, data) {
  if (!data.label) throw new ValidationError('label is required');
  return repo.createOption({ ...data, groupId });
}

async function deleteOption(id) {
  const deleted = await repo.deleteOption(id);
  if (!deleted) throw new NotFoundError('Modifier option');
  return deleted;
}

async function getOverrides(recipeId) {
  return repo.getOverrides(recipeId);
}

async function upsertOverride(data) {
  if (!data.recipeId || !data.optionId || !data.ingredientId) {
    throw new ValidationError('recipeId, optionId, and ingredientId are required');
  }
  return repo.upsertOverride(data);
}

async function deleteOverride(recipeId, optionId, ingredientId) {
  return repo.deleteOverride(recipeId, optionId, ingredientId);
}

module.exports = {
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  addOption,
  deleteOption,
  getOverrides,
  upsertOverride,
  deleteOverride,
};
