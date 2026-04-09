const repo = require("./reports.repository");
const { ValidationError } = require("../shared/errors");

function parseDate(dateStr) {
  if (!dateStr) throw new ValidationError("date is required (YYYY-MM-DD)");
  const d = new Date(dateStr);
  if (isNaN(d))
    throw new ValidationError("Invalid date format — use YYYY-MM-DD");
  return dateStr;
}

async function getDailySummary(dateStr) {
  const date = parseDate(dateStr);
  const [summary, byCategory, topItems, hourly] = await Promise.all([
    repo.getDailySummary(date),
    repo.getRevenueByCategory(date),
    repo.getTopItems(date),
    repo.getHourlySales(date),
  ]);
  return { date, summary, byCategory, topItems, hourly };
}

module.exports = { getDailySummary };
