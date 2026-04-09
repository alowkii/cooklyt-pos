const repo = require("./payments.repository");
const ordersInterface = require("../orders/orders.interface");
const tablesInterface = require("../tables/tables.interface");
const ws = require("../shared/websocket");
const {
  NotFoundError,
  ValidationError,
  AppError,
} = require("../shared/errors");

const VALID_METHODS = ["cash", "card", "mobile"];

async function processPayment(orderId, { method, amountTendered }) {
  if (!VALID_METHODS.includes(method)) {
    throw new ValidationError(
      `method must be one of: ${VALID_METHODS.join(", ")}`,
    );
  }

  const order = await ordersInterface.getOrderById(orderId);
  if (!order) throw new NotFoundError("Order");
  if (order.status === "paid") throw new AppError("Order is already paid", 400);

  const total = await ordersInterface.getOrderTotal(orderId);

  if (amountTendered !== undefined && amountTendered < total) {
    throw new ValidationError(
      `Amount tendered (${amountTendered}) is less than total (${total})`,
    );
  }

  // Create a pending payment record
  const payment = await repo.create({ orderId, amount: total, method });

  // Simulate payment processing — swap in a real provider here
  const success = true;

  if (success) {
    await repo.updateStatus(payment.id, "completed");
    await ordersInterface.markOrderPaid(orderId);
    await tablesInterface.setTableStatus(order.table_id, "available");

    ws.broadcast("PAYMENT_COMPLETED", {
      orderId,
      paymentId: payment.id,
      total,
    });

    return {
      success: true,
      paymentId: payment.id,
      charged: total,
      method,
      change: amountTendered
        ? parseFloat((amountTendered - total).toFixed(2))
        : 0,
    };
  } else {
    await repo.updateStatus(payment.id, "failed");
    throw new AppError("Payment processing failed", 502);
  }
}

async function getPaymentsForOrder(orderId) {
  return repo.getByOrderId(orderId);
}

module.exports = { processPayment, getPaymentsForOrder };
