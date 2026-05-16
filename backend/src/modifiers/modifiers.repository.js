const db = require('../shared/db');

const getGroups = (restaurantId) =>
  db
    .query(
      `SELECT mg.*,
         COALESCE(
           json_agg(
             json_build_object(
               'id',          mo.id,
               'label',       mo.label,
               'price_delta', mo.price_delta,
               'is_default',  mo.is_default
             ) ORDER BY mo.label
           ) FILTER (WHERE mo.id IS NOT NULL),
           '[]'::json
         ) AS options
       FROM modifier_groups mg
       LEFT JOIN modifier_options mo ON mo.group_id = mg.id
       WHERE mg.restaurant_id = $1
       GROUP BY mg.id
       ORDER BY mg.name`,
      [restaurantId],
    )
    .then((r) => r.rows);

const createGroup = ({ restaurantId, name, isRequired, minSelect, maxSelect }) =>
  db
    .query(
      `INSERT INTO modifier_groups (restaurant_id, name, is_required, min_select, max_select)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [restaurantId, name, isRequired ?? true, minSelect || 1, maxSelect || 1],
    )
    .then((r) => r.rows[0]);

const updateGroup = (id, { name, isRequired, minSelect, maxSelect }, restaurantId) =>
  db
    .query(
      `UPDATE modifier_groups SET
         name        = COALESCE($1, name),
         is_required = COALESCE($2, is_required),
         min_select  = COALESCE($3, min_select),
         max_select  = COALESCE($4, max_select)
       WHERE id = $5 AND restaurant_id = $6 RETURNING *`,
      [name ?? null, isRequired ?? null, minSelect ?? null, maxSelect ?? null, id, restaurantId],
    )
    .then((r) => r.rows[0]);

const deleteGroup = (id, restaurantId) =>
  db
    .query('DELETE FROM modifier_groups WHERE id = $1 AND restaurant_id = $2 RETURNING *', [id, restaurantId])
    .then((r) => r.rows[0]);

const createOption = ({ groupId, label, priceDelta, isDefault }) =>
  db
    .query(
      `INSERT INTO modifier_options (group_id, label, price_delta, is_default)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [groupId, label, priceDelta || 0, isDefault || false],
    )
    .then((r) => r.rows[0]);

const deleteOption = (id) =>
  db.query('DELETE FROM modifier_options WHERE id = $1 RETURNING *', [id]).then((r) => r.rows[0]);

const getOverrides = (recipeId) =>
  db
    .query(
      `SELECT rmo.*, mo.label AS option_label, i.name AS ingredient_name
       FROM recipe_modifier_overrides rmo
       JOIN modifier_options mo ON mo.id = rmo.option_id
       JOIN ingredients i ON i.id = rmo.ingredient_id
       WHERE rmo.recipe_id = $1`,
      [recipeId],
    )
    .then((r) => r.rows);

const upsertOverride = ({ recipeId, optionId, ingredientId, quantity, unit }) =>
  db
    .query(
      `INSERT INTO recipe_modifier_overrides (recipe_id, option_id, ingredient_id, quantity, unit)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (recipe_id, option_id, ingredient_id)
       DO UPDATE SET quantity = EXCLUDED.quantity, unit = EXCLUDED.unit
       RETURNING *`,
      [recipeId, optionId, ingredientId, quantity, unit],
    )
    .then((r) => r.rows[0]);

const deleteOverride = (recipeId, optionId, ingredientId) =>
  db.query(
    'DELETE FROM recipe_modifier_overrides WHERE recipe_id = $1 AND option_id = $2 AND ingredient_id = $3',
    [recipeId, optionId, ingredientId],
  );

module.exports = {
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  createOption,
  deleteOption,
  getOverrides,
  upsertOverride,
  deleteOverride,
};
