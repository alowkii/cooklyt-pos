-- Staff assignment feature migration
-- Run once against your database before enabling the feature in Settings.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS staff_pin VARCHAR(6);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS assigned_staff_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Enforce uniqueness of PIN within a restaurant
CREATE UNIQUE INDEX IF NOT EXISTS users_staff_pin_restaurant_idx
  ON users (restaurant_id, staff_pin)
  WHERE staff_pin IS NOT NULL;
