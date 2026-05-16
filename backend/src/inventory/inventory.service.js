const repo           = require('./inventory.repository');
const ingredientsRepo = require('../ingredients/ingredients.repository');
const db             = require('../shared/db');
const { NotFoundError, ValidationError } = require('../shared/errors');

async function getTransactions(restaurantId, filters) {
  return repo.getTransactions(restaurantId, filters);
}

async function recordAdjustment({ restaurantId, ingredientId, quantityDelta, notes, performedBy }) {
  const ingredient = await ingredientsRepo.getById(ingredientId, restaurantId);
  if (!ingredient) throw new NotFoundError('Ingredient');
  const delta = parseFloat(quantityDelta);
  if (!delta || delta === 0) throw new ValidationError('quantityDelta cannot be zero');

  await ingredientsRepo.adjustStock(ingredientId, delta, restaurantId);
  return repo.createTransaction({
    restaurantId,
    ingredientId,
    txnType:       'ADJUSTMENT',
    quantityDelta: delta,
    refId:         notes || null,
    unitCost:      parseFloat(ingredient.latest_unit_cost),
    performedBy:   performedBy || null,
  });
}

async function getWasteReport(restaurantId, filters) {
  return repo.getWasteReport(restaurantId, filters);
}

// Called from payments service after an order is paid.
// Best-effort — errors are logged but do NOT fail the payment.
async function deductForOrder(orderId, restaurantId, orderItems) {
  try {
    for (const item of orderItems) {
      if (!item.menu_item_id) continue;

      const { rows: [menuItem] } = await db.query(
        'SELECT recipe_id FROM menu_items WHERE id = $1',
        [item.menu_item_id],
      );
      if (!menuItem?.recipe_id) continue;

      const { rows: recipeIngredients } = await db.query(
        `SELECT ri.ingredient_id, ri.quantity, i.latest_unit_cost
         FROM recipe_ingredients ri
         JOIN ingredients i ON i.id = ri.ingredient_id
         WHERE ri.recipe_id = $1`,
        [menuItem.recipe_id],
      );

      for (const ri of recipeIngredients) {
        const totalQty = parseFloat(ri.quantity) * parseInt(item.quantity, 10);
        await ingredientsRepo.adjustStock(ri.ingredient_id, -totalQty, restaurantId);
        await repo.createTransaction({
          restaurantId,
          ingredientId:  ri.ingredient_id,
          txnType:       'SALE',
          quantityDelta: -totalQty,
          refId:         orderId,
          unitCost:      parseFloat(ri.latest_unit_cost),
          performedBy:   null,
        });
      }
    }
  } catch (err) {
    console.error('[inventory] deductForOrder failed for order', orderId, '—', err.message);
  }
}

module.exports = { getTransactions, recordAdjustment, getWasteReport, deductForOrder };
