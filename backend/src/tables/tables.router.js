const router = require("express").Router();
const service = require("./tables.service");
const { authenticate, authorize } = require("../shared/middleware/auth");

router.get("/", authenticate, async (req, res, next) => {
  try {
    const tables = await service.getAll();
    res.json(tables);
  } catch (e) {
    next(e);
  }
});

router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const table = await service.getById(req.params.id);
    res.json(table);
  } catch (e) {
    next(e);
  }
});

router.post("/", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const table = await service.create(req.body);
    res.status(201).json(table);
  } catch (e) {
    next(e);
  }
});

router.patch("/:id/status", authenticate, async (req, res, next) => {
  try {
    const table = await service.updateStatus(req.params.id, req.body.status);
    res.json(table);
  } catch (e) {
    next(e);
  }
});

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
