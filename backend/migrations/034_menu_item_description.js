async function up(pool) {
  await pool.query(`
    ALTER TABLE menu_items
      ADD COLUMN IF NOT EXISTS description TEXT
  `);
}

async function down(pool) {
  await pool.query(`ALTER TABLE menu_items DROP COLUMN IF EXISTS description`);
}

module.exports = { up, down };
