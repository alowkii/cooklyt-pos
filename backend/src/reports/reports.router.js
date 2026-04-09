const router = require("express").Router();
const service = require("./reports.service");
const { authenticate, authorize } = require("../shared/middleware/auth");

// Admin-only — financial data
router.get(
  "/daily",
  authenticate,
  authorize("admin"),
  async (req, res, next) => {
    try {
      // ?date=2024-01-15  (defaults to today)
      const date = req.query.date || new Date().toISOString().split("T")[0];
      const report = await service.getDailySummary(date);
      res.json(report);
    } catch (e) {
      next(e);
    }
  },
);

module.exports = router;
