exports.up = async (db) => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS reservations (
      id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      restaurant_id UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
      table_id      UUID        REFERENCES tables(id) ON DELETE SET NULL,
      guest_name    TEXT        NOT NULL,
      guest_phone   TEXT,
      party_size    INTEGER,
      reserved_at   TIMESTAMPTZ NOT NULL,
      notes         TEXT,
      status        VARCHAR(20) NOT NULL DEFAULT 'upcoming',
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_reservations_restaurant_date
    ON reservations(restaurant_id, reserved_at)
  `);
};

exports.down = async (db) => {
  await db.query('DROP TABLE IF EXISTS reservations');
};
