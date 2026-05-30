const XLSX = require('xlsx');

function parseImport(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', raw: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: '' });
}

module.exports = parseImport;
