const repo = require('./payments.repository');
const ordersInterface = require('../orders/orders.interface');
const tablesInterface = require('../tables/tables.interface');
const settingsRepo = require('../settings/settings.repository');
const ws = require('../shared/websocket');
const { NotFoundError, ValidationError, AppError } = require('../shared/errors');

const VALID_METHODS = ['cash', 'card', 'mobile'];

function computeBill(subtotal, taxRate, serviceChargeRate, discountType = null, discountValue = 0, packagingFee = 0) {
  let discountAmount = 0;
  if (discountType === 'percent') {
    discountAmount = parseFloat((subtotal * (discountValue / 100)).toFixed(2));
  } else if (discountType === 'flat') {
    discountAmount = parseFloat(Math.min(discountValue, subtotal).toFixed(2));
  }

  const discountedSubtotal = parseFloat((subtotal - discountAmount).toFixed(2));
  const tax           = parseFloat((discountedSubtotal * taxRate).toFixed(2));
  const serviceCharge = parseFloat((discountedSubtotal * serviceChargeRate).toFixed(2));
  const fee           = parseFloat((packagingFee || 0).toFixed(2));
  const total         = parseFloat((discountedSubtotal + tax + serviceCharge + fee).toFixed(2));

  return {
    subtotal,
    discountType:         discountType || null,
    discountValue:        parseFloat(discountValue) || 0,
    discountAmount,
    taxRate,
    taxAmount:            tax,
    serviceChargeRate,
    serviceChargeAmount:  serviceCharge,
    packagingFee:         fee,
    total,
  };
}

// Returns bill for the full order, or for specific order_item IDs (split preview)
async function getBill(orderId, restaurantId, orderItemIds = null) {
  const order = await ordersInterface.getOrderById(orderId, restaurantId);
  if (!order) throw new NotFoundError('Order');

  const [allItems, settings] = await Promise.all([
    ordersInterface.getOrderItems(orderId, restaurantId),
    settingsRepo.getAll(restaurantId),
  ]);

  const taxRate           = parseFloat(settings.tax_rate      || '0') / 100;
  const serviceChargeRate = parseFloat(settings.service_charge || '0') / 100;
  const packagingFeeTotal = order.channel !== 'dining'
    ? parseFloat(settings.packaging_fee || '0')
    : 0;

  if (orderItemIds && orderItemIds.length > 0) {
    const items = allItems.filter((i) => orderItemIds.includes(i.id));
    const subtotal      = parseFloat(items.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2));
    const totalSubtotal = parseFloat(allItems.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2));

    // Prorate flat discount and packaging fee by proportion of subtotal
    let { discount_type: discountType, discount_value: discountValue } = order;
    discountValue = parseFloat(discountValue || 0);
    if (discountType === 'flat' && totalSubtotal > 0) {
      discountValue = parseFloat((discountValue * subtotal / totalSubtotal).toFixed(2));
    }
    const packagingFee = totalSubtotal > 0
      ? parseFloat((packagingFeeTotal * subtotal / totalSubtotal).toFixed(2))
      : 0;

    const bill = computeBill(subtotal, taxRate, serviceChargeRate, discountType, discountValue, packagingFee);
    return { ...bill, items };
  }

  const subtotal = await ordersInterface.getOrderTotal(orderId, restaurantId);
  const bill = computeBill(subtotal, taxRate, serviceChargeRate, order.discount_type, order.discount_value, packagingFeeTotal);
  return { ...bill, items: allItems };
}

async function processPayment(orderId, { method, tenders: tendersInput, amountTendered }, restaurantId) {
  let effectiveMethod;
  let effectiveTenders = null;

  if (tendersInput && tendersInput.length > 0) {
    for (const t of tendersInput) {
      if (!VALID_METHODS.includes(t.method)) {
        throw new ValidationError(`method must be one of: ${VALID_METHODS.join(', ')}`);
      }
    }
    effectiveMethod  = tendersInput.map((t) => t.method).join('+');
    effectiveTenders = tendersInput;
  } else {
    if (!VALID_METHODS.includes(method)) {
      throw new ValidationError(`method must be one of: ${VALID_METHODS.join(', ')}`);
    }
    effectiveMethod = method;
  }

  const order = await ordersInterface.getOrderById(orderId, restaurantId);
  if (!order) throw new NotFoundError('Order');
  if (order.status === 'paid') throw new AppError('Order is already paid', 400);

  const settings          = await settingsRepo.getAll(restaurantId);
  const taxRate           = parseFloat(settings.tax_rate      || '0') / 100;
  const serviceChargeRate = parseFloat(settings.service_charge || '0') / 100;
  const packagingFee      = order.channel !== 'dining'
    ? parseFloat(settings.packaging_fee || '0')
    : 0;
  const subtotal          = await ordersInterface.getOrderTotal(orderId, restaurantId);

  const { taxAmount, serviceChargeAmount, discountAmount, total } =
    computeBill(subtotal, taxRate, serviceChargeRate, order.discount_type, order.discount_value, packagingFee);

  if (effectiveTenders) {
    const sum = parseFloat(effectiveTenders.reduce((s, t) => s + t.amount, 0).toFixed(2));
    if (Math.abs(sum - total) > 0.02) {
      throw new ValidationError(`Tenders sum (${sum}) must equal total (${total})`);
    }
  } else if (amountTendered !== undefined && amountTendered < total) {
    throw new ValidationError(`Amount tendered (${amountTendered}) is less than total (${total})`);
  }

  const payment = await repo.create({
    orderId, amount: total, method: effectiveMethod,
    subtotal, taxRate, taxAmount,
    serviceChargeRate, serviceChargeAmount,
    discountAmount, packagingFee, totalCharged: total,
    tenders: effectiveTenders,
  });

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
    method: effectiveMethod,
    change: (!effectiveTenders && amountTendered)
      ? parseFloat((amountTendered - total).toFixed(2))
      : 0,
  };
}

// Split bill by items — each split has its own tender(s); order marked paid atomically.
// Each split.items entry is { orderItemId, quantity } — quantities may be partial
// (e.g. 2 of 5 burgers on one split, 3 on the other).
async function processSplitPayment(orderId, { splits }, restaurantId) {
  if (!Array.isArray(splits) || splits.length < 2) {
    throw new ValidationError('Split payment requires at least 2 splits');
  }

  const order = await ordersInterface.getOrderById(orderId, restaurantId);
  if (!order) throw new NotFoundError('Order');
  if (order.status === 'paid') throw new AppError('Order is already paid', 400);

  const [allItems, settings] = await Promise.all([
    ordersInterface.getOrderItems(orderId, restaurantId),
    settingsRepo.getAll(restaurantId),
  ]);

  const taxRate           = parseFloat(settings.tax_rate      || '0') / 100;
  const serviceChargeRate = parseFloat(settings.service_charge || '0') / 100;
  const packagingFeeTotal = order.channel !== 'dining'
    ? parseFloat(settings.packaging_fee || '0')
    : 0;
  const totalSubtotal     = parseFloat(allItems.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2));

  // Validate that quantities for each item sum to the full ordered quantity
  const itemMap = new Map(allItems.map((i) => [i.id, i]));
  for (const [id, fullItem] of itemMap) {
    const assigned = splits.reduce((sum, split) => {
      const si = (split.items || []).find((i) => i.orderItemId === id);
      return sum + (si ? Math.max(0, parseInt(si.quantity) || 0) : 0);
    }, 0);
    if (assigned !== parseInt(fullItem.quantity)) {
      throw new ValidationError(
        `Quantities for "${fullItem.name}" don't add up (assigned ${assigned}, ordered ${fullItem.quantity})`,
      );
    }
  }

  const payments = [];

  for (const split of splits) {
    const { items: splitItemDefs, tenders } = split;
    if (!splitItemDefs?.length) throw new ValidationError('Each split must have at least one item');
    if (!tenders?.length)       throw new ValidationError('Each split must have at least one tender');

    for (const t of tenders) {
      if (!VALID_METHODS.includes(t.method)) {
        throw new ValidationError(`method must be one of: ${VALID_METHODS.join(', ')}`);
      }
    }

    // Build split items with the partial (or full) quantities requested
    const splitItems = splitItemDefs
      .map(({ orderItemId, quantity }) => {
        const full = itemMap.get(orderItemId);
        if (!full) throw new ValidationError(`Item ${orderItemId} not found in order`);
        return { ...full, quantity: parseInt(quantity) };
      })
      .filter((i) => i.quantity > 0);

    const splitSubtotal = parseFloat(splitItems.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2));

    // Prorate flat discount proportionally; percent applies naturally
    let discountType  = order.discount_type;
    let discountValue = parseFloat(order.discount_value || 0);
    if (discountType === 'flat' && totalSubtotal > 0) {
      discountValue = parseFloat((discountValue * splitSubtotal / totalSubtotal).toFixed(2));
    }

    // Prorate packaging fee by proportion of this split's subtotal
    const packagingFee = totalSubtotal > 0
      ? parseFloat((packagingFeeTotal * splitSubtotal / totalSubtotal).toFixed(2))
      : 0;

    const { taxAmount, serviceChargeAmount, discountAmount, total } =
      computeBill(splitSubtotal, taxRate, serviceChargeRate, discountType, discountValue, packagingFee);

    const tendersSum = parseFloat(tenders.reduce((s, t) => s + t.amount, 0).toFixed(2));
    if (Math.abs(tendersSum - total) > 0.02) {
      throw new ValidationError(`Split tenders sum (${tendersSum}) must equal split total (${total})`);
    }

    const method = tenders.length === 1
      ? tenders[0].method
      : tenders.map((t) => t.method).join('+');

    const payment = await repo.create({
      orderId, amount: total, method,
      subtotal: splitSubtotal, taxRate, taxAmount,
      serviceChargeRate, serviceChargeAmount,
      discountAmount, packagingFee, totalCharged: total,
      tenders: tenders.length > 1 ? tenders : null,
    });
    await repo.updateStatus(payment.id, 'completed');
    payments.push({ paymentId: payment.id, charged: total, method });
  }

  await ordersInterface.markOrderPaid(orderId, restaurantId);
  if (order.table_id) {
    await tablesInterface.setTableStatus(order.table_id, 'available', restaurantId);
  }

  const totalCharged = parseFloat(payments.reduce((s, p) => s + p.charged, 0).toFixed(2));
  ws.broadcast('PAYMENT_COMPLETED', { orderId, total: totalCharged }, restaurantId);

  return { success: true, splits: payments, totalCharged };
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

module.exports = { computeBill, getBill, processPayment, processSplitPayment, getPaymentsForOrder, getReceipt };
