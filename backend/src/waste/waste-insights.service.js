const repo = require('./waste-insights.repository');
const settingsRepo = require('../settings/settings.repository');
const weather = require('../shared/weather.client');
const llm = require('../ai/llm.client');

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PERIOD_DAYS = 28;

// ── date helpers (date-string math, tz-aware "today") ────────────────────────
function todayInTz(tz) {
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date()); }
  catch { return new Date().toISOString().slice(0, 10); }
}
function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function enumerateDays(from, to) {
  const out = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}
function weekdayOf(dateStr) { return new Date(`${dateStr}T00:00:00Z`).getUTCDay(); }

// ── pure stats ───────────────────────────────────────────────────────────────
function pearson(xs, ys) {
  const n = xs.length;
  if (n < 3) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) { const a = xs[i] - mx, b = ys[i] - my; num += a * b; dx += a * a; dy += b * b; }
  if (dx === 0 || dy === 0) return null;
  return Math.round((num / Math.sqrt(dx * dy)) * 100) / 100;
}

function parseLlmJson(text) {
  if (!text) return null;
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// ── correlation assembly (pure, given raw rows) ──────────────────────────────
function buildCorrelations({ from, to, dailyWaste, weatherDays, topItems, reasons }) {
  const costByDay = Object.fromEntries(dailyWaste.map((r) => [r.day, parseFloat(r.cost) || 0]));
  const days = enumerateDays(from, to);
  const series = days.map((d) => ({ day: d, cost: costByDay[d] || 0 }));

  // weekday averages
  const byDow = DOW.map((_, i) => ({ sum: 0, n: 0 }));
  for (const s of series) { const w = weekdayOf(s.day); byDow[w].sum += s.cost; byDow[w].n += 1; }
  const weekday = byDow.map((b, i) => ({ weekday: DOW[i], avg_cost: round2(b.n ? b.sum / b.n : 0), days: b.n }));

  // weather correlation (only over days present in both)
  let rainfall_r = null, temp_r = null;
  if (Array.isArray(weatherDays) && weatherDays.length) {
    const wByDay = Object.fromEntries(weatherDays.map((w) => [w.date, w]));
    const rain = [], temp = [], costR = [], costT = [];
    for (const s of series) {
      const w = wByDay[s.day];
      if (!w) continue;
      if (w.rain != null) { rain.push(w.rain); costR.push(s.cost); }
      if (w.temp != null) { temp.push(w.temp); costT.push(s.cost); }
    }
    rainfall_r = pearson(rain, costR);
    temp_r = pearson(temp, costT);
  }

  return {
    rainfall_r,
    temp_r,
    weekday,
    top_items: topItems.map((t) => ({ ingredient: t.ingredient, unit: t.unit, quantity: round2(parseFloat(t.quantity)), cost: round2(parseFloat(t.cost)), events: t.events })),
    reasons: reasons.map((r) => ({ reason: r.reason, events: r.events, cost: round2(parseFloat(r.cost)) })),
    total_cost: round2(series.reduce((s, x) => s + x.cost, 0)),
  };
}

// ── deterministic fallback narration (used if the LLM is unavailable) ─────────
function fallbackNarration(scores, hasWeather) {
  const worst = [...scores.weekday].sort((a, b) => b.avg_cost - a.avg_cost)[0];
  const top = scores.top_items[0];
  const parts = [`Total waste over the last ${PERIOD_DAYS} days was ${scores.total_cost}.`];
  if (top) parts.push(`The biggest contributor is ${top.ingredient} (${top.cost}, ${top.events} event${top.events !== 1 ? 's' : ''}).`);
  if (worst && worst.avg_cost > 0) parts.push(`${worst.weekday} has the highest average daily waste (${worst.avg_cost}).`);
  if (hasWeather && scores.rainfall_r != null) {
    const dir = scores.rainfall_r > 0.3 ? 'rises with rainfall' : scores.rainfall_r < -0.3 ? 'falls with rainfall' : 'shows little link to rainfall';
    parts.push(`Waste ${dir} (r=${scores.rainfall_r}).`);
  }
  const recommendations = scores.top_items.slice(0, 3).map((t) => ({
    ingredient: t.ingredient,
    action: 'Review prep quantities and portioning for this item',
    quantified_impact: t.cost,
  }));
  return { analysis: parts.join(' '), recommendations };
}

// ── LLM narration (resilient) ────────────────────────────────────────────────
async function narrate(scores, currency, hasWeather) {
  const sys = 'You are a restaurant waste analyst. Given the stats, write a concise 2–3 sentence plain-English analysis and up to 3 concrete recommendations. '
    + 'Respond ONLY as JSON: {"analysis":"...","recommendations":[{"ingredient":"...","action":"...","quantified_impact":<number>}]}. No prose outside the JSON.';
  const user = `Currency: ${currency || 'local'}. Stats:\n${JSON.stringify(scores)}`;

  // Narration is non-critical (deterministic fallback exists), so don't block
  // Generate when the model is down: probe quickly first, then skip straight to
  // the fallback if it's unreachable. A single attempt covers the healthy case.
  if (!(await llm.reachable(1500))) return fallbackNarration(scores, hasWeather);

  try {
    const { content } = await llm.chat(
      [{ role: 'system', content: sys }, { role: 'user', content: user }],
      { temperature: 0.3, maxTokens: 400, retries: 1 },
    );
    const parsed = parseLlmJson(content);
    if (parsed && parsed.analysis) {
      const recs = Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 3).map((r) => ({
        ingredient: String(r.ingredient ?? '').slice(0, 120),
        action: String(r.action ?? '').slice(0, 300),
        quantified_impact: r.quantified_impact != null ? Number(r.quantified_impact) : null,
      })) : fallbackNarration(scores, hasWeather).recommendations;
      return { analysis: String(parsed.analysis).slice(0, 2000), recommendations: recs };
    }
  } catch (err) {
    console.error('[waste-insights] LLM narration failed:', err.message);
  }
  return fallbackNarration(scores, hasWeather);
}

// ── public ───────────────────────────────────────────────────────────────────
async function generate(restaurantId, generatedBy = 'cron') {
  const settings = await settingsRepo.getAll(restaurantId).catch(() => ({}));
  const tz = settings.timezone || 'UTC';
  const to = todayInTz(tz);
  const from = addDays(to, -(PERIOD_DAYS - 1));

  const [dailyWaste, topItems, reasons] = await Promise.all([
    repo.getDailyWasteSeries(restaurantId, from, to, tz),
    repo.getTopItems(restaurantId, from, to, tz, 8),
    repo.getReasonBreakdown(restaurantId, from, to, tz),
  ]);

  if (!dailyWaste.length) {
    const saved = await repo.saveInsight({
      restaurantId, periodStart: from, periodEnd: to,
      weatherData: null, correlationScores: { total_cost: 0, weekday: [], top_items: [], reasons: [] },
      analysis: `No waste was logged in the last ${PERIOD_DAYS} days — nothing to analyse yet.`,
      recommendations: [], generatedBy,
    });
    return shape(saved);
  }

  let weatherDays = null;
  if (settings.latitude && settings.longitude) {
    weatherDays = await weather.getDailyWeather({
      latitude: settings.latitude, longitude: settings.longitude, from, to, timezone: tz,
    });
  }

  const scores = buildCorrelations({ from, to, dailyWaste, weatherDays, topItems, reasons });
  const { analysis, recommendations } = await narrate(scores, settings.currency, !!weatherDays);

  const saved = await repo.saveInsight({
    restaurantId, periodStart: from, periodEnd: to,
    weatherData: weatherDays, correlationScores: scores,
    analysis, recommendations, generatedBy,
  });
  return shape(saved);
}

async function getLatest(restaurantId) {
  const row = await repo.getLatestInsight(restaurantId);
  return row ? shape(row) : null;
}

// pg returns jsonb as objects already; just normalise the envelope
function shape(row) {
  return {
    id: row.id,
    period_start: row.period_start,
    period_end: row.period_end,
    weather_available: !!row.weather_data,
    correlation_scores: row.correlation_scores || null,
    analysis: row.analysis,
    recommendations: row.recommendations || [],
    generated_by: row.generated_by,
    created_at: row.created_at,
  };
}

module.exports = { generate, getLatest, buildCorrelations, pearson };
