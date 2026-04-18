const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { DEFAULT_CATEGORIES } = require('../utils/constants');

async function seed() {
  console.log('🌱  Seeding default categories …');
  for (const cat of DEFAULT_CATEGORIES) {
    await db.query(
      `INSERT INTO categories (id, user_id, name, type, color, icon, is_system)
       VALUES ($1, NULL, $2, $3, $4, $5, true)
       ON CONFLICT DO NOTHING`,
      [uuidv4(), cat.name, cat.type, cat.color, cat.icon]
    );
  }
  console.log('✅  Default categories seeded.');
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌  Seeding failed:', err.message);
      process.exit(1);
    });
}

module.exports = seed;