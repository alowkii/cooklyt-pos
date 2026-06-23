const repo           = require('./inventory.repository');
const ingredientsRepo = require('../ingredients/ingredients.repository');
const db             = require('../shared/db');
const { NotFoundError, ValidationError } = require('../shared/errors');

// Date filters are interpreted in the caller-supplied timezone (default UTC).
function validateTz(tz) {
  if (tz == null || tz === '') return 'UTC';
  if (typeof tz !== 'string' || !/^[A-Za-z0-9/_+\-]+$/.test(tz)) {
    throw new ValidationError('Invalid timezone identifier');
  }
  return tz;
}

async function getTransactions(restaurantId, filters = {}) {
  return repo.getTransactions(restaurantId, { ...filters, tz: validateTz(filters.tz) });
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

async function getWasteReport(restaurantId, filters = {}) {
  return repo.getWasteReport(restaurantId, { ...filters, tz: validateTz(filters.tz) });
}

async function _applyRecipeStock(orderId, restaurantId, items, direction) {
  const txnType = direction > 0 ? 'RETURN' : 'SALE';
  for (const item of items) {
    if (!item.menu_item_id) continue;
    const { rows: [menuItem] } = await db.query(
      'SELECT recipe_id FROM menu_items WHERE id = $1', [item.menu_item_id],
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
      await ingredientsRepo.adjustStock(ri.ingredient_id, direction * totalQty, restaurantId);
      await repo.createTransaction({
        restaurantId,
        ingredientId:  ri.ingredient_id,
        txnType,
        quantityDelta: direction * totalQty,
        refId:         orderId,
        unitCost:      parseFloat(ri.latest_unit_cost),
        performedBy:   null,
      });
    }
  }
}

// Called when an order is created or items are added — deducts ingredients immediately.
// Best-effort — errors are logged but do NOT block the order.
async function deductForOrder(orderId, restaurantId, orderItems) {
  try {
    await _applyRecipeStock(orderId, restaurantId, orderItems, -1);
  } catch (err) {
    console.error('[inventory] deductForOrder failed for order', orderId, '—', err.message);
  }
}

// Called when order items are cancelled — returns ingredients to stock.
// Best-effort — errors are logged but do NOT block the cancellation.
async function returnStock(orderId, restaurantId, items) {
  try {
    await _applyRecipeStock(orderId, restaurantId, items, +1);
  } catch (err) {
    console.error('[inventory] returnStock failed for order', orderId, '—', err.message);
  }
}

const IMPORT_VALID_TYPES = new Set(['PURCHASE', 'ADJUSTMENT', 'WASTE', 'RETURN']);

async function importTransactions({ restaurantId, performedBy, rows }) {
  if (!Array.isArray(rows) || rows.length === 0)
    throw new ValidationError('rows must be a non-empty array');

  const allIngredients = await ingredientsRepo.getAll(restaurantId);
  const nameMap = {};
  for (const ing of allIngredients) {
    nameMap[ing.name.toLowerCase().trim()] = ing;
  }

  const created = [];
  const errors  = [];

  for (let i = 0; i < rows.length; i++) {
    const row    = rows[i];
    const rowNum = i + 2; // +2 = 1-indexed + header row

    const ing = nameMap[(row.ingredient_name || '').toLowerCase().trim()];
    if (!ing) {
      errors.push({ row: rowNum, error: `Unknown ingredient: "${row.ingredient_name}"` });
      continue;
    }

    const txnType = (row.type || '').toUpperCase().trim();
    if (!IMPORT_VALID_TYPES.has(txnType)) {
      errors.push({ row: rowNum, error: `Invalid type "${row.type}" — use PURCHASE, ADJUSTMENT, WASTE, or RETURN` });
      continue;
    }

    const delta = parseFloat(row.quantity_delta);
    if (isNaN(delta) || delta === 0) {
      errors.push({ row: rowNum, error: `Invalid quantity_delta "${row.quantity_delta}"` });
      continue;
    }

    const rawCost = row.unit_cost !== undefined && row.unit_cost !== ''
      ? parseFloat(row.unit_cost)
      : parseFloat(ing.latest_unit_cost);
    const unitCost = isNaN(rawCost) ? 0 : rawCost;

    await ingredientsRepo.adjustStock(ing.id, delta, restaurantId);
    const txn = await repo.createTransaction({
      restaurantId,
      ingredientId:  ing.id,
      txnType,
      quantityDelta: delta,
      refId:         row.ref_id || 'IMPORT',
      unitCost,
      performedBy,
    });
    created.push(txn.id);
  }

  return { created: created.length, errors };
}

module.exports = { getTransactions, recordAdjustment, getWasteReport, deductForOrder, returnStock, importTransactions };
