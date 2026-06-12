const router = require('express').Router();
const service = require('./ai.service');
const repo = require('./ai.repository');
const llm = require('./llm.client');
const { authenticate, authorize } = require('../shared/middleware/auth');

router.use(authenticate, authorize('admin', 'staff'));

// Liveness for the chat UI — lets the bubble hide itself when the model is down.
// `enabled: false` means the operator turned the assistant off for this
// restaurant (feature hidden), as opposed to `ok: false` (model unreachable).
router.get('/status', async (req, res, next) => {
  try {
    if (!(await repo.getAiEnabled(req.user.restaurantId))) {
      return res.json({ ok: false, enabled: false });
    }
    res.json({ enabled: true, ...(await llm.healthCheck()) });
  } catch (e) {
    next(e);
  }
});

// One chat turn, streamed as SSE:
//   data: {"type":"text","delta":"..."}
//   data: {"type":"confirm_required","tool":"...","args":{...},"summary":"..."}
//   data: {"type":"error","message":"..."}
//   data: {"type":"done"}
router.post('/chat', async (req, res, next) => {
  // Reject before headers are flushed so this travels as a normal JSON error
  try {
    if (!(await repo.getAiEnabled(req.user.restaurantId))) {
      return res.status(403).json({ error: 'The AI assistant is disabled for this restaurant' });
    }
  } catch (e) { return next(e); }

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-store',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // disable buffering in nginx-style reverse proxies
  });
  res.flushHeaders();

  let clientGone = false;
  req.on('close', () => { clientGone = true; });

  const send = (ev) => {
    if (!clientGone) res.write(`data: ${JSON.stringify(ev)}\n\n`);
  };

  try {
    const turn = service.streamChat({
      sessionId:    req.body.sessionId,
      restaurantId: req.user.restaurantId,
      userId:       req.user.userId,
      message:      req.body.message,
    });
    for await (const ev of turn) {
      if (clientGone) break;
      send(ev);
    }
  } catch (err) {
    // Headers are already sent — errors must travel inside the stream
    console.error('[ai/chat]', err);
    send({ type: 'error', message: err.statusCode ? err.message : 'AI service error' });
    send({ type: 'done' });
  }
  res.end();
});

// Execute or decline a write action previously offered via confirm_required
router.post('/confirm', async (req, res, next) => {
  try {
    if (!(await repo.getAiEnabled(req.user.restaurantId))) {
      return res.status(403).json({ error: 'The AI assistant is disabled for this restaurant' });
    }
    res.json(
      await service.confirmAction({
        sessionId:    req.body.sessionId,
        restaurantId: req.user.restaurantId,
        userId:       req.user.userId,
        tool:         req.body.tool,
        args:         req.body.args,
        confirmed:    req.body.confirmed === true,
        summary:      req.body.summary,
      }),
    );
  } catch (e) {
    next(e);
  }
});

module.exports = router;
