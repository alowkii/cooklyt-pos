const db = require('./db');

// Strip control characters (including CR/LF) and cap length so attacker-controlled
// fields can't break log integrity or balloon the column.
function sanitize(value, max = 1000) {
  if (value == null) return value;
  return String(value)
    .replace(/[\x00-\x1F\x7F]/g, ' ')
    .slice(0, max);
}

/**
 * Fire-and-forget audit log writer.
 * Failures are logged to stderr but never propagate to the caller.
 */
function log({ restaurantId = null, actorType, actorId, action, resourceType, resourceId = null, description, meta = null }) {
  db.query(
    `INSERT INTO audit_logs
       (restaurant_id, actor_type, actor_id, action, resource_type, resource_id, description, meta)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      restaurantId || null,
      sanitize(actorType, 20),
      actorId,
      sanitize(action, 50),
      sanitize(resourceType, 50),
      sanitize(resourceId, 255),
      sanitize(description, 2000),
      meta ? JSON.stringify(meta) : null,
    ],
  ).catch((err) => console.error('[audit] write failed:', err.message));
}

module.exports = { log };
