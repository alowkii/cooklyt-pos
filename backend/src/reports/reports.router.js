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
      // ?date=2024-01-15&tz=Asia/Kolkata  (both optional)
      const date = req.query.date || new Date().toISOString().split("T")[0];
      const tz   = req.query.tz   || "UTC";
      const report = await service.getDailySummary(date, tz);
      res.json(report);
    } catch (e) {
      next(e);
    }
  },
);

module.exports = router;
