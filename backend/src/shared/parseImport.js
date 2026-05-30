const XLSX = require('xlsx');

// Strip leading formula-injection characters so values like =cmd|..., +cmd, -cmd, @SUM
// can't execute if the data is ever exported back to a spreadsheet.
const FORMULA_PREFIX_RE = /^[=+\-@\t\r]+/;
function sanitizeCell(v) {
  if (typeof v === 'string') return v.replace(FORMULA_PREFIX_RE, '');
  return v;
}

function parseImport(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', raw: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  return rows.map((row) => {
    const clean = {};
    for (const key of Object.keys(row)) clean[key] = sanitizeCell(row[key]);
    return clean;
  });
}

module.exports = parseImport;
