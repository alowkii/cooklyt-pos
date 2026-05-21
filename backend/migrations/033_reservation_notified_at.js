exports.up = async (db) => {
  await db.query(`ALTER TABLE reservations ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ`);
};

exports.down = async (db) => {
  await db.query(`ALTER TABLE reservations DROP COLUMN IF EXISTS notified_at`);
};
