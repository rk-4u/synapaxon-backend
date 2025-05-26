const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const { ExtractJwt } = require('passport-jwt');
const config = require('./config');
const User = require('../models/User');

passport.use(
  new GoogleStrategy(
    {
      clientID: config.GOOGLE_CLIENT_ID,
      clientSecret: config.GOOGLE_CLIENT_SECRET,
      callbackURL: config.GOOGLE_CALLBACK_URL
    },
    async (accessToken, refreshToken, profile, done) => {

      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error('No email from Google'), null);

        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          user = await User.create({
            googleId: profile.id,
            email,
            name: profile.displayName || email.split('@')[0],
            role: 'student',
            plan: 'free'
          });
        }

        return done(null, user);
      } catch (err) {
        console.error('❌ Google strategy error:', err);
        return done(err, null);
      }
    }
  )
);

passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.JWT_SECRET
    },
    async (payload, done) => {
      try {
        const user = await User.findById(payload.id);
        return user ? done(null, user) : done(null, false);
      } catch (err) {
        return done(err, false);
      }
    }
  )
);

module.exports = passport;
