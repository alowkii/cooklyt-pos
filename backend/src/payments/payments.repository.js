const db = require('../shared/db');

const getById = (id) =>
  db.query('SELECT * FROM payments WHERE id = $1', [id]).then((r) => r.rows[0]);

const getByOrderId = (orderId) =>
  db.query('SELECT * FROM payments WHERE order_id = $1', [orderId]).then((r) => r.rows);

const create = ({
  orderId, amount, method,
  subtotal, taxRate, taxAmount,
  serviceChargeRate, serviceChargeAmount,
  discountAmount, totalCharged,
}) =>
  db.query(
    `INSERT INTO payments
       (order_id, amount, method, status,
        subtotal, tax_rate, tax_amount,
        service_charge_rate, service_charge_amount,
        discount_amount, total_charged)
     VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      orderId, amount, method,
      subtotal, taxRate, taxAmount,
      serviceChargeRate, serviceChargeAmount,
      discountAmount ?? 0, totalCharged ?? amount,
    ],
  ).then((r) => r.rows[0]);

const updateStatus = (id, status) =>
  db.query('UPDATE payments SET status = $1 WHERE id = $2 RETURNING *', [status, id])
    .then((r) => r.rows[0]);

const getReceiptData = (orderId, restaurantId) =>
  db.query(
    `SELECT
       r.name              AS restaurant_name,
       o.id                AS order_id,
       o.channel,
       o.customer_ref,
       o.created_at,
       o.discount_type,
       o.discount_value,
       t.number            AS table_number,
       p.method            AS payment_method,
       p.total_charged,
       p.subtotal,
       p.tax_rate,
       p.tax_amount,
       p.service_charge_rate,
       p.service_charge_amount,
       p.discount_amount,
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
     JOIN restaurants    r  ON r.id  = o.restaurant_id
     LEFT JOIN tables    t  ON t.id  = o.table_id
     JOIN payments       p  ON p.order_id = o.id AND p.status = 'completed'
     LEFT JOIN order_items oi ON oi.order_id = o.id
     LEFT JOIN menu_items  mi ON mi.id = oi.menu_item_id
     WHERE o.id = $1 AND o.restaurant_id = $2
     GROUP BY r.name, o.id, o.channel, o.customer_ref, o.created_at,
              o.discount_type, o.discount_value, t.number,
              p.method, p.total_charged, p.subtotal,
              p.tax_rate, p.tax_amount,
              p.service_charge_rate, p.service_charge_amount,
              p.discount_amount`,
    [orderId, restaurantId],
  ).then((r) => r.rows[0] || null);

module.exports = { getById, getByOrderId, create, updateStatus, getReceiptData };
