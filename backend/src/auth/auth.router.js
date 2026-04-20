const router = require('express').Router();
const service = require('./auth.service');
const { authenticate, authorize } = require('../shared/middleware/auth');

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await service.login(email, password);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

// Admin-only: register new staff/admin accounts within the same restaurant
router.post('/register', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { email, password, role } = req.body;
    const user = await service.register(email, password, role, req.user.restaurantId);
    res.status(201).json(user);
  } catch (e) {
    next(e);
  }
});

// Get current user profile
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await service.me(req.user.userId);
    res.json(user);
  } catch (e) {
    next(e);
  }
});

// Admin-only: list all users in this restaurant
router.get('/users', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const users = await service.getAllUsers(req.user.restaurantId);
    res.json(users);
  } catch (e) {
    next(e);
  }
});

// Admin-only: delete a user (must belong to same restaurant)
router.delete('/users/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    await service.deleteUser(req.params.id, req.user.userId, req.user.restaurantId);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

// Change own password (any authenticated user)
router.post('/change-password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await service.changePassword(req.user.userId, currentPassword, newPassword);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

// Admin-only: change a user's role (must belong to same restaurant)
router.patch('/users/:id/role', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const user = await service.updateUserRole(
      req.params.id,
      req.body.role,
      req.user.userId,
      req.user.restaurantId,
    );
    res.json(user);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
