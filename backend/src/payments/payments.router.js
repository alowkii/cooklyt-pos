const router = require("express").Router();
const service = require("./payments.service");
const { authenticate } = require("../shared/middleware/auth");

router.post("/:orderId", authenticate, async (req, res, next) => {
  try {
    const result = await service.processPayment(req.params.orderId, req.body);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.get("/:orderId", authenticate, async (req, res, next) => {
  try {
    const payments = await service.getPaymentsForOrder(req.params.orderId);
    res.json(payments);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
