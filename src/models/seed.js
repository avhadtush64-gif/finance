/**
 * @module models/seed
 * @description Seeds default system categories. Run: node src/models/seed.js
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { DEFAULT_CATEGORIES } = require('../utils/constants');

async function seed() {
  console.log('🌱  Seeding default categories …');
  try {
    for (const cat of DEFAULT_CATEGORIES) {
      // Insert only if no system default with same name+type exists
      await db.query(
        `INSERT INTO categories (id, user_id, name, type, color, icon, is_system)
         VALUES ($1, NULL, $2, $3, $4, $5, true)
         ON CONFLICT DO NOTHING`,
        [uuidv4(), cat.name, cat.type, cat.color, cat.icon]
      );
    }
    console.log('✅  Default categories seeded.');
  } catch (err) {
    console.error('❌  Seeding failed:', err.message);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

seed();
