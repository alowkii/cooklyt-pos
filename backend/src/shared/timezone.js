const { ValidationError } = require('./errors');

// Conservative IANA-ish identifier guard (letters, digits, / _ + -). Enough to
// keep the value safe to interpolate into `AT TIME ZONE $n` without allowing
// junk; Postgres still rejects an unknown zone name at query time.
const TZ_RE = /^[A-Za-z0-9/_+\-]+$/;

// Single source of truth for timezone validation (replaced 7 divergent copies).
// Strict by default: empty/null is invalid — use this where a blank tz must be
// rejected (e.g. saving the timezone setting). Pass a `fallback` to treat
// empty/null as that value — use for query filters that default to UTC.
function validateTimezone(tz, fallback) {
  if ((tz == null || tz === '') && fallback !== undefined) return fallback;
  if (typeof tz !== 'string' || !TZ_RE.test(tz)) {
    throw new ValidationError('Invalid timezone identifier');
  }
  return tz;
}

module.exports = { validateTimezone };
