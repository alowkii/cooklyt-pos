const router = require("express").Router();
const service = require("./menu.service");
const { authenticate, authorize } = require("../shared/middleware/auth");

// Public — any authenticated user can view the menu
router.get("/", authenticate, async (req, res, next) => {
  try {
    const items = await service.getAll();
    res.json(items);
  } catch (e) {
    next(e);
  }
});

router.get("/available", authenticate, async (req, res, next) => {
  try {
    const items = await service.getAvailable();
    res.json(items);
  } catch (e) {
    next(e);
  }
});

router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const item = await service.getById(req.params.id);
    res.json(item);
  } catch (e) {
    next(e);
  }
});

// Admin only — write operations
router.post("/", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const item = await service.create(req.body);
    res.status(201).json(item);
  } catch (e) {
    next(e);
  }
});

router.patch(
  "/:id",
  authenticate,
  authorize("admin"),
  async (req, res, next) => {
    try {
      const item = await service.update(req.params.id, req.body);
      res.json(item);
    } catch (e) {
      next(e);
    }
  },
);

router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  async (req, res, next) => {
    try {
      await service.remove(req.params.id);
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  },
);

module.exports = router;
