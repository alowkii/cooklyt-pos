// Run once on the server to generate logo-email.png from logo-email.svg
// Usage: node scripts/generate-email-logo.js
const path = require('path');
const fs   = require('fs');

const svgPath = path.resolve(__dirname, '../dashboard/public/logo-email.svg');
const pngPath = path.resolve(__dirname, '../dashboard/public/logo-email.png');

async function run() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error('sharp not found — run: npm install sharp');
    process.exit(1);
  }

  const svg = fs.readFileSync(svgPath);
  await sharp(svg)
    .resize(440)   // 2x for retina, displayed at 220px in email
    .png()
    .toFile(pngPath);

  console.log('✓ Written:', pngPath);
}

run().catch((err) => { console.error(err); process.exit(1); });
