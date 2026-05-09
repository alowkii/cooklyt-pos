// Tiny in-memory fixed-window rate limiter — no external dependency.
// For production with multiple instances, swap in a Redis-backed limiter.
function rateLimit({ windowMs, max, key = (req) => req.ip, message = 'Too many requests' }) {
  const buckets = new Map();

  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of buckets) if (v.reset <= now) buckets.delete(k);
  }, Math.max(windowMs, 30_000)).unref();

  return (req, res, next) => {
    const k = key(req);
    if (!k) return next();
    const now = Date.now();
    let entry = buckets.get(k);
    if (!entry || entry.reset <= now) {
      entry = { count: 0, reset: now + windowMs };
      buckets.set(k, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set('Retry-After', Math.ceil((entry.reset - now) / 1000));
      return res.status(429).json({ error: message });
    }
    next();
  };
}

module.exports = { rateLimit };
