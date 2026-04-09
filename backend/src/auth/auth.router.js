const router = require("express").Router();
const service = require("./auth.service");
const { authenticate, authorize } = require("../shared/middleware/auth");

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await service.login(email, password);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

// Admin-only: register new staff/admin accounts
router.post(
  "/register",
  authenticate,
  authorize("admin"),
  async (req, res, next) => {
    try {
      const { email, password, role } = req.body;
      const user = await service.register(email, password, role);
      res.status(201).json(user);
    } catch (e) {
      next(e);
    }
  },
);

// Get current user profile
router.get("/me", authenticate, async (req, res, next) => {
  try {
    const user = await service.me(req.user.userId);
    res.json(user);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
