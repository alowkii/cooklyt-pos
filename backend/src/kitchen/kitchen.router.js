const router = require("express").Router();
const service = require("./kitchen.service");
const { authenticate, authorize } = require("../shared/middleware/auth");

// Kitchen queue — all active orders needing preparation
router.get(
  "/queue",
  authenticate,
  authorize("admin", "kitchen", "staff"),
  async (req, res, next) => {
    try {
      const queue = await service.getKitchenQueue();
      res.json(queue);
    } catch (e) {
      next(e);
    }
  },
);

// Mark an order as being prepared
router.patch("/:orderId/preparing", authenticate, async (req, res, next) => {
  try {
    const order = await service.markOrderPreparing(req.params.orderId);
    res.json(order);
  } catch (e) {
    next(e);
  }
});

// Mark an order as ready for pickup/delivery
router.patch("/:orderId/ready", authenticate, async (req, res, next) => {
  try {
    const order = await service.markOrderReady(req.params.orderId);
    res.json(order);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
