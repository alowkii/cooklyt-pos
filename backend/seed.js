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

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  // Today in UTC (YYYY-MM-DD)
  const today = new Date().toISOString().slice(0, 10);

  // ── 1. Clear existing seed data scoped to this restaurant ──────────────────
  console.log('Clearing existing data…');
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
      ($1, 'timezone', 'UTC'),
      ($1, 'currency', 'USD')
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

  await client.end();

  console.log('\nSeed complete!');
  console.log(`  Restaurant : Demo Restaurant (${RESTAURANT_ID})`);
  console.log('  Admin      : admin@demo.com / admin123');
  console.log('  Staff      : staff@demo.com / staff123');
  console.log(`  Tables     : ${tableIds.length}`);
  console.log(`  Menu items : ${MENU.length}`);
  console.log(`  Orders     : ${ORDER_SCHEDULE.length} paid orders spread across today`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
