require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcrypt');

const DB_URL =
  process.env.DATABASE_URL ||
  'postgres://pos_user:pos_password@localhost:5434/pos_dev';

const RESTAURANT_ID = '00000000-0000-0000-0000-000000000001';
const ADMIN_ID      = '00000000-0000-0000-0000-000000000002';
const STAFF_ID      = '00000000-0000-0000-0000-000000000003';

const SEED_USERS = [
  { id: ADMIN_ID,                                    email: 'admin@demo.com',   password: 'admin123', role: 'admin',   name: 'Admin',      pin: null   },
  { id: STAFF_ID,                                    email: 'arjun@demo.com',   password: 'staff123', role: 'staff',   name: 'Arjun',      pin: '1234' },
  { id: '00000000-0000-0000-0000-000000000004',      email: 'priya@demo.com',   password: 'staff123', role: 'staff',   name: 'Priya',      pin: '2345' },
  { id: '00000000-0000-0000-0000-000000000005',      email: 'ravi@demo.com',    password: 'staff123', role: 'staff',   name: 'Ravi',       pin: '3456' },
  { id: '00000000-0000-0000-0000-000000000006',      email: 'kitchen@demo.com', password: 'staff123', role: 'kitchen', name: 'Kitchen',    pin: '4567' },
  { id: '00000000-0000-0000-0000-000000000007',      email: 'cashier@demo.com', password: 'staff123', role: 'cashier', name: 'Cashier',    pin: '5678' },
];

// Full menu across categories (prices in INR)
const MENU = [
  // Starters
  { name: 'Veg Spring Rolls',       price:  280, category: 'Starters', description: 'Crispy rolls filled with seasoned mixed vegetables, served with sweet chili dipping sauce.' },
  { name: 'Chicken Wings',          price:  450, category: 'Starters', description: 'Tender chicken wings tossed in our signature BBQ glaze, garnished with spring onions.' },
  { name: 'Garlic Bread',           price:  180, category: 'Starters', description: 'Toasted sourdough slices with herb butter and roasted garlic, served warm.' },
  { name: 'Onion Rings',            price:  220, category: 'Starters', description: 'Golden-fried onion rings with a light, crispy batter. Served with ranch dip.' },
  { name: 'Paneer Tikka',           price:  380, category: 'Starters', description: 'Marinated cottage cheese cubes char-grilled in a tandoor with peppers and onions.' },
  { name: 'Crispy Calamari',        price:  480, category: 'Starters', description: 'Lightly breaded squid rings fried until golden, served with lemon aioli.' },
  { name: 'Bruschetta',             price:  250, category: 'Starters', description: 'Toasted bread rubbed with garlic, topped with diced tomatoes, basil, and olive oil.' },
  { name: 'Soup of the Day',        price:  180, category: 'Starters', description: "Chef's freshly prepared soup — ask your server for today's selection." },

  // Mains
  { name: 'Butter Chicken',         price:  380, category: 'Mains', description: 'Tender chicken in a rich, creamy tomato-based curry. Best paired with naan or rice.' },
  { name: 'Dal Makhani',            price:  280, category: 'Mains', description: 'Slow-cooked black lentils simmered overnight in butter and cream. A classic North Indian staple.' },
  { name: 'Veg Fried Rice',         price:  220, category: 'Mains', description: 'Wok-tossed basmati rice with seasonal vegetables, garlic, and soy seasoning.' },
  { name: 'Chicken Biryani',        price:  420, category: 'Mains', description: 'Fragrant long-grain rice layered with spiced chicken, slow-cooked and finished with saffron.' },
  { name: 'Grilled Chicken Steak',  price:  599, category: 'Mains', description: 'Juicy marinated chicken breast grilled to perfection, served with herb butter and seasonal sides.' },
  { name: 'Fish & Chips',           price:  480, category: 'Mains', description: 'Beer-battered fish fillet with golden crispy chips and housemade tartar sauce.' },
  { name: 'Veg Burger',             price:  280, category: 'Mains', description: 'Spiced potato-veggie patty with lettuce, tomato, and chipotle mayo in a toasted bun.' },
  { name: 'Chicken Burger',         price:  320, category: 'Mains', description: 'Grilled chicken thigh with coleslaw, pickles, and our house sauce in a brioche bun.' },
  { name: 'Margherita Pizza',       price:  380, category: 'Mains', description: 'Wood-fired dough topped with San Marzano tomato sauce, fresh mozzarella, and basil.' },
  { name: 'BBQ Chicken Pizza',      price:  450, category: 'Mains', description: 'Smoky BBQ sauce base with shredded chicken, mozzarella, and caramelised onions.' },
  { name: 'Pasta Arrabbiata',       price:  320, category: 'Mains', description: 'Al dente pasta tossed in a fiery tomato and garlic sauce, finished with fresh parsley.' },
  { name: 'Paneer Butter Masala',   price:  340, category: 'Mains', description: 'Soft paneer cubes in a velvety tomato-cashew gravy — mild, rich, and aromatic.' },

  // Desserts
  { name: 'Chocolate Lava Cake',    price:  280, category: 'Desserts', description: 'Warm dark chocolate cake with a molten center, served with a scoop of vanilla ice cream.' },
  { name: 'Gulab Jamun (2 pcs)',    price:  120, category: 'Desserts', description: 'Soft milk-solid dumplings soaked in rose-cardamom sugar syrup.' },
  { name: 'Vanilla Ice Cream',      price:  140, category: 'Desserts', description: 'Classic French vanilla ice cream made with fresh cream and real vanilla bean.' },
  { name: 'Mango Sorbet',           price:  160, category: 'Desserts', description: 'Refreshing sorbet made with Alphonso mango pulp and a hint of lime.' },
  { name: 'Cheesecake',             price:  220, category: 'Desserts', description: 'Creamy New York-style baked cheesecake on a buttery biscuit crust.' },
  { name: 'Tiramisu',               price:  260, category: 'Desserts', description: 'Layers of espresso-soaked ladyfingers with mascarpone cream, dusted with cocoa.' },

  // Drinks
  { name: 'Mango Lassi',            price:  120, category: 'Drinks', description: 'Chilled yogurt drink blended with sweet Alphonso mango pulp and a pinch of cardamom.' },
  { name: 'Fresh Lime Soda',        price:   80, category: 'Drinks', description: 'Freshly squeezed lime with sparkling water — choose sweet, salted, or mixed.' },
  { name: 'Masala Chai',            price:   60, category: 'Drinks', description: 'Spiced Indian tea brewed with ginger, cardamom, and cinnamon, served with milk.' },
  { name: 'Cold Coffee',            price:  140, category: 'Drinks', description: 'Chilled filter coffee blended with milk and sugar — strong and refreshing.' },
  { name: 'Fresh Orange Juice',     price:  140, category: 'Drinks', description: 'Freshly squeezed juice from hand-picked oranges — served chilled.' },
  { name: 'Mineral Water',          price:   40, category: 'Drinks', description: 'Still mineral water, 500 ml.' },
  { name: 'Soft Drink (Can)',       price:   60, category: 'Drinks', description: 'Your choice of chilled Coca-Cola, Sprite, or Limca.' },
  { name: 'Sparkling Water',        price:   80, category: 'Drinks', description: 'Chilled sparkling mineral water, 330 ml.' },
];

// Orders spread across 7 days — [daysAgo, hour, minute, tableIndex, [[itemName, qty], ...], paymentMethod?, channel?]
// daysAgo=0 → today, daysAgo=6 → six days ago. paymentMethod defaults to 'cash'. channel defaults to 'dining'.
// For takeaway/delivery tableIndex is ignored (null table_id is used).
const ORDER_SCHEDULE = [
  // ── Day 0 (today) — Dining ────────────────────────────────────────────────
  [ 0,  8, 15, 0, [['Veg Spring Rolls', 2], ['Masala Chai', 2], ['Garlic Bread', 1]],                                                         'cash'   ],
  [ 0,  9, 30, 1, [['Chicken Wings', 2], ['Butter Chicken', 2], ['Mango Lassi', 2], ['Garlic Bread', 1]],                                      'card'   ],
  [ 0, 10, 45, 2, [['Bruschetta', 1], ['Pasta Arrabbiata', 2], ['Fresh Lime Soda', 2]],                                                        'cash'   ],
  [ 0, 11, 20, 3, [['Paneer Tikka', 2], ['Dal Makhani', 2], ['Veg Fried Rice', 1], ['Masala Chai', 3]],                                        'cash'   ],
  [ 0, 12,  5, 0, [['Soup of the Day', 2], ['Grilled Chicken Steak', 2], ['Cheesecake', 2], ['Cold Coffee', 2]],                               'card'   ],
  [ 0, 12, 40, 4, [['Onion Rings', 1], ['Chicken Biryani', 3], ['Gulab Jamun (2 pcs)', 3], ['Fresh Lime Soda', 3]],                            'mobile' ],
  [ 0, 13, 10, 1, [['Crispy Calamari', 1], ['Fish & Chips', 2], ['Tiramisu', 2], ['Sparkling Water', 2]],                                      'cash'   ],
  [ 0, 13, 50, 5, [['Garlic Bread', 2], ['Margherita Pizza', 2], ['Vanilla Ice Cream', 2], ['Soft Drink (Can)', 4]],                           'card'   ],
  [ 0, 14, 30, 2, [['BBQ Chicken Pizza', 2], ['Chicken Wings', 2], ['Mango Sorbet', 2], ['Cold Coffee', 2]],                                   'cash'   ],
  [ 0, 15, 45, 3, [['Veg Burger', 2], ['Chicken Burger', 2], ['Chocolate Lava Cake', 2], ['Soft Drink (Can)', 4]],                             'mobile' ],
  [ 0, 16, 20, 0, [['Paneer Tikka', 1], ['Paneer Butter Masala', 2], ['Dal Makhani', 1], ['Mango Lassi', 2], ['Mineral Water', 2]],            'cash'   ],
  [ 0, 17, 10, 4, [['Soup of the Day', 4], ['Grilled Chicken Steak', 4], ['Tiramisu', 2], ['Fresh Orange Juice', 4]],                          'card'   ],
  [ 0, 18,  0, 1, [['Bruschetta', 2], ['BBQ Chicken Pizza', 1], ['Pasta Arrabbiata', 2], ['Cheesecake', 2], ['Sparkling Water', 2]],           'cash'   ],
  [ 0, 18, 50, 5, [['Chicken Wings', 2], ['Butter Chicken', 3], ['Chicken Biryani', 2], ['Gulab Jamun (2 pcs)', 3], ['Masala Chai', 3]],       'mobile' ],
  [ 0, 19, 30, 2, [['Crispy Calamari', 2], ['Fish & Chips', 2], ['Mango Sorbet', 2], ['Mineral Water', 4]],                                    'card'   ],
  [ 0, 20, 15, 3, [['Veg Spring Rolls', 2], ['Margherita Pizza', 2], ['Veg Burger', 2], ['Chocolate Lava Cake', 4], ['Cold Coffee', 2]],       'cash'   ],
  [ 0, 21,  0, 0, [['Onion Rings', 2], ['Paneer Butter Masala', 2], ['Dal Makhani', 2], ['Gulab Jamun (2 pcs)', 2], ['Masala Chai', 2]],       'cash'   ],
  [ 0, 21, 45, 4, [['Chicken Burger', 3], ['BBQ Chicken Pizza', 1], ['Tiramisu', 3], ['Soft Drink (Can)', 3]],                                 'card'   ],
  // Day 0 — Takeaway
  [ 0, 10, 30, null, [['Veg Burger', 1], ['Cold Coffee', 1]],                                                                                  'card',   'takeaway'],
  [ 0, 11, 45, null, [['Chicken Biryani', 2], ['Mango Lassi', 2]],                                                                             'mobile', 'takeaway'],
  [ 0, 12, 20, null, [['Butter Chicken', 1], ['Veg Fried Rice', 1], ['Mineral Water', 2]],                                                     'card',   'takeaway'],
  [ 0, 13,  5, null, [['Margherita Pizza', 1], ['Garlic Bread', 1], ['Soft Drink (Can)', 2]],                                                  'cash',   'takeaway'],
  [ 0, 13, 50, null, [['Chicken Burger', 2], ['Fresh Lime Soda', 2]],                                                                          'mobile', 'takeaway'],
  [ 0, 16, 30, null, [['Paneer Tikka', 1], ['Dal Makhani', 1], ['Masala Chai', 2]],                                                            'cash',   'takeaway'],
  [ 0, 18, 45, null, [['BBQ Chicken Pizza', 1], ['Chicken Wings', 1], ['Cold Coffee', 2]],                                                     'card',   'takeaway'],
  [ 0, 20, 15, null, [['Chicken Biryani', 3], ['Gulab Jamun (2 pcs)', 2], ['Mineral Water', 3]],                                               'mobile', 'takeaway'],
  // Day 0 — Delivery
  [ 0, 11,  0, null, [['Butter Chicken', 2], ['Dal Makhani', 1], ['Veg Fried Rice', 1], ['Mango Lassi', 2]],                                   'mobile', 'delivery'],
  [ 0, 12, 30, null, [['Chicken Biryani', 2], ['Paneer Tikka', 1], ['Fresh Lime Soda', 2]],                                                    'mobile', 'delivery'],
  [ 0, 13, 15, null, [['BBQ Chicken Pizza', 2], ['Garlic Bread', 2], ['Soft Drink (Can)', 4]],                                                 'card',   'delivery'],
  [ 0, 15,  0, null, [['Margherita Pizza', 2], ['Onion Rings', 1], ['Cold Coffee', 2]],                                                        'mobile', 'delivery'],
  [ 0, 19, 30, null, [['Chicken Biryani', 4], ['Veg Spring Rolls', 2], ['Mango Lassi', 4]],                                                    'mobile', 'delivery'],
  [ 0, 20, 45, null, [['Butter Chicken', 3], ['Veg Fried Rice', 2], ['Paneer Butter Masala', 2], ['Mineral Water', 4]],                        'card',   'delivery'],

  // ── Day 1 (yesterday) — Dining ────────────────────────────────────────────
  [ 1,  8, 30, 2, [['Garlic Bread', 2], ['Masala Chai', 3]],                                                                                   'cash'   ],
  [ 1,  9, 45, 0, [['Bruschetta', 2], ['Paneer Tikka', 1], ['Cold Coffee', 2]],                                                                'mobile' ],
  [ 1, 11,  0, 3, [['Paneer Tikka', 2], ['Dal Makhani', 2], ['Masala Chai', 2]],                                                               'cash'   ],
  [ 1, 12, 15, 1, [['Butter Chicken', 2], ['Veg Fried Rice', 1], ['Mango Lassi', 2]],                                                          'card'   ],
  [ 1, 12, 50, 4, [['Chicken Biryani', 3], ['Onion Rings', 1], ['Fresh Lime Soda', 3]],                                                        'cash'   ],
  [ 1, 13, 20, 5, [['Fish & Chips', 2], ['Crispy Calamari', 1], ['Sparkling Water', 2]],                                                       'card'   ],
  [ 1, 14,  0, 2, [['Margherita Pizza', 2], ['Garlic Bread', 1], ['Soft Drink (Can)', 2]],                                                     'cash'   ],
  [ 1, 15, 30, 0, [['BBQ Chicken Pizza', 1], ['Chicken Wings', 2], ['Cold Coffee', 2]],                                                        'mobile' ],
  [ 1, 16, 10, 3, [['Veg Burger', 2], ['Chicken Burger', 1], ['Fresh Lime Soda', 3]],                                                          'cash'   ],
  [ 1, 17, 30, 1, [['Soup of the Day', 2], ['Grilled Chicken Steak', 2], ['Fresh Orange Juice', 2]],                                           'card'   ],
  [ 1, 18, 20, 4, [['Paneer Tikka', 1], ['Paneer Butter Masala', 2], ['Masala Chai', 2]],                                                      'cash'   ],
  [ 1, 19,  0, 5, [['Chicken Wings', 2], ['Butter Chicken', 2], ['Mango Lassi', 3]],                                                           'mobile' ],
  [ 1, 19, 45, 2, [['Chicken Biryani', 2], ['Gulab Jamun (2 pcs)', 2], ['Masala Chai', 2]],                                                    'card'   ],
  [ 1, 20, 30, 0, [['Margherita Pizza', 2], ['Veg Spring Rolls', 2], ['Chocolate Lava Cake', 2], ['Soft Drink (Can)', 4]],                     'cash'   ],
  [ 1, 21, 15, 3, [['Pasta Arrabbiata', 2], ['Tiramisu', 2], ['Cold Coffee', 2]],                                                              'card'   ],
  [ 1, 22,  0, 1, [['BBQ Chicken Pizza', 2], ['Chicken Burger', 2], ['Mineral Water', 4]],                                                     'cash'   ],
  // Day 1 — Takeaway
  [ 1,  9, 45, null, [['Garlic Bread', 2], ['Masala Chai', 2]],                                                                                'cash',   'takeaway'],
  [ 1, 12,  0, null, [['Chicken Biryani', 2], ['Fresh Lime Soda', 2]],                                                                         'card',   'takeaway'],
  [ 1, 12, 40, null, [['Veg Burger', 2], ['Soft Drink (Can)', 2]],                                                                             'mobile', 'takeaway'],
  [ 1, 14, 15, null, [['Butter Chicken', 1], ['Dal Makhani', 1], ['Masala Chai', 2]],                                                          'cash',   'takeaway'],
  [ 1, 17, 30, null, [['BBQ Chicken Pizza', 1], ['Chicken Wings', 1], ['Cold Coffee', 2]],                                                     'card',   'takeaway'],
  [ 1, 19,  0, null, [['Paneer Tikka', 2], ['Paneer Butter Masala', 1], ['Mineral Water', 2]],                                                 'mobile', 'takeaway'],
  [ 1, 20, 30, null, [['Chicken Burger', 2], ['Margherita Pizza', 1], ['Fresh Lime Soda', 2]],                                                 'card',   'takeaway'],
  // Day 1 — Delivery
  [ 1, 11, 30, null, [['Butter Chicken', 2], ['Veg Fried Rice', 1], ['Mango Lassi', 2]],                                                       'mobile', 'delivery'],
  [ 1, 13,  0, null, [['Chicken Biryani', 3], ['Veg Spring Rolls', 1], ['Soft Drink (Can)', 3]],                                               'card',   'delivery'],
  [ 1, 15, 45, null, [['BBQ Chicken Pizza', 2], ['Garlic Bread', 1], ['Cold Coffee', 2]],                                                      'mobile', 'delivery'],
  [ 1, 19, 15, null, [['Paneer Butter Masala', 2], ['Dal Makhani', 1], ['Mineral Water', 4]],                                                  'mobile', 'delivery'],
  [ 1, 21,  0, null, [['Butter Chicken', 2], ['Chicken Biryani', 2], ['Masala Chai', 2]],                                                      'card',   'delivery'],

  // ── Day 2 — Dining ────────────────────────────────────────────────────────
  [ 2,  9,  0, 1, [['Veg Spring Rolls', 2], ['Masala Chai', 2]],                                                                               'cash'   ],
  [ 2, 10, 30, 5, [['Garlic Bread', 1], ['Paneer Tikka', 2], ['Fresh Lime Soda', 2]],                                                          'mobile' ],
  [ 2, 12,  0, 0, [['Butter Chicken', 2], ['Dal Makhani', 1], ['Mango Lassi', 2]],                                                             'card'   ],
  [ 2, 12, 45, 2, [['Chicken Biryani', 2], ['Veg Fried Rice', 1], ['Fresh Lime Soda', 2]],                                                     'cash'   ],
  [ 2, 13, 30, 4, [['Fish & Chips', 2], ['Onion Rings', 1], ['Cold Coffee', 2]],                                                               'cash'   ],
  [ 2, 14, 15, 1, [['Margherita Pizza', 2], ['Chicken Wings', 2], ['Soft Drink (Can)', 4]],                                                    'card'   ],
  [ 2, 15, 45, 3, [['BBQ Chicken Pizza', 2], ['Pasta Arrabbiata', 2], ['Sparkling Water', 2]],                                                 'mobile' ],
  [ 2, 17,  0, 5, [['Grilled Chicken Steak', 2], ['Soup of the Day', 2], ['Fresh Orange Juice', 2]],                                           'cash'   ],
  [ 2, 18, 15, 0, [['Paneer Butter Masala', 2], ['Dal Makhani', 1], ['Masala Chai', 3]],                                                       'card'   ],
  [ 2, 19, 30, 2, [['Chicken Biryani', 3], ['Gulab Jamun (2 pcs)', 3], ['Mango Lassi', 3]],                                                    'cash'   ],
  [ 2, 20, 45, 4, [['BBQ Chicken Pizza', 2], ['Chicken Burger', 2], ['Tiramisu', 2], ['Cold Coffee', 2]],                                      'mobile' ],
  [ 2, 21, 30, 1, [['Veg Burger', 2], ['Chocolate Lava Cake', 2], ['Masala Chai', 2]],                                                         'cash'   ],
  // Day 2 — Takeaway
  [ 2, 10,  0, null, [['Veg Spring Rolls', 1], ['Cold Coffee', 1]],                                                                            'cash',   'takeaway'],
  [ 2, 12, 15, null, [['Chicken Biryani', 2], ['Mango Lassi', 2]],                                                                             'mobile', 'takeaway'],
  [ 2, 13, 30, null, [['Margherita Pizza', 1], ['Garlic Bread', 1], ['Soft Drink (Can)', 2]],                                                  'card',   'takeaway'],
  [ 2, 14, 45, null, [['Fish & Chips', 1], ['Fresh Lime Soda', 1]],                                                                            'cash',   'takeaway'],
  [ 2, 17,  0, null, [['Butter Chicken', 2], ['Dal Makhani', 1], ['Masala Chai', 2]],                                                          'card',   'takeaway'],
  [ 2, 19, 30, null, [['BBQ Chicken Pizza', 2], ['Chicken Wings', 1], ['Cold Coffee', 2]],                                                     'mobile', 'takeaway'],
  [ 2, 21,  0, null, [['Chicken Burger', 2], ['Chocolate Lava Cake', 1], ['Soft Drink (Can)', 2]],                                             'card',   'takeaway'],
  // Day 2 — Delivery
  [ 2, 11, 45, null, [['Butter Chicken', 2], ['Veg Fried Rice', 2], ['Mango Lassi', 2]],                                                       'mobile', 'delivery'],
  [ 2, 13,  0, null, [['Chicken Biryani', 2], ['Paneer Tikka', 2], ['Fresh Lime Soda', 2]],                                                    'card',   'delivery'],
  [ 2, 16,  0, null, [['Margherita Pizza', 2], ['Veg Burger', 1], ['Cold Coffee', 2]],                                                         'mobile', 'delivery'],
  [ 2, 19,  0, null, [['Paneer Butter Masala', 2], ['Dal Makhani', 2], ['Gulab Jamun (2 pcs)', 2], ['Mineral Water', 4]],                      'mobile', 'delivery'],
  [ 2, 20, 30, null, [['BBQ Chicken Pizza', 2], ['Chicken Wings', 2], ['Soft Drink (Can)', 4]],                                                'card',   'delivery'],

  // ── Day 3 — Dining ────────────────────────────────────────────────────────
  [ 3,  8, 45, 3, [['Garlic Bread', 2], ['Masala Chai', 2], ['Bruschetta', 1]],                                                                'cash'   ],
  [ 3, 10,  0, 0, [['Chicken Wings', 2], ['Mango Lassi', 2], ['Veg Spring Rolls', 1]],                                                         'card'   ],
  [ 3, 11, 15, 4, [['Paneer Tikka', 2], ['Dal Makhani', 2], ['Masala Chai', 2]],                                                               'cash'   ],
  [ 3, 12, 20, 2, [['Butter Chicken', 3], ['Chicken Biryani', 2], ['Fresh Lime Soda', 3]],                                                     'mobile' ],
  [ 3, 12, 55, 5, [['Grilled Chicken Steak', 2], ['Soup of the Day', 2], ['Cold Coffee', 2]],                                                  'card'   ],
  [ 3, 13, 40, 1, [['Fish & Chips', 2], ['Crispy Calamari', 2], ['Sparkling Water', 2]],                                                       'cash'   ],
  [ 3, 14, 30, 3, [['Margherita Pizza', 2], ['Garlic Bread', 2], ['Soft Drink (Can)', 4]],                                                     'card'   ],
  [ 3, 15, 20, 0, [['Pasta Arrabbiata', 2], ['Paneer Butter Masala', 2], ['Fresh Orange Juice', 2]],                                           'cash'   ],
  [ 3, 16, 45, 4, [['Veg Burger', 2], ['Chicken Burger', 2], ['Cold Coffee', 2]],                                                              'mobile' ],
  [ 3, 18,  0, 2, [['Chicken Wings', 2], ['Butter Chicken', 3], ['Gulab Jamun (2 pcs)', 3], ['Masala Chai', 3]],                               'cash'   ],
  [ 3, 19, 15, 5, [['BBQ Chicken Pizza', 2], ['Chicken Biryani', 2], ['Mango Sorbet', 2], ['Mango Lassi', 2]],                                 'card'   ],
  [ 3, 20,  0, 1, [['Veg Spring Rolls', 2], ['Paneer Tikka', 2], ['Paneer Butter Masala', 2], ['Mineral Water', 4]],                           'cash'   ],
  [ 3, 21,  0, 3, [['Margherita Pizza', 2], ['Chocolate Lava Cake', 2], ['Tiramisu', 2], ['Soft Drink (Can)', 4]],                             'mobile' ],
  [ 3, 21, 50, 0, [['Chicken Burger', 2], ['BBQ Chicken Pizza', 1], ['Cold Coffee', 2]],                                                       'cash'   ],
  // Day 3 — Takeaway
  [ 3, 11,  0, null, [['Veg Burger', 2], ['Masala Chai', 2]],                                                                                  'cash',   'takeaway'],
  [ 3, 12, 30, null, [['Chicken Biryani', 2], ['Fresh Lime Soda', 2]],                                                                         'mobile', 'takeaway'],
  [ 3, 14,  0, null, [['Margherita Pizza', 1], ['Garlic Bread', 1], ['Cold Coffee', 1]],                                                       'card',   'takeaway'],
  [ 3, 17, 30, null, [['Butter Chicken', 1], ['Dal Makhani', 1], ['Mineral Water', 2]],                                                        'cash',   'takeaway'],
  [ 3, 19, 15, null, [['BBQ Chicken Pizza', 1], ['Paneer Tikka', 1], ['Mango Lassi', 2]],                                                      'mobile', 'takeaway'],
  [ 3, 21,  0, null, [['Chicken Burger', 2], ['Veg Spring Rolls', 1], ['Soft Drink (Can)', 2]],                                                'card',   'takeaway'],
  // Day 3 — Delivery
  [ 3, 12,  0, null, [['Butter Chicken', 2], ['Veg Fried Rice', 1], ['Mango Lassi', 2]],                                                       'mobile', 'delivery'],
  [ 3, 13, 30, null, [['Chicken Biryani', 3], ['Veg Spring Rolls', 2], ['Cold Coffee', 2]],                                                    'card',   'delivery'],
  [ 3, 16, 15, null, [['Margherita Pizza', 2], ['Chicken Wings', 1], ['Fresh Lime Soda', 4]],                                                  'mobile', 'delivery'],
  [ 3, 19, 45, null, [['Paneer Butter Masala', 2], ['Dal Makhani', 1], ['Gulab Jamun (2 pcs)', 2], ['Mineral Water', 2]],                      'mobile', 'delivery'],
  [ 3, 21, 30, null, [['Butter Chicken', 3], ['Chicken Biryani', 2], ['Masala Chai', 3]],                                                      'card',   'delivery'],

  // ── Day 4 — Dining ────────────────────────────────────────────────────────
  [ 4,  9, 15, 5, [['Veg Spring Rolls', 1], ['Masala Chai', 2]],                                                                               'cash'   ],
  [ 4, 10, 45, 1, [['Bruschetta', 2], ['Fresh Lime Soda', 2], ['Garlic Bread', 1]],                                                            'card'   ],
  [ 4, 12,  0, 4, [['Dal Makhani', 2], ['Veg Fried Rice', 2], ['Mango Lassi', 2]],                                                             'cash'   ],
  [ 4, 12, 40, 2, [['Chicken Biryani', 2], ['Butter Chicken', 2], ['Fresh Lime Soda', 2]],                                                     'mobile' ],
  [ 4, 13, 25, 0, [['Margherita Pizza', 2], ['Chicken Wings', 2], ['Soft Drink (Can)', 4]],                                                    'cash'   ],
  [ 4, 14, 10, 3, [['Fish & Chips', 2], ['Onion Rings', 1], ['Sparkling Water', 2]],                                                           'card'   ],
  [ 4, 15, 50, 5, [['Pasta Arrabbiata', 2], ['Cheesecake', 2], ['Cold Coffee', 2]],                                                            'cash'   ],
  [ 4, 17, 20, 1, [['Grilled Chicken Steak', 2], ['Soup of the Day', 2], ['Fresh Orange Juice', 2]],                                           'card'   ],
  [ 4, 18, 30, 4, [['Paneer Tikka', 2], ['Paneer Butter Masala', 2], ['Masala Chai', 3]],                                                      'cash'   ],
  [ 4, 19, 45, 0, [['BBQ Chicken Pizza', 2], ['Chicken Burger', 2], ['Mango Lassi', 2]],                                                       'mobile' ],
  [ 4, 20, 30, 2, [['Chicken Wings', 2], ['Chicken Biryani', 2], ['Gulab Jamun (2 pcs)', 2], ['Masala Chai', 2]],                              'cash'   ],
  [ 4, 21, 15, 3, [['Veg Burger', 2], ['Margherita Pizza', 1], ['Chocolate Lava Cake', 2], ['Soft Drink (Can)', 2]],                           'card'   ],
  // Day 4 — Takeaway
  [ 4, 10, 15, null, [['Garlic Bread', 1], ['Cold Coffee', 1]],                                                                                'cash',   'takeaway'],
  [ 4, 12,  0, null, [['Chicken Biryani', 2], ['Mango Lassi', 2]],                                                                             'card',   'takeaway'],
  [ 4, 13, 30, null, [['Veg Burger', 1], ['Chicken Burger', 1], ['Soft Drink (Can)', 2]],                                                      'mobile', 'takeaway'],
  [ 4, 16, 45, null, [['Paneer Tikka', 1], ['Dal Makhani', 1], ['Masala Chai', 2]],                                                            'cash',   'takeaway'],
  [ 4, 19,  0, null, [['BBQ Chicken Pizza', 1], ['Garlic Bread', 1], ['Cold Coffee', 2]],                                                      'mobile', 'takeaway'],
  [ 4, 20, 30, null, [['Butter Chicken', 2], ['Veg Fried Rice', 1], ['Mineral Water', 2]],                                                     'card',   'takeaway'],
  // Day 4 — Delivery
  [ 4, 11, 30, null, [['Butter Chicken', 2], ['Dal Makhani', 1], ['Mango Lassi', 2]],                                                          'mobile', 'delivery'],
  [ 4, 13,  0, null, [['Chicken Biryani', 2], ['Paneer Tikka', 1], ['Fresh Lime Soda', 2]],                                                    'card',   'delivery'],
  [ 4, 15, 30, null, [['Margherita Pizza', 2], ['Veg Spring Rolls', 1], ['Soft Drink (Can)', 4]],                                              'mobile', 'delivery'],
  [ 4, 19, 30, null, [['Paneer Butter Masala', 2], ['Veg Fried Rice', 2], ['Mineral Water', 4]],                                               'mobile', 'delivery'],
  [ 4, 21,  0, null, [['BBQ Chicken Pizza', 2], ['Chicken Wings', 2], ['Cold Coffee', 2]],                                                     'card',   'delivery'],

  // ── Day 5 — Dining ────────────────────────────────────────────────────────
  [ 5,  8,  0, 2, [['Masala Chai', 2], ['Garlic Bread', 1]],                                                                                   'cash'   ],
  [ 5,  9, 30, 4, [['Veg Spring Rolls', 1], ['Paneer Tikka', 1], ['Cold Coffee', 2]],                                                          'card'   ],
  [ 5, 11, 45, 0, [['Paneer Tikka', 2], ['Dal Makhani', 2], ['Masala Chai', 2]],                                                               'cash'   ],
  [ 5, 12, 30, 5, [['Butter Chicken', 2], ['Chicken Biryani', 2], ['Mango Lassi', 2]],                                                         'mobile' ],
  [ 5, 13, 15, 1, [['Fish & Chips', 2], ['Crispy Calamari', 1], ['Sparkling Water', 2]],                                                       'cash'   ],
  [ 5, 14, 45, 3, [['Margherita Pizza', 2], ['Veg Burger', 2], ['Fresh Lime Soda', 2]],                                                        'card'   ],
  [ 5, 16, 30, 2, [['BBQ Chicken Pizza', 2], ['Pasta Arrabbiata', 1], ['Cold Coffee', 2]],                                                     'cash'   ],
  [ 5, 18, 15, 0, [['Grilled Chicken Steak', 2], ['Soup of the Day', 2], ['Fresh Orange Juice', 2]],                                           'card'   ],
  [ 5, 19,  0, 4, [['Chicken Wings', 2], ['Butter Chicken', 2], ['Gulab Jamun (2 pcs)', 2], ['Masala Chai', 2]],                               'cash'   ],
  [ 5, 20, 15, 5, [['Chicken Biryani', 2], ['Paneer Butter Masala', 2], ['Mango Lassi', 2]],                                                   'mobile' ],
  [ 5, 21,  0, 1, [['BBQ Chicken Pizza', 1], ['Chicken Burger', 2], ['Tiramisu', 2], ['Soft Drink (Can)', 2]],                                 'cash'   ],
  // Day 5 — Takeaway
  [ 5, 10, 30, null, [['Veg Spring Rolls', 1], ['Masala Chai', 2]],                                                                            'cash',   'takeaway'],
  [ 5, 12, 15, null, [['Chicken Biryani', 2], ['Fresh Lime Soda', 2]],                                                                         'mobile', 'takeaway'],
  [ 5, 13, 45, null, [['Margherita Pizza', 1], ['Garlic Bread', 1], ['Cold Coffee', 1]],                                                       'card',   'takeaway'],
  [ 5, 17,  0, null, [['Butter Chicken', 1], ['Dal Makhani', 1], ['Mineral Water', 2]],                                                        'cash',   'takeaway'],
  [ 5, 19, 30, null, [['BBQ Chicken Pizza', 1], ['Paneer Tikka', 1], ['Mango Lassi', 2]],                                                      'mobile', 'takeaway'],
  [ 5, 21,  0, null, [['Chicken Burger', 2], ['Soft Drink (Can)', 2]],                                                                         'card',   'takeaway'],
  // Day 5 — Delivery
  [ 5, 12,  0, null, [['Butter Chicken', 2], ['Veg Fried Rice', 1], ['Mango Lassi', 2]],                                                       'mobile', 'delivery'],
  [ 5, 13, 30, null, [['Chicken Biryani', 3], ['Veg Spring Rolls', 1], ['Cold Coffee', 2]],                                                    'card',   'delivery'],
  [ 5, 19,  0, null, [['Paneer Butter Masala', 2], ['Dal Makhani', 1], ['Gulab Jamun (2 pcs)', 2], ['Mineral Water', 2]],                      'mobile', 'delivery'],
  [ 5, 20, 30, null, [['BBQ Chicken Pizza', 2], ['Chicken Wings', 1], ['Soft Drink (Can)', 4]],                                                'card',   'delivery'],

  // ── Day 6 — Dining ────────────────────────────────────────────────────────
  [ 6,  9, 30, 3, [['Garlic Bread', 2], ['Masala Chai', 2], ['Bruschetta', 1]],                                                                'cash'   ],
  [ 6, 11,  0, 1, [['Veg Spring Rolls', 2], ['Paneer Tikka', 2], ['Fresh Lime Soda', 2]],                                                      'card'   ],
  [ 6, 12, 15, 5, [['Butter Chicken', 2], ['Dal Makhani', 2], ['Mango Lassi', 2]],                                                             'cash'   ],
  [ 6, 12, 50, 0, [['Chicken Biryani', 3], ['Onion Rings', 1], ['Fresh Lime Soda', 3]],                                                        'mobile' ],
  [ 6, 13, 35, 2, [['Crispy Calamari', 1], ['Fish & Chips', 2], ['Sparkling Water', 2]],                                                       'cash'   ],
  [ 6, 14, 20, 4, [['Margherita Pizza', 2], ['Chicken Wings', 2], ['Soft Drink (Can)', 4]],                                                    'card'   ],
  [ 6, 15, 30, 3, [['Grilled Chicken Steak', 2], ['Pasta Arrabbiata', 2], ['Cold Coffee', 2]],                                                 'cash'   ],
  [ 6, 17, 15, 1, [['Soup of the Day', 2], ['Dal Makhani', 2], ['Masala Chai', 3]],                                                            'cash'   ],
  [ 6, 18, 30, 5, [['Paneer Tikka', 2], ['Paneer Butter Masala', 2], ['Fresh Orange Juice', 2]],                                               'card'   ],
  [ 6, 19, 45, 0, [['Chicken Wings', 2], ['Butter Chicken', 3], ['Chicken Biryani', 2], ['Gulab Jamun (2 pcs)', 3]],                           'mobile' ],
  [ 6, 20, 30, 2, [['BBQ Chicken Pizza', 2], ['Veg Burger', 2], ['Chocolate Lava Cake', 2], ['Cold Coffee', 2]],                               'cash'   ],
  [ 6, 21, 15, 4, [['Margherita Pizza', 2], ['Chicken Burger', 2], ['Tiramisu', 2], ['Soft Drink (Can)', 3]],                                  'card'   ],
  // Day 6 — Takeaway
  [ 6, 11,  0, null, [['Veg Burger', 1], ['Masala Chai', 2]],                                                                                  'cash',   'takeaway'],
  [ 6, 12, 30, null, [['Chicken Biryani', 2], ['Fresh Lime Soda', 2]],                                                                         'mobile', 'takeaway'],
  [ 6, 14,  0, null, [['Margherita Pizza', 1], ['Garlic Bread', 1], ['Cold Coffee', 1]],                                                       'card',   'takeaway'],
  [ 6, 18, 30, null, [['Butter Chicken', 2], ['Dal Makhani', 1], ['Mineral Water', 2]],                                                        'cash',   'takeaway'],
  [ 6, 20,  0, null, [['BBQ Chicken Pizza', 1], ['Chicken Wings', 1], ['Mango Lassi', 2]],                                                     'mobile', 'takeaway'],
  // Day 6 — Delivery
  [ 6, 12,  0, null, [['Butter Chicken', 2], ['Veg Fried Rice', 2], ['Mango Lassi', 2]],                                                       'mobile', 'delivery'],
  [ 6, 14, 30, null, [['Chicken Biryani', 2], ['Paneer Tikka', 1], ['Cold Coffee', 2]],                                                        'card',   'delivery'],
  [ 6, 19,  0, null, [['Margherita Pizza', 2], ['Veg Spring Rolls', 1], ['Fresh Lime Soda', 4]],                                               'mobile', 'delivery'],
  [ 6, 21,  0, null, [['Paneer Butter Masala', 2], ['Gulab Jamun (2 pcs)', 2], ['Soft Drink (Can)', 2]],                                       'card',   'delivery'],
];

// ── Ingredients catalogue (costs in INR per unit) ─────────────────────────
// [name, unit, opening_stock, reorder_level, reorder_qty, latest_unit_cost]
// opening_stock is the amount received as initial stock (used for PURCHASE txn).
// stock_on_hand in the DB is set to 0 on insert and reconciled at the end.
const INGREDIENTS = [
  ['Chicken',              'kg',  10.000,  2.0,  5.0, 280.0000],
  ['Butter',               'kg',   5.000,  1.0,  3.0, 450.0000],
  ['Tomatoes',             'kg',   8.000,  2.0,  5.0,  60.0000],
  ['Black Lentils',        'kg',   5.000,  1.0,  3.0, 120.0000],
  ['Basmati Rice',         'kg',  15.000,  3.0, 10.0, 100.0000],
  ['Milk',                 'L',   10.000,  2.0,  5.0,  60.0000],
  ['Tea Leaves',           'kg',   2.000,  0.3,  1.0, 600.0000],
  ['Coffee',               'kg',   2.000,  0.3,  1.0, 900.0000],
  ['Mango Pulp',           'L',    5.000,  1.0,  3.0, 200.0000],
  ['Oranges',              'kg',   6.000,  1.5,  4.0, 100.0000],
  ['Cooking Cream',        'L',    4.000,  1.0,  3.0, 280.0000],
  ['Onions',               'kg',  10.000,  2.0,  5.0,  40.0000],
  ['Garlic',               'kg',   3.000,  0.5,  2.0, 200.0000],
  ['Spice Blend',          'kg',   2.000,  0.3,  1.0, 350.0000],
  ['Paneer',               'kg',   4.000,  0.8,  2.0, 340.0000],
  ['All-Purpose Flour',    'kg',  10.000,  2.0,  5.0,  45.0000],
  ['Chicken Breast',       'kg',   8.000,  2.0,  5.0, 380.0000],
  ['Fish Fillet',          'kg',   5.000,  1.0,  3.0, 550.0000],
  ['Potatoes',             'kg',  10.000,  2.0,  5.0,  30.0000],
  ['Mozzarella Cheese',    'kg',   3.000,  0.5,  2.0, 480.0000],
  ['Pizza Dough',          'pcs', 20.000,  5.0, 10.0,  45.0000],
  ['Pasta',                'kg',   5.000,  1.0,  3.0,  80.0000],
  ['Dark Chocolate',       'kg',   2.000,  0.3,  1.0, 600.0000],
  ['Sugar',                'kg',   5.000,  1.0,  3.0,  45.0000],
  ['Yogurt',               'L',    5.000,  1.0,  3.0,  80.0000],
  ['Burger Bun',           'pcs', 50.000, 10.0, 20.0,  20.0000],
  // Additional ingredients for full menu coverage
  ['Bread Loaf',           'pcs', 30.000,  8.0, 20.0,  30.0000],
  ['Vegetable Mix',        'kg',   5.000,  1.5,  3.0,  80.0000],
  ['Spring Roll Wrappers', 'pcs', 30.000,  8.0, 20.0,   8.0000],
  ['Calamari',             'kg',   3.000,  0.8,  2.0, 650.0000],
  ['Heavy Cream',          'L',    2.000,  0.5,  1.5, 180.0000],
  ['BBQ Sauce',            'L',    2.000,  0.5,  1.5, 250.0000],
  ['Eggs',                 'pcs', 30.000,  8.0, 20.0,  12.0000],
];

// ── Recipes & ingredients ──────────────────────────────────────────────────
// Each recipe: [recipeName, yieldQty, yieldUnit, prepTimeSec, menuItemName,
//               [[ingredientName, qty, unit], ...]]
// 30 recipes covering all menu items except packaged goods
// (Mineral Water, Sparkling Water, Soft Drink Can, Fresh Lime Soda).
const RECIPES = [
  // ── Starters ──────────────────────────────────────────────────────────────
  ['Veg Spring Rolls', 1, 'portion', 600, 'Veg Spring Rolls', [
    ['Spring Roll Wrappers', 2.0000, 'pcs'],
    ['Vegetable Mix',        0.1000, 'kg' ],
    ['All-Purpose Flour',    0.0200, 'kg' ],
  ]],
  ['Chicken Wings', 1, 'portion', 720, 'Chicken Wings', [
    ['Chicken',     0.3000, 'kg'],
    ['Spice Blend', 0.0200, 'kg'],
    ['Garlic',      0.0150, 'kg'],
    ['BBQ Sauce',   0.0300, 'L' ],
  ]],
  ['Garlic Bread', 1, 'portion', 300, 'Garlic Bread', [
    ['Bread Loaf', 2.0000, 'pcs'],
    ['Butter',     0.0300, 'kg' ],
    ['Garlic',     0.0100, 'kg' ],
  ]],
  ['Onion Rings', 1, 'portion', 480, 'Onion Rings', [
    ['Onions',           0.1500, 'kg'],
    ['All-Purpose Flour',0.0500, 'kg'],
    ['Milk',             0.0500, 'L' ],
  ]],
  ['Paneer Tikka', 1, 'portion', 600, 'Paneer Tikka', [
    ['Paneer',      0.1500, 'kg'],
    ['Onions',      0.0500, 'kg'],
    ['Spice Blend', 0.0200, 'kg'],
    ['Yogurt',      0.0500, 'L' ],
  ]],
  ['Crispy Calamari', 1, 'portion', 600, 'Crispy Calamari', [
    ['Calamari',         0.2000, 'kg' ],
    ['All-Purpose Flour',0.0500, 'kg' ],
    ['Spice Blend',      0.0100, 'kg' ],
    ['Eggs',             1.0000, 'pcs'],
  ]],
  ['Bruschetta', 1, 'portion', 300, 'Bruschetta', [
    ['Bread Loaf', 2.0000, 'pcs'],
    ['Tomatoes',   0.1000, 'kg' ],
    ['Garlic',     0.0100, 'kg' ],
  ]],
  ['Soup of the Day', 1, 'bowl', 600, 'Soup of the Day', [
    ['Vegetable Mix', 0.1500, 'kg'],
    ['Onions',        0.0500, 'kg'],
    ['Cooking Cream', 0.0500, 'L' ],
    ['Spice Blend',   0.0100, 'kg'],
  ]],
  // ── Mains ─────────────────────────────────────────────────────────────────
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
  ['Veg Fried Rice', 1, 'portion', 720, 'Veg Fried Rice', [
    ['Basmati Rice',  0.2000, 'kg'],
    ['Vegetable Mix', 0.1500, 'kg'],
    ['Onions',        0.0800, 'kg'],
    ['Garlic',        0.0150, 'kg'],
  ]],
  ['Chicken Biryani', 1, 'portion', 1200, 'Chicken Biryani', [
    ['Chicken',      0.3000, 'kg'],
    ['Basmati Rice', 0.2000, 'kg'],
    ['Onions',       0.1500, 'kg'],
    ['Garlic',       0.0200, 'kg'],
    ['Spice Blend',  0.0300, 'kg'],
  ]],
  ['Grilled Chicken Steak', 1, 'portion', 900, 'Grilled Chicken Steak', [
    ['Chicken Breast', 0.2800, 'kg'],
    ['Spice Blend',    0.0200, 'kg'],
    ['Butter',         0.0300, 'kg'],
  ]],
  ['Fish & Chips', 1, 'portion', 900, 'Fish & Chips', [
    ['Fish Fillet',      0.2000, 'kg'],
    ['Potatoes',         0.2000, 'kg'],
    ['All-Purpose Flour',0.0500, 'kg'],
    ['Spice Blend',      0.0100, 'kg'],
  ]],
  ['Veg Burger', 1, 'portion', 600, 'Veg Burger', [
    ['Burger Bun',       1.0000, 'pcs'],
    ['Potatoes',         0.1500, 'kg' ],
    ['Vegetable Mix',    0.1000, 'kg' ],
    ['Onions',           0.0500, 'kg' ],
    ['All-Purpose Flour',0.0300, 'kg' ],
  ]],
  ['Chicken Burger', 1, 'portion', 600, 'Chicken Burger', [
    ['Burger Bun',     1.0000, 'pcs'],
    ['Chicken Breast', 0.1500, 'kg' ],
    ['Onions',         0.0300, 'kg' ],
    ['Spice Blend',    0.0150, 'kg' ],
  ]],
  ['Margherita Pizza', 1, 'pizza', 900, 'Margherita Pizza', [
    ['Pizza Dough',      1.0000, 'pcs'],
    ['Mozzarella Cheese',0.1200, 'kg' ],
    ['Tomatoes',         0.1500, 'kg' ],
  ]],
  ['BBQ Chicken Pizza', 1, 'pizza', 900, 'BBQ Chicken Pizza', [
    ['Pizza Dough',      1.0000, 'pcs'],
    ['Mozzarella Cheese',0.1200, 'kg' ],
    ['Chicken',          0.1500, 'kg' ],
    ['BBQ Sauce',        0.0600, 'L'  ],
  ]],
  ['Pasta Arrabbiata', 1, 'portion', 720, 'Pasta Arrabbiata', [
    ['Pasta',       0.1500, 'kg'],
    ['Tomatoes',    0.2000, 'kg'],
    ['Garlic',      0.0200, 'kg'],
    ['Spice Blend', 0.0200, 'kg'],
  ]],
  ['Paneer Butter Masala', 1, 'portion', 720, 'Paneer Butter Masala', [
    ['Paneer',        0.2000, 'kg'],
    ['Butter',        0.0400, 'kg'],
    ['Tomatoes',      0.1200, 'kg'],
    ['Cooking Cream', 0.0500, 'L' ],
    ['Onions',        0.0800, 'kg'],
    ['Spice Blend',   0.0200, 'kg'],
  ]],
  // ── Desserts ──────────────────────────────────────────────────────────────
  ['Chocolate Lava Cake', 1, 'serving', 600, 'Chocolate Lava Cake', [
    ['Dark Chocolate',   0.0800, 'kg' ],
    ['Butter',           0.0400, 'kg' ],
    ['Sugar',            0.0400, 'kg' ],
    ['All-Purpose Flour',0.0300, 'kg' ],
    ['Eggs',             2.0000, 'pcs'],
  ]],
  ['Gulab Jamun', 2, 'pcs', 480, 'Gulab Jamun (2 pcs)', [
    ['All-Purpose Flour',0.0600, 'kg'],
    ['Milk',             0.0400, 'L' ],
    ['Sugar',            0.0600, 'kg'],
    ['Cooking Cream',    0.0200, 'L' ],
  ]],
  ['Vanilla Ice Cream', 1, 'serving', 60, 'Vanilla Ice Cream', [
    ['Milk',        0.1000, 'L' ],
    ['Sugar',       0.0300, 'kg'],
    ['Heavy Cream', 0.0800, 'L' ],
  ]],
  ['Mango Sorbet', 1, 'serving', 60, 'Mango Sorbet', [
    ['Mango Pulp', 0.1200, 'L' ],
    ['Sugar',      0.0300, 'kg'],
  ]],
  ['Cheesecake', 1, 'slice', 120, 'Cheesecake', [
    ['All-Purpose Flour',0.0600, 'kg'],
    ['Butter',           0.0400, 'kg'],
    ['Sugar',            0.0500, 'kg'],
    ['Cooking Cream',    0.1000, 'L' ],
  ]],
  ['Tiramisu', 1, 'serving', 120, 'Tiramisu', [
    ['Coffee',        0.0200, 'kg'],
    ['Sugar',         0.0400, 'kg'],
    ['Cooking Cream', 0.1000, 'L' ],
    ['Milk',          0.0500, 'L' ],
  ]],
  // ── Drinks ────────────────────────────────────────────────────────────────
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
  ['Fresh Orange Juice', 1, 'glass', 120, 'Fresh Orange Juice', [
    ['Oranges', 0.3000, 'kg'],
  ]],
];

// ── Combo meals (prices in INR) ────────────────────────────────────────────
// [name, sku, price, [[menuItemName, qty, sort_order], ...]]
const COMBOS = [
  ['Veg Lunch Special', 'COMBO-VEG-01', 649, [
    ['Paneer Tikka', 1, 0],
    ['Dal Makhani',  1, 1],
    ['Masala Chai',  1, 2],
  ]],
  ["Chef's Non-Veg Combo", 'COMBO-NV-01', 899, [
    ['Chicken Wings',  1, 0],
    ['Butter Chicken', 1, 1],
    ['Cold Coffee',    1, 2],
  ]],
];

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();

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
  // Reservations
  await client.query('DELETE FROM reservations WHERE restaurant_id = $1', [RESTAURANT_ID]);
  // Core tables
  await client.query(`
    DELETE FROM payments
    WHERE order_id IN (SELECT id FROM orders WHERE restaurant_id = $1)
  `, [RESTAURANT_ID]);
  await client.query(`
    DELETE FROM order_items
    WHERE order_id IN (SELECT id FROM orders WHERE restaurant_id = $1)
  `, [RESTAURANT_ID]);
  await client.query('DELETE FROM orders              WHERE restaurant_id = $1', [RESTAURANT_ID]);
  await client.query('DELETE FROM menu_items          WHERE restaurant_id = $1', [RESTAURANT_ID]);
  await client.query('DELETE FROM tables              WHERE restaurant_id = $1', [RESTAURANT_ID]);
  await client.query('DELETE FROM shift_counts        WHERE restaurant_id = $1', [RESTAURANT_ID]);
  await client.query('DELETE FROM staff_notifications WHERE restaurant_id = $1', [RESTAURANT_ID]);
  await client.query('DELETE FROM users               WHERE restaurant_id = $1', [RESTAURANT_ID]);
  await client.query('DELETE FROM settings   WHERE restaurant_id = $1', [RESTAURANT_ID]);
  await client.query('DELETE FROM loyalty_transactions WHERE restaurant_id = $1', [RESTAURANT_ID]);
  await client.query('DELETE FROM loyalty_customers   WHERE restaurant_id = $1', [RESTAURANT_ID]);
  await client.query('DELETE FROM loyalty_tiers       WHERE restaurant_id = $1', [RESTAURANT_ID]);
  await client.query('DELETE FROM loyalty_rewards     WHERE restaurant_id = $1', [RESTAURANT_ID]);
  await client.query('DELETE FROM coupons             WHERE restaurant_id = $1', [RESTAURANT_ID]);

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
      ($1, 'timezone',                 'Asia/Kolkata'),
      ($1, 'currency',                 'INR'),
      ($1, 'tax_rate',                 '5'),
      ($1, 'service_charge',           '0'),
      ($1, 'staff_assignment_enabled',  'true'),
      ($1, 'reservations_enabled',      'true'),
      ($1, 'loyalty_points_per_unit',   '10'),
      ($1, 'loyalty_points_value',      '0.1')
  `, [RESTAURANT_ID]);

  // ── 3.5. Loyalty tiers & rewards ──────────────────────────────────────────
  console.log('Seeding loyalty tiers and rewards…');
  const DEFAULT_TIERS = [
    { name: 'Bronze',   min_points: 0,     color: '#a06b2a', sort_order: 0 },
    { name: 'Silver',   min_points: 1000,  color: '#5a6068', sort_order: 1 },
    { name: 'Gold',     min_points: 5000,  color: '#8a6a14', sort_order: 2 },
    { name: 'Platinum', min_points: 10000, color: '#3a3a47', sort_order: 3 },
  ];
  const DEFAULT_REWARDS = [
    { name: 'Free Filter Coffee',    description: 'House blend · any size',  icon: '☕', points_cost: 500,  sort_order: 0 },
    { name: '15% off next bill',     description: 'Max ₹500 · dine-in only', icon: '%',  points_cost: 1500, sort_order: 1 },
    { name: 'Complimentary Dessert', description: 'Choice of three',         icon: '🍰', points_cost: 2000, sort_order: 2 },
  ];
  for (const t of DEFAULT_TIERS) {
    await client.query(
      `INSERT INTO loyalty_tiers (restaurant_id, name, min_points, color, sort_order)
       VALUES ($1, $2, $3, $4, $5)`,
      [RESTAURANT_ID, t.name, t.min_points, t.color, t.sort_order],
    );
  }
  for (const r of DEFAULT_REWARDS) {
    await client.query(
      `INSERT INTO loyalty_rewards (restaurant_id, name, description, icon, points_cost, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [RESTAURANT_ID, r.name, r.description, r.icon, r.points_cost, r.sort_order],
    );
  }
  console.log(`  ${DEFAULT_TIERS.length} tiers, ${DEFAULT_REWARDS.length} rewards inserted`);

  // ── 4. Users ───────────────────────────────────────────────────────────────
  console.log('Seeding users…');
  const uniquePasswords = [...new Set(SEED_USERS.map((u) => u.password))];
  const hashes = await Promise.all(uniquePasswords.map((p) => bcrypt.hash(p, 10)));
  const hashByPassword = Object.fromEntries(uniquePasswords.map((p, i) => [p, hashes[i]]));

  for (const u of SEED_USERS) {
    await client.query(`
      INSERT INTO users (id, email, password, role, name, staff_pin, restaurant_id, email_verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true)
    `, [u.id, u.email, hashByPassword[u.password], u.role, u.name, u.pin, RESTAURANT_ID]);
  }

  // ── 4.5. Coupons ───────────────────────────────────────────────────────────
  console.log('Seeding coupons…');
  const SEED_COUPONS = [
    { code: 'WELCOME10', description: '10% off for new customers',        discount_type: 'percent', discount_value: 10,  min_order_amount: 0,   max_uses: null, expires_at: null },
    { code: 'FLAT50',    description: '₹50 flat discount on orders ₹300+', discount_type: 'flat',    discount_value: 50,  min_order_amount: 300, max_uses: null, expires_at: null },
    { code: 'SAVE20',    description: '20% off weekday orders',            discount_type: 'percent', discount_value: 20,  min_order_amount: 200, max_uses: 100,  expires_at: null },
    { code: 'PARTY15',   description: '15% off for groups (orders ₹500+)', discount_type: 'percent', discount_value: 15,  min_order_amount: 500, max_uses: 50,   expires_at: null },
  ];
  for (const c of SEED_COUPONS) {
    await client.query(`
      INSERT INTO coupons (restaurant_id, code, description, discount_type, discount_value, min_order_amount, max_uses, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [RESTAURANT_ID, c.code, c.description, c.discount_type, c.discount_value, c.min_order_amount, c.max_uses, c.expires_at]);
  }

  // ── 5. Tables ──────────────────────────────────────────────────────────────
  console.log('Seeding tables…');
  // Fixed UUIDs so QR codes survive re-seeding
  const TABLE_DEFS = [
    { id: '00000000-0000-0000-0000-000000000011', seats: 2 },
    { id: '00000000-0000-0000-0000-000000000012', seats: 2 },
    { id: '00000000-0000-0000-0000-000000000013', seats: 4 },
    { id: '00000000-0000-0000-0000-000000000014', seats: 4 },
    { id: '00000000-0000-0000-0000-000000000015', seats: 6 },
    { id: '00000000-0000-0000-0000-000000000016', seats: 8 },
  ];
  const tableIds = [];
  for (let i = 0; i < TABLE_DEFS.length; i++) {
    const { id, seats } = TABLE_DEFS[i];
    await client.query(`
      INSERT INTO tables (id, number, status, seats, restaurant_id)
      VALUES ($1, $2, 'available', $3, $4)
      ON CONFLICT (id) DO UPDATE SET number = $2, seats = $3, status = 'available'
    `, [id, i + 1, seats, RESTAURANT_ID]);
    tableIds.push(id);
    console.log(`  Table ${i + 1} — ${seats} seats`);
  }

  // ── 6. Menu items ──────────────────────────────────────────────────────────
  console.log('Seeding menu items…');
  const menuIdByName = {};
  const menuPriceByName = {};
  for (const item of MENU) {
    const { rows: [m] } = await client.query(`
      INSERT INTO menu_items (name, price, category, available, restaurant_id, description)
      VALUES ($1, $2, $3, true, $4, $5) RETURNING id
    `, [item.name, item.price, item.category, RESTAURANT_ID, item.description || null]);
    menuIdByName[item.name] = m.id;
    menuPriceByName[item.name] = item.price;
  }

  // ── 7. Orders, items, payments ────────────────────────────────────────────
  console.log('Seeding orders and payments…');
  const ordersCreated = []; // saved for SALE transaction generation in step 11.5
  const nowMs = Date.now();
  for (const [daysAgo, hour, minute, tableIdx, lines, payMethod = 'cash', channel = 'dining'] of ORDER_SCHEDULE) {
    const dateStr     = new Date(nowMs - daysAgo * 86400_000).toISOString().slice(0, 10);
    const scheduledMs = new Date(`${dateStr}T${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:00Z`).getTime();
    // Never use a future timestamp — cap to 2 minutes ago so real orders always sort above seed orders
    const effectiveMs = Math.min(scheduledMs, nowMs - 2 * 60 * 1000);
    const ts = new Date(effectiveMs).toISOString();

    const tableId = channel === 'dining' ? tableIds[tableIdx] : null;
    const { rows: [order] } = await client.query(
      channel === 'dining'
        ? `INSERT INTO orders (table_id, restaurant_id, created_by, status, created_at, channel, table_session_id)
           VALUES ($1, $2, $3, 'paid', $4, $5, gen_random_uuid()) RETURNING id`
        : `INSERT INTO orders (table_id, restaurant_id, created_by, status, created_at, channel)
           VALUES ($1, $2, $3, 'paid', $4, $5) RETURNING id`,
      [tableId, RESTAURANT_ID, ADMIN_ID, ts, channel],
    );

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
      VALUES ($1, $2, $3, 'completed', $2, $2)
    `, [order.id, subtotal.toFixed(2), payMethod]);

    ordersCreated.push({ orderId: order.id, ts, lines });
  }

  // ── 8. Ingredients ─────────────────────────────────────────────────────────
  console.log('Seeding ingredients…');
  const ingredientIdByName = {};
  const ingredientCostByName = {};
  const ingredientUnitByName = {};
  for (const [name, unit, , reorder_level, reorder_qty, cost] of INGREDIENTS) {
    const { rows: [ing] } = await client.query(`
      INSERT INTO ingredients
        (restaurant_id, name, unit, stock_on_hand, reorder_level, reorder_qty, latest_unit_cost, is_active)
      VALUES ($1, $2, $3, 0, $4, $5, $6, true) RETURNING id
    `, [RESTAURANT_ID, name, unit, reorder_level, reorder_qty, cost]);
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

  // ── 11.5. SALE transactions — one per ingredient per order line ───────────
  console.log('Seeding SALE inventory transactions…');

  // Build menuItemName → [{ingredientId, qtyPerServing, unitCost}]
  const recipeIngsByMenuItem = {};
  for (const [, , , , menuItemName, lines] of RECIPES) {
    if (!menuItemName) continue;
    recipeIngsByMenuItem[menuItemName] = lines.map(([ingName, qty]) => ({
      ingredientId: ingredientIdByName[ingName],
      qtyPerServing: qty,
      unitCost: ingredientCostByName[ingName],
    }));
  }

  let saleTxnCount = 0;
  for (const { orderId, ts, lines } of ordersCreated) {
    for (const [itemName, qty] of lines) {
      const recipe = recipeIngsByMenuItem[itemName];
      if (!recipe) continue;
      for (const { ingredientId, qtyPerServing, unitCost } of recipe) {
        const delta = -(qtyPerServing * qty);
        await client.query(`
          INSERT INTO inventory_transactions
            (restaurant_id, ingredient_id, txn_type, quantity_delta, unit_cost, ref_id, performed_by, created_at)
          VALUES ($1, $2, 'SALE', $3, $4, $5, $6, $7)
        `, [RESTAURANT_ID, ingredientId, delta, unitCost, orderId, ADMIN_ID, ts]);
        saleTxnCount++;
      }
    }
  }
  console.log(`  ${saleTxnCount} SALE transactions inserted`);

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

  // ── 13.5. Reconcile stock_on_hand from transaction ledger ─────────────────
  console.log('Reconciling stock_on_hand…');
  await client.query(`
    UPDATE ingredients i
    SET stock_on_hand = COALESCE((
      SELECT SUM(it.quantity_delta)
      FROM inventory_transactions it
      WHERE it.ingredient_id = i.id
        AND it.restaurant_id = i.restaurant_id
    ), 0)
    WHERE i.restaurant_id = $1
  `, [RESTAURANT_ID]);

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

  // ── 15. Reservations ───────────────────────────────────────────────────────
  console.log('Seeding reservations…');
  // Two past (seated), two upcoming dinner slots
  const RESERVATIONS = [
    { guestName: 'Rahul Sharma',   guestPhone: '9876543210', partySize: 2, tableIdx: 0, hoursOffset: -4, status: 'seated',   notes: 'Window seat preferred' },
    { guestName: 'Priya Nair',     guestPhone: '9812345678', partySize: 4, tableIdx: 2, hoursOffset: -2, status: 'seated',   notes: null },
    { guestName: 'Vikram Mehta',   guestPhone: '9700011223', partySize: 3, tableIdx: 1, hoursOffset:  2, status: 'upcoming', notes: 'Anniversary dinner — surprise cake' },
    { guestName: 'Sunita Kapoor',  guestPhone: '9988776655', partySize: 6, tableIdx: 4, hoursOffset:  4, status: 'upcoming', notes: 'Birthday party, need high chair' },
  ];
  let resCount = 0;
  for (const r of RESERVATIONS) {
    const reservedAt = new Date(Date.now() + r.hoursOffset * 3600 * 1000).toISOString();
    const notifiedAt = r.status === 'seated' ? new Date(Date.now() + (r.hoursOffset + 0.25) * 3600 * 1000).toISOString() : null;
    await client.query(`
      INSERT INTO reservations
        (restaurant_id, table_id, guest_name, guest_phone, party_size, reserved_at, status, notes, notified_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [RESTAURANT_ID, tableIds[r.tableIdx], r.guestName, r.guestPhone, r.partySize, reservedAt, r.status, r.notes, notifiedAt]);
    resCount++;
  }
  console.log(`  ${resCount} reservations inserted`);

  // ── 16. Loyalty customers & transactions ───────────────────────────────────
  console.log('Seeding loyalty customers and transactions…');

  // daysAgo helper
  const dAgo = (d) => new Date(Date.now() - d * 86400_000).toISOString();

  // [phone, name, balance, transactions: [type, points, description, daysAgo]]
  const LOYALTY_CUSTOMERS = [
    ['9876543210', 'Priya Sharma',    6200, [
      ['earn',   1500, 'Earned from order',          92],
      ['earn',   2200, 'Earned from order',          61],
      ['redeem', -500, 'Redeemed on order',          46],
      ['earn',   1800, 'Earned from order',          21],
      ['earn',   1200, 'Earned from order',           7],
    ]],
    ['9845678901', 'Rahul Mehta',     2800, [
      ['earn',   1000, 'Earned from order',          58],
      ['earn',    800, 'Earned from order',          30],
      ['earn',   1000, 'Earned from order',          14],
    ]],
    ['9812345670', 'Ananya Krishnan', 12500, [
      ['earn',   3000, 'Earned from order',         180],
      ['earn',   2500, 'Earned from order',         120],
      ['redeem',-1500, 'Redeemed on order',          90],
      ['earn',   2000, 'Earned from order',          60],
      ['earn',   3000, 'Earned from order',          30],
      ['earn',   3500, 'Earned from order',          14],
    ]],
    ['9700011220', 'Vikram Nair',      450, [
      ['earn',    450, 'Earned from order',          14],
    ]],
    ['9988776650', 'Sunita Patel',    1750, [
      ['earn',    900, 'Earned from order',          42],
      ['earn',    850, 'Earned from order',          21],
    ]],
    ['9123456789', 'Amit Joshi',      7800, [
      ['earn',   2000, 'Earned from order',          90],
      ['earn',   1500, 'Earned from order',          60],
      ['redeem', -500, 'Redeemed on order',          45],
      ['earn',   2800, 'Earned from order',          30],
      ['earn',   2000, 'Earned from order',          14],
    ]],
    ['9876501234', 'Deepa Iyer',       200, [
      ['earn',    200, 'Earned from order',           5],
    ]],
    ['9654321098', 'Karan Malhotra',  3400, [
      ['earn',   1200, 'Earned from order',          56],
      ['earn',    700, 'Earned from order',          35],
      ['adjust',  500, 'Welcome bonus',              21],
      ['earn',   1000, 'Earned from order',           7],
    ]],
    ['9543210987', 'Neha Gupta',     15200, [
      ['earn',   4000, 'Earned from order',         180],
      ['earn',   3500, 'Earned from order',         120],
      ['redeem',-2000, 'Redeemed on order',          90],
      ['earn',   3000, 'Earned from order',          60],
      ['earn',   4200, 'Earned from order',          30],
      ['earn',   2500, 'Earned from order',          14],
    ]],
    ['9432109876', 'Rohan Bose',       800, [
      ['earn',    800, 'Earned from order',          21],
    ]],
  ];

  let loyaltyCustomerCount = 0;
  let loyaltyTxnCount = 0;
  for (const [phone, name, balance, txns] of LOYALTY_CUSTOMERS) {
    const { rows: [cust] } = await client.query(
      `INSERT INTO loyalty_customers (restaurant_id, phone, name, points_balance)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [RESTAURANT_ID, phone, name, balance],
    );
    loyaltyCustomerCount++;
    for (const [type, points, description, daysAgo] of txns) {
      await client.query(
        `INSERT INTO loyalty_transactions (restaurant_id, customer_id, type, points, description, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [RESTAURANT_ID, cust.id, type, points, description, dAgo(daysAgo)],
      );
      loyaltyTxnCount++;
    }
  }
  console.log(`  ${loyaltyCustomerCount} customers, ${loyaltyTxnCount} transactions inserted`);

  // ── 17. Reviews ────────────────────────────────────────────────────────────
  console.log('Seeding reviews…');
  // [tableIdx, overall, food, service, comment, daysAgo, hoursAgo, customerPhone?]
  // Phones matching loyalty customers: Priya 9876543210, Rahul 9845678901, Ananya 9812345670,
  // Amit 9123456789, Neha 9543210987, Karan 9654321098, Deepa 9876501234
  const SEED_REVIEWS = [
    [0, 5, 5, 5, 'Amazing food and excellent service! The butter chicken was outstanding.',          0, 2,  '9876543210'],
    [1, 4, 4, 5, 'Great atmosphere and friendly staff. Will definitely come back.',                  0, 4,  '9845678901'],
    [2, 5, 5, 4, 'The Margherita pizza was perfect. Crispy crust and fresh ingredients.',           0, 6,  null],
    [3, 3, 4, 3, 'Food was decent but the wait was a bit long.',                                    1, 1,  null],
    [4, 5, 5, 5, 'Best biryani in town! Absolutely delicious. Highly recommended.',                 1, 3,  '9812345670'],
    [0, 4, 5, 4, null,                                                                              1, 7,  '9999000001'],
    [5, 2, 2, 3, 'The chicken was undercooked and we had to send it back. Very disappointed.',      2, 2,  null],
    [1, 5, 4, 5, 'Wonderful dining experience. The paneer tikka was divine!',                       2, 4,  '9123456789'],
    [2, 4, 4, 4, 'Good food, reasonable prices. The cold coffee was excellent.',                    2, 7,  null],
    [3, 5, 5, 5, 'Perfect evening. Every dish was flavorful and the staff was attentive.',          3, 1,  '9543210987'],
    [4, 3, 3, 4, 'Average experience. The pizza was a bit too oily for my taste.',                  3, 3,  null],
    [0, 5, 5, 5, 'The chocolate lava cake is a must-try! Absolutely incredible.',                   3, 5,  '9654321098'],
    [1, 4, 5, 3, 'Food was fantastic but service was a little slow during peak hours.',             4, 2,  null],
    [5, 5, 5, 5, null,                                                                              4, 4,  '9876501234'],
    [2, 4, 4, 5, 'Very clean, attentive staff. The dal makhani was rich and creamy.',               4, 6,  null],
    [3, 1, 2, 1, 'Terrible experience. Wrong order served twice and staff was rude.',               5, 1,  '9999000002'],
    [4, 5, 4, 5, 'Loved the ambience. The grilled chicken steak was perfectly cooked.',             5, 3,  '9845678901'],
    [0, 4, 4, 4, 'Solid restaurant with consistent quality. Good value for money.',                 5, 6,  null],
    [1, 5, 5, 5, 'Outstanding! Every dish we ordered was exceptional. Will be back soon.',          6, 2,  '9876543210'],
    [2, 3, 3, 4, 'Decent food but nothing extraordinary. Portions were a bit small.',               6, 4,  null],
    [5, 5, 5, 4, 'The fish and chips were crispy and fresh. Great service as well!',                6, 6,  '9812345670'],
    [3, 4, 5, 4, 'Beautiful presentation and delicious flavors. Loved the tiramisu.',               6, 8,  null],
  ];
  let reviewCount = 0;
  for (const [tableIdx, overall, food, service, comment, daysAgo, hoursAgo, phone] of SEED_REVIEWS) {
    const createdAt = new Date(Date.now() - daysAgo * 86400_000 - hoursAgo * 3600_000).toISOString();
    // Match phone to loyalty customer if one exists
    let loyaltyCustomerId = null;
    if (phone) {
      const { rows: lc } = await client.query(
        'SELECT id FROM loyalty_customers WHERE restaurant_id = $1 AND phone = $2',
        [RESTAURANT_ID, phone],
      );
      loyaltyCustomerId = lc[0]?.id ?? null;
    }
    await client.query(
      `INSERT INTO reviews
         (restaurant_id, table_id, overall_rating, food_rating, service_rating, comment, created_at, customer_phone, loyalty_customer_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [RESTAURANT_ID, tableIds[tableIdx], overall, food, service, comment, createdAt, phone, loyaltyCustomerId],
    );
    reviewCount++;
  }
  console.log(`  ${reviewCount} reviews inserted`);

  await client.end();

  console.log('\nSeed complete!');
  console.log(`  Restaurant : Demo Restaurant (${RESTAURANT_ID})`);
  for (const u of SEED_USERS) {
    console.log(`  ${u.role.padEnd(8)}: ${u.email} / ${u.password}${u.pin ? ` (PIN: ${u.pin})` : ''}`);
  }
  console.log(`  Tables     : ${tableIds.length}`);
  console.log(`  Menu items : ${MENU.length}`);
  const diningCount   = ORDER_SCHEDULE.filter(([,,,,,, ch = 'dining']) => ch === 'dining').length;
  const takeawayCount = ORDER_SCHEDULE.filter(([,,,,,, ch]) => ch === 'takeaway').length;
  const deliveryCount = ORDER_SCHEDULE.filter(([,,,,,, ch]) => ch === 'delivery').length;
  console.log(`  Orders     : ${ORDER_SCHEDULE.length} paid orders (${diningCount} dining, ${takeawayCount} takeaway, ${deliveryCount} delivery) across 7 days`);
  console.log(`  Ingredients: ${INGREDIENTS.length} (stock reconciled from ledger)`);
  console.log(`  Recipes    : ${RECIPES.length} (${linkedCount} linked to menu items)`);
  console.log(`  Combos     : ${COMBOS.length}`);
  console.log(`  Inv. txns  : ${INGREDIENTS.length} PURCHASE + ${saleTxnCount} SALE + ${WASTE_ENTRIES.length} WASTE`);
  console.log(`  Waste logs : ${WASTE_ENTRIES.length}`);
  console.log(`  Snapshots  : ${snapshotCount}`);
  console.log(`  Reservations: ${resCount} (2 seated, 2 upcoming)`);
  console.log(`  Coupons    : ${SEED_COUPONS.length} (WELCOME10, FLAT50, SAVE20, PARTY15)`);
  console.log(`  Loyalty tiers  : ${DEFAULT_TIERS.length}`);
  console.log(`  Loyalty rewards: ${DEFAULT_REWARDS.length}`);
  console.log(`  Loyalty members: ${loyaltyCustomerCount} (3 Bronze, 3 Silver, 2 Gold, 2 Platinum)`);
  console.log(`  Loyalty txns   : ${loyaltyTxnCount}`);
  console.log(`  Reviews        : ${reviewCount} across 7 days`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
