const repo = require('./loyalty.repository');
const { NotFoundError, ValidationError } = require('../shared/errors');

async function lookupCustomer(restaurantId, phone) {
  return repo.findByPhone(restaurantId, phone);
}

async function getOrCreateCustomer(restaurantId, phone, name) {
  if (!phone) throw new ValidationError('phone is required');
  return repo.findOrCreate(restaurantId, phone.trim(), name);
}

async function listCustomers(restaurantId, query = {}) {
  return repo.list(restaurantId, query);
}

async function getCustomer(restaurantId, customerId) {
  const c = await repo.findById(restaurantId, customerId);
  if (!c) throw new NotFoundError('Customer');
  return c;
}

async function getTransactionHistory(restaurantId, customerId, query = {}) {
  const customer = await getCustomer(restaurantId, customerId);
  const transactions = await repo.getTransactions(restaurantId, customerId, query);
  return { customer, transactions };
}

async function adjustPoints(restaurantId, customerId, points, description) {
  const n = parseInt(points);
  if (isNaN(n) || n === 0) throw new ValidationError('points must be a non-zero integer');
  const customer = await getCustomer(restaurantId, customerId);
  if (customer.points_balance + n < 0) {
    throw new ValidationError(`Cannot deduct ${Math.abs(n)} pts — customer only has ${customer.points_balance}`);
  }
  return repo.addTransaction(restaurantId, {
    customerId,
    orderId: null,
    type: 'adjust',
    points: n,
    description: description || (n > 0 ? 'Manual adjustment (add)' : 'Manual adjustment (deduct)'),
  });
}

// Called after payment completes — fire-and-forget safe (caller wraps in .catch)
async function earnPoints(restaurantId, customerId, orderId, earnableAmount, settings) {
  const rate = parseFloat(settings.loyalty_points_per_unit || '0');
  if (rate <= 0) return;
  const points = Math.floor(earnableAmount * rate);
  if (points <= 0) return;
  await repo.addTransaction(restaurantId, {
    customerId, orderId, type: 'earn',
    points,
    description: `Earned from order`,
  });
}

// Called after payment completes to deduct redeemed points
async function deductPoints(restaurantId, customerId, orderId, pointsRedeemed) {
  if (pointsRedeemed <= 0) return;
  await repo.addTransaction(restaurantId, {
    customerId, orderId, type: 'redeem',
    points: -pointsRedeemed,
    description: 'Redeemed on order',
  });
}

// Called when cashier tries to apply redemption — validates without committing
function validateRedemption(customer, pointsToRedeem, orderSubtotal, settings) {
  const n = parseInt(pointsToRedeem);
  if (isNaN(n) || n <= 0) throw new ValidationError('pointsToRedeem must be a positive integer');
  if (n > customer.points_balance) {
    throw new ValidationError(`Customer only has ${customer.points_balance} points`);
  }
  const pointsValue = parseFloat(settings.loyalty_points_value || '0');
  if (pointsValue <= 0) throw new ValidationError('Loyalty redemption is not configured');
  const redemptionValue = parseFloat((n * pointsValue).toFixed(2));
  if (redemptionValue > orderSubtotal) {
    throw new ValidationError('Redemption value exceeds order total');
  }
  return { redemptionValue };
}

module.exports = {
  lookupCustomer, getOrCreateCustomer, listCustomers, getCustomer,
  getTransactionHistory, adjustPoints,
  earnPoints, deductPoints, validateRedemption,
};
