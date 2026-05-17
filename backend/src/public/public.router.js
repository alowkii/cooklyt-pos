const express = require('express');
const cors = require('cors');
const db = require('../shared/db');
const menuRepo = require('../menu/menu.repository');
const ordersService = require('../orders/orders.service');
const ws = require('../shared/websocket');
const { currencies } = require('../../../shared/settings-options.json');

const authRepo = require('../auth/auth.repository');

const router = express.Router();
// Allow any origin — customers scan from mobile phones on any network
router.use(cors({ origin: '*' }));

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/public/table/:tableId
// Returns table + restaurant info for the customer-facing menu page
router.get('/table/:tableId', async (req, res, next) => {
  try {
    const { tableId } = req.params;
    if (!UUID_RE.test(tableId)) return res.status(404).json({ error: 'Table not found' });

    const { rows } = await db.query(
      `SELECT t.id, t.number AS table_number, t.status, t.seats,
              r.id AS restaurant_id, r.name AS restaurant_name,
              COALESCE(cur.value, 'USD') AS currency_code,
              COALESCE(sae.value, 'false') AS staff_assignment_enabled
       FROM tables t
       JOIN restaurants r ON r.id = t.restaurant_id
       LEFT JOIN settings cur ON cur.restaurant_id = t.restaurant_id AND cur.key = 'currency'
       LEFT JOIN settings sae ON sae.restaurant_id = t.restaurant_id AND sae.key = 'staff_assignment_enabled'
       WHERE t.id = $1`,
      [tableId],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Table not found' });

    const row = rows[0];
    const currencyInfo = currencies.find((c) => c.code === row.currency_code)
      || currencies.find((c) => c.code === 'USD');

    res.json({
      ...row,
      staff_assignment_enabled: row.staff_assignment_enabled === 'true',
      currency: {
        code: currencyInfo.code,
        symbol: currencyInfo.symbol,
        rate: currencyInfo.rate,
        decimals: currencyInfo.decimals,
      },
    });
  } catch (err) { next(err); }
});

// GET /api/public/menu/:restaurantId
// Returns all available menu items for the restaurant
router.get('/menu/:restaurantId', async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    if (!UUID_RE.test(restaurantId)) return res.status(404).json({ error: 'Not found' });
    const items = await menuRepo.getAvailable(restaurantId);
    res.json(items);
  } catch (err) { next(err); }
});

// GET /api/public/staff/verify-pin/:restaurantId/:pin
// Returns staff display name if PIN is valid for this restaurant
router.get('/staff/verify-pin/:restaurantId/:pin', async (req, res, next) => {
  try {
    const { restaurantId, pin } = req.params;
    if (!UUID_RE.test(restaurantId) || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    const staff = await authRepo.findUserByPin(restaurantId, pin);
    if (!staff) return res.status(404).json({ error: 'Staff not found' });
    res.json({ id: staff.id, name: staff.name || staff.email.split('@')[0] });
  } catch (err) { next(err); }
});

// POST /api/public/orders
// Body: { tableId, items: [{menuItemId, quantity, notes?}], staffPin? }
// Table UUID is the implicit authorization — only someone at the table can scan the QR
router.post('/orders', async (req, res, next) => {
  try {
    const { tableId, items, staffPin } = req.body;
    if (!tableId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'tableId and items are required' });
    }
    if (!UUID_RE.test(tableId)) return res.status(404).json({ error: 'Table not found' });

    const { rows } = await db.query(
      'SELECT id, restaurant_id FROM tables WHERE id = $1',
      [tableId],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Table not found' });

    const restaurantId = rows[0].restaurant_id;

    // Resolve staffPin → assignedStaffId (silently ignored if invalid)
    let assignedStaffId = null;
    if (staffPin && /^\d{4}$/.test(String(staffPin))) {
      const staff = await authRepo.findUserByPin(restaurantId, String(staffPin));
      if (staff) assignedStaffId = staff.id;
    }

    const order = await ordersService.createOrder({
      restaurantId,
      tableId,
      createdBy: null,
      assignedStaffId,
      items: items.map((i) => ({
        menuItemId: String(i.menuItemId),
        quantity: Math.max(1, parseInt(i.quantity) || 1),
        notes: i.notes ? String(i.notes).slice(0, 200) : null,
        customizations: i.customizations && typeof i.customizations === 'object' ? i.customizations : {},
      })),
      channel: 'dining',
    });

    res.status(201).json({ orderId: order.id });
  } catch (err) { next(err); }
});

// GET /api/public/orders/table/:tableId
// Returns active (non-paid, non-cancelled) orders for this table
router.get('/orders/table/:tableId', async (req, res, next) => {
  try {
    const { tableId } = req.params;
    if (!UUID_RE.test(tableId)) return res.status(404).json({ error: 'Table not found' });

    const { rows: tableRows } = await db.query(
      'SELECT id FROM tables WHERE id = $1',
      [tableId],
    );
    if (!tableRows[0]) return res.status(404).json({ error: 'Table not found' });

    const { rows } = await db.query(
      `SELECT o.id, o.status, o.created_at,
              COALESCE(
                json_agg(
                  json_build_object(
                    'name',     mi.name,
                    'quantity', oi.quantity,
                    'price',    mi.price,
                    'notes',    oi.notes
                  ) ORDER BY mi.name
                ) FILTER (WHERE oi.id IS NOT NULL),
                '[]'::json
              ) AS items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN menu_items  mi ON mi.id = oi.menu_item_id
       WHERE o.table_id = $1 AND o.status NOT IN ('paid', 'cancelled')
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [tableId],
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/public/orders/:orderId/cancel
// Cancels order if status is still 'received'; tableId in body acts as auth
router.post('/orders/:orderId/cancel', async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { tableId } = req.body;
    if (!UUID_RE.test(orderId) || !UUID_RE.test(tableId)) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const { rows } = await db.query(
      'SELECT id, status FROM orders WHERE id = $1 AND table_id = $2',
      [orderId, tableId],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Order not found' });
    if (rows[0].status !== 'received') {
      return res.status(409).json({ error: 'Cannot cancel — preparation has already started' });
    }

    await db.query("UPDATE orders SET status = 'cancelled' WHERE id = $1", [orderId]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /api/public/request-bill
// Customer requests the bill; broadcasts a WS notification to staff
router.post('/request-bill', async (req, res, next) => {
  try {
    const { tableId } = req.body;
    if (!tableId || !UUID_RE.test(tableId)) {
      return res.status(400).json({ error: 'tableId is required' });
    }

    const { rows } = await db.query(
      'SELECT t.id, t.number, t.restaurant_id FROM tables t WHERE t.id = $1',
      [tableId],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Table not found' });

    const { number: tableNumber, restaurant_id: restaurantId } = rows[0];
    ws.broadcast('BILL_REQUESTED', { tableId, tableNumber }, restaurantId);

    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
