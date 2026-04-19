const router = require("express").Router();
const service = require("./orders.service");
const { authenticate, authorize } = require("../shared/middleware/auth");

router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const order = await service.getById(req.params.id);
    res.json(order);
  } catch (e) {
    next(e);
  }
});

router.get("/table/:tableId", authenticate, async (req, res, next) => {
  try {
    const orders = await service.getActiveByTable(req.params.tableId);
    res.json(orders);
  } catch (e) {
    next(e);
  }
});

router.post("/", authenticate, authorize("admin", "staff"), async (req, res, next) => {
  try {
    const { tableId, items, channel, customerRef } = req.body;
    const order = await service.createOrder({
      tableId,
      createdBy: req.user.userId,
      items,
      channel:     channel     || 'dining',
      customerRef: customerRef || null,
    });
    res.status(201).json(order);
  } catch (e) {
    next(e);
  }
});

router.post("/:id/items", authenticate, async (req, res, next) => {
  try {
    const order = await service.addItems(req.params.id, req.body.items);
    res.json(order);
  } catch (e) {
    next(e);
  }
});

router.patch("/:id/status", authenticate, async (req, res, next) => {
  try {
    const order = await service.updateStatus(req.params.id, req.body.status);
    res.json(order);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
