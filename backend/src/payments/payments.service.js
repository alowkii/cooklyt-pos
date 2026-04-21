const repo = require('./payments.repository');
const ordersInterface = require('../orders/orders.interface');
const tablesInterface = require('../tables/tables.interface');
const settingsRepo = require('../settings/settings.repository');
const ws = require('../shared/websocket');
const { NotFoundError, ValidationError, AppError } = require('../shared/errors');

const VALID_METHODS = ['cash', 'card', 'mobile'];

// Pure function — no DB calls, easy to test
function computeBill(subtotal, taxRate, serviceChargeRate, discountType = null, discountValue = 0) {
  let discountAmount = 0;
  if (discountType === 'percent') {
    discountAmount = parseFloat((subtotal * (discountValue / 100)).toFixed(2));
  } else if (discountType === 'flat') {
    discountAmount = parseFloat(Math.min(discountValue, subtotal).toFixed(2));
  }

  const discountedSubtotal = parseFloat((subtotal - discountAmount).toFixed(2));
  const tax           = parseFloat((discountedSubtotal * taxRate).toFixed(2));
  const serviceCharge = parseFloat((discountedSubtotal * serviceChargeRate).toFixed(2));
  const total         = parseFloat((discountedSubtotal + tax + serviceCharge).toFixed(2));

  return {
    subtotal,
    discountType:         discountType || null,
    discountValue:        parseFloat(discountValue) || 0,
    discountAmount,
    taxRate,
    taxAmount:            tax,
    serviceChargeRate,
    serviceChargeAmount:  serviceCharge,
    total,
  };
}

async function getBill(orderId, restaurantId) {
  const order = await ordersInterface.getOrderById(orderId, restaurantId);
  if (!order) throw new NotFoundError('Order');

  const [subtotal, items, settings] = await Promise.all([
    ordersInterface.getOrderTotal(orderId, restaurantId),
    ordersInterface.getOrderItems(orderId, restaurantId),
    settingsRepo.getAll(restaurantId),
  ]);

  const taxRate           = parseFloat(settings.tax_rate      || '0') / 100;
  const serviceChargeRate = parseFloat(settings.service_charge || '0') / 100;
  const bill = computeBill(subtotal, taxRate, serviceChargeRate, order.discount_type, order.discount_value);

  return { ...bill, items };
}

async function processPayment(orderId, { method, amountTendered }, restaurantId) {
  if (!VALID_METHODS.includes(method)) {
    throw new ValidationError(`method must be one of: ${VALID_METHODS.join(', ')}`);
  }

  const order = await ordersInterface.getOrderById(orderId, restaurantId);
  if (!order) throw new NotFoundError('Order');
  if (order.status === 'paid') throw new AppError('Order is already paid', 400);

  const settings = await settingsRepo.getAll(restaurantId);
  const taxRate           = parseFloat(settings.tax_rate      || '0') / 100;
  const serviceChargeRate = parseFloat(settings.service_charge || '0') / 100;

  const subtotal = await ordersInterface.getOrderTotal(orderId, restaurantId);
  const { taxAmount, serviceChargeAmount, discountAmount, total } =
    computeBill(subtotal, taxRate, serviceChargeRate, order.discount_type, order.discount_value);

  if (amountTendered !== undefined && amountTendered < total) {
    throw new ValidationError(
      `Amount tendered (${amountTendered}) is less than total (${total})`,
    );
  }

  const payment = await repo.create({
    orderId,
    amount: total,
    method,
    subtotal,
    taxRate,
    taxAmount,
    serviceChargeRate,
    serviceChargeAmount,
    discountAmount,
    totalCharged: total,
  });

  // Simulate payment processing — swap in a real provider here
  const success = true;

  if (success) {
    await repo.updateStatus(payment.id, 'completed');
    await ordersInterface.markOrderPaid(orderId, restaurantId);
    if (order.table_id) {
      await tablesInterface.setTableStatus(order.table_id, 'available', restaurantId);
    }

    ws.broadcast('PAYMENT_COMPLETED', { orderId, paymentId: payment.id, total }, restaurantId);

    return {
      success: true,
      paymentId: payment.id,
      charged: total,
      method,
      change: amountTendered ? parseFloat((amountTendered - total).toFixed(2)) : 0,
    };
  } else {
    await repo.updateStatus(payment.id, 'failed');
    throw new AppError('Payment processing failed', 502);
  }
}

async function getPaymentsForOrder(orderId, restaurantId) {
  await ordersInterface.getOrderById(orderId, restaurantId);
  return repo.getByOrderId(orderId);
}

async function getReceipt(orderId, restaurantId) {
  const [receipt, settings] = await Promise.all([
    repo.getReceiptData(orderId, restaurantId),
    settingsRepo.getAll(restaurantId),
  ]);
  if (!receipt) throw new NotFoundError('Receipt not found — order may not be paid yet');
  return { ...receipt, timezone: settings.timezone || 'UTC' };
}

module.exports = { computeBill, getBill, processPayment, getPaymentsForOrder, getReceipt };
