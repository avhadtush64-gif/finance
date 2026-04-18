const db = require('../config/db');

const UP = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM ('income', 'expense');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE budget_period AS ENUM ('monthly', 'weekly', 'yearly');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           VARCHAR(255) NOT NULL,
  email          VARCHAR(255) UNIQUE NOT NULL,
  password_hash  VARCHAR(255),
  google_id      VARCHAR(255) UNIQUE,
  avatar_url     TEXT,
  preferred_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

CREATE TABLE IF NOT EXISTS categories (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  name      VARCHAR(100) NOT NULL,
  type      transaction_type NOT NULL,
  color     VARCHAR(7) DEFAULT '#BDC3C7',
  icon      VARCHAR(10) DEFAULT '📁',
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories (user_id);

CREATE TABLE IF NOT EXISTS transactions (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id          UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  type                 transaction_type NOT NULL,
  amount               NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  currency             VARCHAR(3) NOT NULL,
  amount_in_preferred  NUMERIC(15,2) NOT NULL,
  exchange_rate        NUMERIC(10,6) NOT NULL DEFAULT 1,
  description          TEXT NOT NULL DEFAULT '',
  date                 DATE NOT NULL,
  receipt_url          TEXT,
  is_refund            BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_txn_user     ON transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_txn_date     ON transactions (user_id, date);
CREATE INDEX IF NOT EXISTS idx_txn_category ON transactions (user_id, category_id);
CREATE INDEX IF NOT EXISTS idx_txn_type     ON transactions (user_id, type);

CREATE TABLE IF NOT EXISTS budgets (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id       UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  amount            NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  currency          VARCHAR(3) NOT NULL DEFAULT 'USD',
  period            budget_period NOT NULL DEFAULT 'monthly',
  start_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date          DATE,
  notify_at_percent INTEGER NOT NULL DEFAULT 80,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets (user_id);

CREATE TABLE IF NOT EXISTS income_sources (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_income_src_user ON income_sources (user_id);

CREATE TABLE IF NOT EXISTS notifications_log (
  id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type     VARCHAR(50) NOT NULL,
  message  TEXT NOT NULL,
  sent_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications_log (user_id);
`;

// ✅ Export as function (no pool.end!)
async function migrate() {
  console.log('🔄  Running migrations …');
  await db.query(UP);
  console.log('✅  All tables created successfully.');
}

// ✅ Allow running directly too: node src/models/migrate.js
if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌  Migration failed:', err.message);
      process.exit(1);
    });
}

module.exports = migrate;