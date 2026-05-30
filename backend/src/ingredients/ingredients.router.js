const router = require('express').Router();
const service = require('./ingredients.service');
const { authenticate, authorize } = require('../shared/middleware/auth');
const upload      = require('../shared/middleware/upload');
const parseImport = require('../shared/parseImport');

router.use(authenticate, authorize('admin'));

router.post('/import', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const rows = parseImport(req.file.buffer);
    const results = { imported: 0, errors: [] };
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const name = String(row.name || '').trim();
        const unit = String(row.unit || '').trim();
        if (!name) throw new Error('name is required');
        if (!unit) throw new Error('unit is required');
        await service.create({
          name,
          unit,
          latestUnitCost: parseFloat(row.latest_unit_cost || 0) || 0,
          reorderLevel:   parseFloat(row.reorder_level    || 0) || 0,
          reorderQty:     parseFloat(row.reorder_qty      || 0) || 0,
        }, req.user.restaurantId);
        results.imported++;
      } catch (e) {
        results.errors.push({ row: i + 2, reason: e.message });
      }
    }
    res.json(results);
  } catch (e) { next(e); }
});

router.get('/', async (req, res, next) => {
  try {
    res.json(await service.getAll(req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.get('/low-stock', async (req, res, next) => {
  try {
    res.json(await service.getLowStock(req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.post('/', async (req, res, next) => {
  try {
    res.status(201).json(await service.create(req.body, req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    res.json(await service.update(req.params.id, req.body, req.user.restaurantId));
  } catch (e) {
    next(e);
  }
});

router.post('/:id/purchase', async (req, res, next) => {
  try {
    res.json(
      await service.recordPurchase(
        req.params.id,
        { ...req.body, performedBy: req.user.userId },
        req.user.restaurantId,
      ),
    );
  } catch (e) {
    next(e);
  }
});

module.exports = router;
