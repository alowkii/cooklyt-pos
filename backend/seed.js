require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcrypt');

const DB_URL =
  process.env.DATABASE_URL ||
  'postgres://pos_user:pos_password@localhost:5434/pos_dev';

const RESTAURANT_ID = '00000000-0000-0000-0000-000000000001';
const ADMIN_ID      = '00000000-0000-0000-0000-000000000002';
const STAFF_ID      = '00000000-0000-0000-0000-000000000003';

// Full menu across categories
const MENU = [
  // Starters
  { name: 'Veg Spring Rolls',       price:  4.49, category: 'Starters' },
  { name: 'Chicken Wings',          price:  6.99, category: 'Starters' },
  { name: 'Garlic Bread',           price:  2.99, category: 'Starters' },
  { name: 'Onion Rings',            price:  3.49, category: 'Starters' },
  { name: 'Paneer Tikka',           price:  7.99, category: 'Starters' },
  { name: 'Crispy Calamari',        price:  8.49, category: 'Starters' },
  { name: 'Bruschetta',             price:  4.99, category: 'Starters' },
  { name: 'Soup of the Day',        price:  3.99, category: 'Starters' },

  // Mains
  { name: 'Butter Chicken',         price: 11.99, category: 'Mains' },
  { name: 'Dal Makhani',            price:  7.99, category: 'Mains' },
  { name: 'Veg Fried Rice',         price:  8.49, category: 'Mains' },
  { name: 'Chicken Biryani',        price: 13.99, category: 'Mains' },
  { name: 'Grilled Chicken Steak',  price: 14.99, category: 'Mains' },
  { name: 'Fish & Chips',           price: 12.99, category: 'Mains' },
  { name: 'Veg Burger',             price:  8.99, category: 'Mains' },
  { name: 'Chicken Burger',         price: 10.99, category: 'Mains' },
  { name: 'Margherita Pizza',       price: 10.49, category: 'Mains' },
  { name: 'BBQ Chicken Pizza',      price: 12.49, category: 'Mains' },
  { name: 'Pasta Arrabbiata',       price:  9.49, category: 'Mains' },
  { name: 'Paneer Butter Masala',   price: 10.99, category: 'Mains' },

  // Desserts
  { name: 'Chocolate Lava Cake',    price:  5.99, category: 'Desserts' },
  { name: 'Gulab Jamun (2 pcs)',    price:  3.49, category: 'Desserts' },
  { name: 'Vanilla Ice Cream',      price:  2.99, category: 'Desserts' },
  { name: 'Mango Sorbet',           price:  3.49, category: 'Desserts' },
  { name: 'Cheesecake',             price:  4.99, category: 'Desserts' },
  { name: 'Tiramisu',               price:  5.49, category: 'Desserts' },

  // Drinks
  { name: 'Mango Lassi',            price:  2.49, category: 'Drinks' },
  { name: 'Fresh Lime Soda',        price:  1.99, category: 'Drinks' },
  { name: 'Masala Chai',            price:  1.49, category: 'Drinks' },
  { name: 'Cold Coffee',            price:  2.99, category: 'Drinks' },
  { name: 'Fresh Orange Juice',     price:  2.99, category: 'Drinks' },
  { name: 'Mineral Water',          price:  0.99, category: 'Drinks' },
  { name: 'Soft Drink (Can)',       price:  1.49, category: 'Drinks' },
  { name: 'Sparkling Water',        price:  1.49, category: 'Drinks' },
];

// Orders spread through today — [hour, minute, tableIndex, [[itemName, qty], ...]]
const ORDER_SCHEDULE = [
  [  8, 15, 0, [['Veg Spring Rolls', 2], ['Masala Chai', 2], ['Garlic Bread', 1]]                                                      ],
  [  9, 30, 1, [['Chicken Wings', 2], ['Butter Chicken', 2], ['Mango Lassi', 2], ['Garlic Bread', 1]]                                  ],
  [ 10, 45, 2, [['Bruschetta', 1], ['Pasta Arrabbiata', 2], ['Fresh Lime Soda', 2]]                                                    ],
  [ 11, 20, 3, [['Paneer Tikka', 2], ['Dal Makhani', 2], ['Veg Fried Rice', 1], ['Masala Chai', 3]]                                    ],
  [ 12,  5, 0, [['Soup of the Day', 2], ['Grilled Chicken Steak', 2], ['Cheesecake', 2], ['Cold Coffee', 2]]                           ],
  [ 12, 40, 4, [['Onion Rings', 1], ['Chicken Biryani', 3], ['Gulab Jamun (2 pcs)', 3], ['Fresh Lime Soda', 3]]                        ],
  [ 13, 10, 1, [['Crispy Calamari', 1], ['Fish & Chips', 2], ['Tiramisu', 2], ['Sparkling Water', 2]]                                  ],
  [ 13, 50, 5, [['Garlic Bread', 2], ['Margherita Pizza', 2], ['Vanilla Ice Cream', 2], ['Soft Drink (Can)', 4]]                       ],
  [ 14, 30, 2, [['BBQ Chicken Pizza', 2], ['Chicken Wings', 2], ['Mango Sorbet', 2], ['Cold Coffee', 2]]                               ],
  [ 15, 45, 3, [['Veg Burger', 2], ['Chicken Burger', 2], ['Chocolate Lava Cake', 2], ['Soft Drink (Can)', 4]]                         ],
  [ 16, 20, 0, [['Paneer Tikka', 1], ['Paneer Butter Masala', 2], ['Dal Makhani', 1], ['Mango Lassi', 2], ['Mineral Water', 2]]        ],
  [ 17, 10, 4, [['Soup of the Day', 4], ['Grilled Chicken Steak', 4], ['Tiramisu', 2], ['Fresh Orange Juice', 4]]                      ],
  [ 18,  0, 1, [['Bruschetta', 2], ['BBQ Chicken Pizza', 1], ['Pasta Arrabbiata', 2], ['Cheesecake', 2], ['Sparkling Water', 2]]       ],
  [ 18, 50, 5, [['Chicken Wings', 2], ['Butter Chicken', 3], ['Chicken Biryani', 2], ['Gulab Jamun (2 pcs)', 3], ['Masala Chai', 3]]   ],
  [ 19, 30, 2, [['Crispy Calamari', 2], ['Fish & Chips', 2], ['Mango Sorbet', 2], ['Mineral Water', 4]]                               ],
  [ 20, 15, 3, [['Veg Spring Rolls', 2], ['Margherita Pizza', 2], ['Veg Burger', 2], ['Chocolate Lava Cake', 4], ['Cold Coffee', 2]]   ],
  [ 21,  0, 0, [['Onion Rings', 2], ['Paneer Butter Masala', 2], ['Dal Makhani', 2], ['Gulab Jamun (2 pcs)', 2], ['Masala Chai', 2]]   ],
  [ 21, 45, 4, [['Chicken Burger', 3], ['BBQ Chicken Pizza', 1], ['Tiramisu', 3], ['Soft Drink (Can)', 3]]                             ],
];

// ── Ingredients catalogue ──────────────────────────────────────────────────
// [name, unit, stock_on_hand, reorder_level, reorder_qty, latest_unit_cost]
const INGREDIENTS = [
  ['Chicken',            'kg',  10.000, 2.0,  5.0,  3.5000],
  ['Butter',             'kg',   5.000, 1.0,  3.0,  4.0000],
  ['Tomatoes',           'kg',   8.000, 2.0,  5.0,  1.2000],
  ['Black Lentils',      'kg',   5.000, 1.0,  3.0,  1.8000],
  ['Basmati Rice',       'kg',  15.000, 3.0, 10.0,  1.5000],
  ['Milk',               'L',   10.000, 2.0,  5.0,  1.2000],
  ['Tea Leaves',         'kg',   2.000, 0.3,  1.0,  8.0000],
  ['Coffee',             'kg',   2.000, 0.3,  1.0, 12.0000],
  ['Mango Pulp',         'L',    5.000, 1.0,  3.0,  2.5000],
  ['Oranges',            'kg',   6.000, 1.5,  4.0,  1.8000],
  ['Cooking Cream',      'L',    4.000, 1.0,  3.0,  3.0000],
  ['Onions',             'kg',  10.000, 2.0,  5.0,  0.8000],
  ['Garlic',             'kg',   3.000, 0.5,  2.0,  3.0000],
  ['Spice Blend',        'kg',   2.000, 0.3,  1.0,  5.0000],
  ['Paneer',             'kg',   4.000, 0.8,  2.0,  5.0000],
  ['All-Purpose Flour',  'kg',  10.000, 2.0,  5.0,  0.6000],
  ['Chicken Breast',     'kg',   8.000, 2.0,  5.0,  5.0000],
  ['Fish Fillet',        'kg',   5.000, 1.0,  3.0,  7.0000],
  ['Potatoes',           'kg',  10.000, 2.0,  5.0,  0.7000],
  ['Mozzarella Cheese',  'kg',   3.000, 0.5,  2.0,  6.0000],
  ['Pizza Dough',        'pcs', 20.000, 5.0, 10.0,  0.8000],
  ['Pasta',              'kg',   5.000, 1.0,  3.0,  1.0000],
  ['Dark Chocolate',     'kg',   2.000, 0.3,  1.0,  8.0000],
  ['Sugar',              'kg',   5.000, 1.0,  3.0,  0.8000],
  ['Yogurt',             'L',    5.000, 1.0,  3.0,  1.5000],
  ['Burger Bun',         'pcs', 50.000,10.0, 20.0,  0.3000],
];

// ── Recipes & ingredients ──────────────────────────────────────────────────
// Each recipe: [recipeName, yieldQty, yieldUnit, prepTimeSec, menuItemName,
//               [[ingredientName, qty, unit], ...]]
const RECIPES = [
  ['Butter Chicken', 1, 'portion', 900, 'Butter Chicken', [
    ['Chicken',       0.2500, 'kg'],
    ['Butter',        0.0500, 'kg'],
    ['Tomatoes',      0.1500, 'kg'],
    ['Cooking Cream', 0.0500, 'L' ],
    ['Onions',        0.1000, 'kg'],
    ['Garlic',        0.0200, 'kg'],
    ['Spice Blend',   0.0200, 'kg'],
  ]],
  ['Dal Makhani', 1, 'portion', 1800, 'Dal Makhani', [
    ['Black Lentils', 0.1500, 'kg'],
    ['Butter',        0.0400, 'kg'],
    ['Tomatoes',      0.1000, 'kg'],
    ['Cooking Cream', 0.0500, 'L' ],
    ['Onions',        0.0800, 'kg'],
    ['Spice Blend',   0.0200, 'kg'],
  ]],
  ['Chicken Biryani', 1, 'portion', 1200, 'Chicken Biryani', [
    ['Chicken',      0.3000, 'kg'],
    ['Basmati Rice', 0.2000, 'kg'],
    ['Onions',       0.1500, 'kg'],
    ['Garlic',       0.0200, 'kg'],
    ['Spice Blend',  0.0300, 'kg'],
  ]],
  ['Masala Chai', 1, 'cup', 300, 'Masala Chai', [
    ['Tea Leaves',  0.0050, 'kg'],
    ['Milk',        0.1500, 'L' ],
    ['Sugar',       0.0200, 'kg'],
    ['Spice Blend', 0.0030, 'kg'],
  ]],
  ['Cold Coffee', 1, 'glass', 180, 'Cold Coffee', [
    ['Coffee', 0.0150, 'kg'],
    ['Milk',   0.2000, 'L' ],
    ['Sugar',  0.0300, 'kg'],
  ]],
  ['Mango Lassi', 1, 'glass', 120, 'Mango Lassi', [
    ['Mango Pulp', 0.1000, 'L' ],
    ['Yogurt',     0.1500, 'L' ],
    ['Sugar',      0.0200, 'kg'],
  ]],
  ['Paneer Tikka', 1, 'portion', 600, 'Paneer Tikka', [
    ['Paneer',      0.1500, 'kg'],
    ['Onions',      0.0500, 'kg'],
    ['Spice Blend', 0.0200, 'kg'],
    ['Yogurt',      0.0500, 'L' ],
  ]],
  ['Paneer Butter Masala', 1, 'portion', 720, 'Paneer Butter Masala', [
    ['Paneer',        0.2000, 'kg'],
    ['Butter',        0.0400, 'kg'],
    ['Tomatoes',      0.1200, 'kg'],
    ['Cooking Cream', 0.0500, 'L' ],
    ['Onions',        0.0800, 'kg'],
    ['Spice Blend',   0.0200, 'kg'],
  ]],
];

// ── Combo meals ────────────────────────────────────────────────────────────
// [name, sku, price, [[menuItemName, qty, sort_order], ...]]
const COMBOS = [
  ['Veg Lunch Special', 'COMBO-VEG-01', 14.99, [
    ['Paneer Tikka', 1, 0],
    ['Dal Makhani',  1, 1],
    ['Masala Chai',  1, 2],
  ]],
  ["Chef's Non-Veg Combo", 'COMBO-NV-01', 18.99, [
    ['Chicken Wings',  1, 0],
    ['Butter Chicken', 1, 1],
    ['Cold Coffee',    1, 2],
  ]],
];

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  // Today in UTC (YYYY-MM-DD)
  const today = new Date().toISOString().slice(0, 10);

  // ── 1. Clear existing seed data scoped to this restaurant ──────────────────
  console.log('Clearing existing data…');
  // Recipe / inventory tables first (FK order)
  await client.query('DELETE FROM cost_snapshots       WHERE restaurant_id = $1', [RESTAURANT_ID]);
  await client.query('DELETE FROM inventory_transactions WHERE restaurant_id = $1', [RESTAURANT_ID]);
  await client.query('DELETE FROM waste_logs           WHERE restaurant_id = $1', [RESTAURANT_ID]);
  await client.query(`
    DELETE FROM recipe_ingredients
    WHERE recipe_id IN (SELECT id FROM recipes WHERE restaurant_id = $1)
  `, [RESTAURANT_ID]);
  await client.query(`
    DELETE FROM combo_items
    WHERE combo_id IN (SELECT id FROM combo_meals WHERE restaurant_id = $1)
  `, [RESTAURANT_ID]);
  await client.query('DELETE FROM combo_meals          WHERE restaurant_id = $1', [RESTAURANT_ID]);
  await client.query('DELETE FROM recipes              WHERE restaurant_id = $1', [RESTAURANT_ID]);
  await client.query('DELETE FROM ingredients          WHERE restaurant_id = $1', [RESTAURANT_ID]);
  // Core tables
  await client.query(`
    DELETE FROM payments
    WHERE order_id IN (SELECT id FROM orders WHERE restaurant_id = $1)
  `, [RESTAURANT_ID]);
  await client.query(`
    DELETE FROM order_items
    WHERE order_id IN (SELECT id FROM orders WHERE restaurant_id = $1)
  `, [RESTAURANT_ID]);
  await client.query('DELETE FROM orders     WHERE restaurant_id = $1', [RESTAURANT_ID]);
  await client.query('DELETE FROM menu_items WHERE restaurant_id = $1', [RESTAURANT_ID]);
  await client.query('DELETE FROM tables     WHERE restaurant_id = $1', [RESTAURANT_ID]);
  await client.query('DELETE FROM users      WHERE restaurant_id = $1', [RESTAURANT_ID]);
  await client.query('DELETE FROM settings   WHERE restaurant_id = $1', [RESTAURANT_ID]);

  // ── 2. Restaurant ──────────────────────────────────────────────────────────
  console.log('Ensuring restaurant…');
  await client.query(`
    INSERT INTO restaurants (id, name)
    VALUES ($1, 'Demo Restaurant')
    ON CONFLICT (id) DO UPDATE SET name = 'Demo Restaurant'
  `, [RESTAURANT_ID]);

  // ── 3. Settings ────────────────────────────────────────────────────────────
  console.log('Seeding settings…');
  await client.query(`
    INSERT INTO settings (restaurant_id, key, value) VALUES
      ($1, 'timezone',       'UTC'),
      ($1, 'currency',       'USD'),
      ($1, 'tax_rate',       '0'),
      ($1, 'service_charge', '0')
  `, [RESTAURANT_ID]);

  // ── 4. Users ───────────────────────────────────────────────────────────────
  console.log('Seeding users…');
  const [adminHash, staffHash] = await Promise.all([
    bcrypt.hash('admin123', 10),
    bcrypt.hash('staff123', 10),
  ]);
  await client.query(`
    INSERT INTO users (id, email, password, role, restaurant_id)
    VALUES ($1, 'admin@demo.com', $2, 'admin', $3)
  `, [ADMIN_ID, adminHash, RESTAURANT_ID]);
  await client.query(`
    INSERT INTO users (id, email, password, role, restaurant_id)
    VALUES ($1, 'staff@demo.com', $2, 'staff', $3)
  `, [STAFF_ID, staffHash, RESTAURANT_ID]);

  // ── 5. Tables ──────────────────────────────────────────────────────────────
  console.log('Seeding tables…');
  const TABLE_SEATS = [2, 2, 4, 4, 6, 8]; // intentional mix
  const tableIds = [];
  for (let i = 0; i < TABLE_SEATS.length; i++) {
    const seats = TABLE_SEATS[i];
    const { rows: [t] } = await client.query(`
      INSERT INTO tables (number, status, seats, restaurant_id)
      VALUES ($1, 'available', $2, $3) RETURNING id
    `, [i + 1, seats, RESTAURANT_ID]);
    tableIds.push(t.id);
    console.log(`  Table ${i + 1} — ${seats} seats`);
  }

  // ── 6. Menu items ──────────────────────────────────────────────────────────
  console.log('Seeding menu items…');
  const menuIdByName = {};
  const menuPriceByName = {};
  for (const item of MENU) {
    const { rows: [m] } = await client.query(`
      INSERT INTO menu_items (name, price, category, available, restaurant_id)
      VALUES ($1, $2, $3, true, $4) RETURNING id
    `, [item.name, item.price, item.category, RESTAURANT_ID]);
    menuIdByName[item.name] = m.id;
    menuPriceByName[item.name] = item.price;
  }

  // ── 7. Orders, items, payments ────────────────────────────────────────────
  console.log('Seeding orders and payments…');
  for (const [hour, minute, tableIdx, lines] of ORDER_SCHEDULE) {
    const ts = `${today} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+00`;

    const { rows: [order] } = await client.query(`
      INSERT INTO orders (table_id, restaurant_id, created_by, status, created_at, channel)
      VALUES ($1, $2, $3, 'paid', $4, 'dining') RETURNING id
    `, [tableIds[tableIdx], RESTAURANT_ID, ADMIN_ID, ts]);

    let subtotal = 0;
    for (const [name, qty] of lines) {
      await client.query(`
        INSERT INTO order_items (order_id, menu_item_id, quantity)
        VALUES ($1, $2, $3)
      `, [order.id, menuIdByName[name], qty]);
      subtotal += menuPriceByName[name] * qty;
    }

    await client.query(`
      INSERT INTO payments (order_id, amount, method, status, subtotal, total_charged)
      VALUES ($1, $2, 'cash', 'completed', $2, $2)
    `, [order.id, subtotal.toFixed(2)]);
  }

  // ── 8. Ingredients ─────────────────────────────────────────────────────────
  console.log('Seeding ingredients…');
  const ingredientIdByName = {};
  const ingredientCostByName = {};
  const ingredientUnitByName = {};
  for (const [name, unit, stock, reorder_level, reorder_qty, cost] of INGREDIENTS) {
    const { rows: [ing] } = await client.query(`
      INSERT INTO ingredients
        (restaurant_id, name, unit, stock_on_hand, reorder_level, reorder_qty, latest_unit_cost, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true) RETURNING id
    `, [RESTAURANT_ID, name, unit, stock, reorder_level, reorder_qty, cost]);
    ingredientIdByName[name]   = ing.id;
    ingredientCostByName[name] = cost;
    ingredientUnitByName[name] = unit;
  }
  console.log(`  ${INGREDIENTS.length} ingredients inserted`);

  // ── 9. Initial inventory transactions (opening stock) ─────────────────────
  console.log('Seeding opening stock transactions…');
  for (const [name, , stock, , , cost] of INGREDIENTS) {
    await client.query(`
      INSERT INTO inventory_transactions
        (restaurant_id, ingredient_id, txn_type, quantity_delta, unit_cost, ref_id, performed_by)
      VALUES ($1, $2, 'PURCHASE', $3, $4, 'SEED-OPENING-STOCK', $5)
    `, [RESTAURANT_ID, ingredientIdByName[name], stock, cost, ADMIN_ID]);
  }

  // ── 10. Recipes ────────────────────────────────────────────────────────────
  console.log('Seeding recipes…');
  const recipeIdByName = {};
  for (const [recipeName, yieldQty, yieldUnit, prepTime, , lines] of RECIPES) {
    const { rows: [rec] } = await client.query(`
      INSERT INTO recipes (restaurant_id, name, yield_quantity, yield_unit, prep_time_sec)
      VALUES ($1, $2, $3, $4, $5) RETURNING id
    `, [RESTAURANT_ID, recipeName, yieldQty, yieldUnit, prepTime]);
    recipeIdByName[recipeName] = rec.id;

    for (const [ingName, qty, unit] of lines) {
      const costPerUnit = ingredientCostByName[ingName] ?? 0;
      await client.query(`
        INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, cost_per_unit)
        VALUES ($1, $2, $3, $4, $5)
      `, [rec.id, ingredientIdByName[ingName], qty, unit, costPerUnit]);
    }
  }
  console.log(`  ${RECIPES.length} recipes inserted`);

  // ── 11. Link recipes → menu items ──────────────────────────────────────────
  console.log('Linking recipes to menu items…');
  let linkedCount = 0;
  for (const [recipeName, , , , menuItemName] of RECIPES) {
    if (!menuItemName || !menuIdByName[menuItemName]) continue;
    await client.query(`
      UPDATE menu_items SET recipe_id = $1 WHERE id = $2
    `, [recipeIdByName[recipeName], menuIdByName[menuItemName]]);
    linkedCount++;
  }
  console.log(`  ${linkedCount} menu items linked to recipes`);

  // ── 12. Combos ─────────────────────────────────────────────────────────────
  console.log('Seeding combos…');
  for (const [name, sku, price, items] of COMBOS) {
    const { rows: [combo] } = await client.query(`
      INSERT INTO combo_meals (restaurant_id, name, sku, price, is_active)
      VALUES ($1, $2, $3, $4, true) RETURNING id
    `, [RESTAURANT_ID, name, sku, price]);

    for (const [menuItemName, qty, sortOrder] of items) {
      const menuItemId = menuIdByName[menuItemName];
      if (!menuItemId) continue;
      await client.query(`
        INSERT INTO combo_items (combo_id, menu_item_id, quantity, sort_order)
        VALUES ($1, $2, $3, $4)
      `, [combo.id, menuItemId, qty, sortOrder]);
    }
  }
  console.log(`  ${COMBOS.length} combos inserted`);

  // ── 13. Waste logs ─────────────────────────────────────────────────────────
  console.log('Seeding waste logs…');
  const WASTE_ENTRIES = [
    // [ingredientName, qty, reason, notes, hoursAgo]
    ['Chicken',    0.300, 'SPOILAGE', 'End-of-day stock — exceeded shelf life', 2],
    ['Milk',       0.500, 'SPOILAGE', 'Opened carton not used in time',         4],
    ['Paneer',     0.100, 'DAMAGED',  'Dropped during prep',                    6],
    ['Tomatoes',   0.250, 'OVERPREP', 'Excess chopped for morning prep',        1],
  ];
  for (const [ingName, qty, reason, notes, hoursAgo] of WASTE_ENTRIES) {
    const ingId   = ingredientIdByName[ingName];
    const costNow = ingredientCostByName[ingName];
    const total   = (qty * costNow).toFixed(4);
    const loggedAt = new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString();

    await client.query(`
      INSERT INTO waste_logs
        (restaurant_id, ingredient_id, quantity, unit, reason, cost_at_time, total_cost, logged_by, logged_at, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [RESTAURANT_ID, ingId, qty, ingredientUnitByName[ingName],
        reason, costNow, total, ADMIN_ID, loggedAt, notes]);

    await client.query(`
      INSERT INTO inventory_transactions
        (restaurant_id, ingredient_id, txn_type, quantity_delta, unit_cost, ref_id, performed_by, created_at)
      VALUES ($1, $2, 'WASTE', $3, $4, $5, $6, $7)
    `, [RESTAURANT_ID, ingId, -qty, costNow, `WASTE-SEED`, ADMIN_ID, loggedAt]);
  }
  console.log(`  ${WASTE_ENTRIES.length} waste entries inserted`);

  // ── 14. Cost snapshots ─────────────────────────────────────────────────────
  console.log('Seeding cost snapshots…');
  let snapshotCount = 0;
  for (const [recipeName, , , , menuItemName, lines] of RECIPES) {
    const currentCost = lines.reduce(
      (sum, [ingName, qty]) => sum + qty * (ingredientCostByName[ingName] ?? 0), 0,
    );
    const sellingPrice = menuPriceByName[menuItemName] ?? null;
    if (!sellingPrice) continue;
    const grossMargin = sellingPrice - currentCost;
    const marginPct   = (grossMargin / sellingPrice) * 100;

    await client.query(`
      INSERT INTO cost_snapshots
        (recipe_id, restaurant_id, total_cost, selling_price, gross_margin, margin_pct, triggered_by)
      VALUES ($1, $2, $3, $4, $5, $6, 'SEED')
    `, [recipeIdByName[recipeName], RESTAURANT_ID,
        currentCost.toFixed(4), sellingPrice,
        grossMargin.toFixed(4), marginPct.toFixed(2)]);
    snapshotCount++;
  }
  console.log(`  ${snapshotCount} cost snapshots inserted`);

  await client.end();

  console.log('\nSeed complete!');
  console.log(`  Restaurant : Demo Restaurant (${RESTAURANT_ID})`);
  console.log('  Admin      : admin@demo.com / admin123');
  console.log('  Staff      : staff@demo.com / staff123');
  console.log(`  Tables     : ${tableIds.length}`);
  console.log(`  Menu items : ${MENU.length}`);
  console.log(`  Orders     : ${ORDER_SCHEDULE.length} paid orders spread across today`);
  console.log(`  Ingredients: ${INGREDIENTS.length}`);
  console.log(`  Recipes    : ${RECIPES.length} (${linkedCount} linked to menu items)`);
  console.log(`  Combos     : ${COMBOS.length}`);
  console.log(`  Waste logs : ${WASTE_ENTRIES.length}`);
  console.log(`  Snapshots  : ${snapshotCount}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
