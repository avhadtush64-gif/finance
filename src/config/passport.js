/**
 * @module config/passport
 * @description Google OAuth 2.0 strategy for Passport.js.
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { v4: uuidv4 } = require('uuid');
const config = require('./env');
const db = require('./db');

if (config.googleClientId && config.googleClientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.googleClientId,
        clientSecret: config.googleClientSecret,
        callbackURL: config.googleCallbackUrl,
        scope: ['profile', 'email'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          const googleId = profile.id;
          const name = profile.displayName || '';
          const avatarUrl = profile.photos?.[0]?.value || null;

          // Check if user already exists by google_id or email
          let result = await db.query(
            'SELECT * FROM users WHERE google_id = $1 OR email = $2 LIMIT 1',
            [googleId, email]
          );

          let user = result.rows[0];

          if (user) {
            // Update google_id / avatar if not set
            if (!user.google_id) {
              await db.query(
                'UPDATE users SET google_id = $1, avatar_url = COALESCE(avatar_url, $2), updated_at = NOW() WHERE id = $3',
                [googleId, avatarUrl, user.id]
              );
            }
          } else {
            // Create new user
            const id = uuidv4();
            const res = await db.query(
              `INSERT INTO users (id, name, email, google_id, avatar_url, preferred_currency)
               VALUES ($1, $2, $3, $4, $5, 'USD')
               RETURNING *`,
              [id, name, email, googleId, avatarUrl]
            );
            user = res.rows[0];
          }

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
} else {
  console.warn('⚠️  Google OAuth credentials not set — Google login disabled.');
}

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, rows[0] || null);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
