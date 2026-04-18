const app = require('./app');
const config = require('./config/env');
const db = require('./config/db');

async function start() {
  // Verify DB connection
  try {
    await db.query('SELECT NOW()');
    console.log('✅  Connected to PostgreSQL');
  } catch (err) {
    console.error('❌  Cannot connect to PostgreSQL:', err.message);
    process.exit(1);
  }

  // ✅ Auto-run migrations
  try {
    const migrate = require('./models/migrate');
    await migrate();
  } catch (err) {
    console.error('❌  Migration error:', err.message);
    process.exit(1);
  }

  // ✅ Auto-run seed
  try {
    const seed = require('./models/seed');
    await seed();
  } catch (err) {
    console.error('❌  Seed error:', err.message);
  }

  app.listen(config.port, () => {
    console.log(`🚀  Server running on http://localhost:${config.port}`);
    console.log(`   Environment: ${config.nodeEnv}`);
  });
}

start();