import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Candidate } from './models/candidate.model.js';
import dotenv from 'dotenv';
dotenv.config();

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback'
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        if (!email) {
          return done(new Error('No email found in Google profile'), null);
        }

        // Check if candidate exists by googleId or email
        let candidate = await Candidate.findOne({ 
          $or: [
            { googleId: profile.id },
            { email: email }
          ]
        });

        if (!candidate) {
          // Create new candidate
          candidate = await Candidate.create({
            name: profile.displayName || email.split('@')[0],
            email: email,
            googleId: profile.id,
            role: 'CANDIDATE'
          });
        } else if (!candidate.googleId) {
          // Link google account to existing email if they signed up manually before
          candidate.googleId = profile.id;
          await candidate.save();
        }

        return done(null, candidate);
      } catch (error) {
        return done(error, null);
      }
    }
  ));
} else {
  console.warn("⚠️ Google OAuth credentials not fully configured; Google strategy skipped.");
}

export default passport;
