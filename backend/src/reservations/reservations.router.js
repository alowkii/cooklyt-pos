const router  = require('express').Router();
const service = require('./reservations.service');
const { authenticate, authorize } = require('../shared/middleware/auth');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { date, status } = req.query;
    res.json(await service.getAll(req.user.restaurantId, { date, status }));
  } catch (e) { next(e); }
});

router.post('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { tableId, guestName, guestPhone, partySize, reservedAt, notes } = req.body;
    const r = await service.create(req.user.restaurantId, { tableId, guestName, guestPhone, partySize, reservedAt, notes });
    res.status(201).json(r);
  } catch (e) { next(e); }
});

router.patch('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { guestName, guestPhone, partySize, reservedAt, notes, tableId } = req.body;
    res.json(await service.update(req.params.id, req.user.restaurantId, { guestName, guestPhone, partySize, reservedAt, notes, tableId }));
  } catch (e) { next(e); }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    await service.remove(req.params.id, req.user.restaurantId);
    res.status(204).send();
  } catch (e) { next(e); }
});

router.post('/:id/seat', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    res.json(await service.seat(req.params.id, req.user.restaurantId));
  } catch (e) { next(e); }
});

router.post('/:id/cancel', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    res.json(await service.cancel(req.params.id, req.user.restaurantId));
  } catch (e) { next(e); }
});

router.post('/:id/no-show', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    res.json(await service.noShow(req.params.id, req.user.restaurantId));
  } catch (e) { next(e); }
});

module.exports = router;
