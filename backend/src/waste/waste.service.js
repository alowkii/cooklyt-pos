const repo           = require('./waste.repository');
const ingredientsRepo = require('../ingredients/ingredients.repository');
const invRepo        = require('../inventory/inventory.repository');
const { NotFoundError, ValidationError } = require('../shared/errors');

const VALID_REASONS = ['SPOILAGE', 'SPILL', 'OVERPREP', 'DAMAGED', 'OTHER'];

async function getAll(restaurantId, filters) {
  return repo.getAll(restaurantId, filters);
}

async function logWaste({ restaurantId, ingredientId, quantity, unit, reason, notes, loggedBy }) {
  if (!ingredientId) throw new ValidationError('ingredientId is required');
  const qty = parseFloat(quantity);
  if (!qty || qty <= 0) throw new ValidationError('quantity must be positive');
  if (!VALID_REASONS.includes(reason)) {
    throw new ValidationError(`reason must be one of: ${VALID_REASONS.join(', ')}`);
  }

  const ingredient = await ingredientsRepo.getById(ingredientId, restaurantId);
  if (!ingredient) throw new NotFoundError('Ingredient');

  const costAtTime = parseFloat(ingredient.latest_unit_cost);
  const totalCost  = parseFloat((qty * costAtTime).toFixed(4));
  const wasteUnit  = unit || ingredient.unit;

  const waste = await repo.create({
    restaurantId, ingredientId, quantity: qty, unit: wasteUnit,
    reason, costAtTime, totalCost, loggedBy, notes,
  });

  await ingredientsRepo.adjustStock(ingredientId, -qty, restaurantId);

  await invRepo.createTransaction({
    restaurantId,
    ingredientId,
    txnType:       'WASTE',
    quantityDelta: -qty,
    refId:         waste.id,
    unitCost:      costAtTime,
    performedBy:   loggedBy || null,
  });

  return waste;
}

module.exports = { getAll, logWaste };
