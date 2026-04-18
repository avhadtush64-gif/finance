/**
 * @module server
 * @description Application entry point — starts the HTTP server.
 */

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
    console.error('   Make sure your DATABASE_URL is correct and the DB is running.');
    process.exit(1);
  }

  app.listen(config.port, () => {
    console.log(`🚀  Server running on http://localhost:${config.port}`);
    console.log(`   Environment: ${config.nodeEnv}`);
  });
}

start();
