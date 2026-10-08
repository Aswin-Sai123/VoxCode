import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Candidate } from './models/candidate.model.js';
import dotenv from 'dotenv';
dotenv.config();

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if candidate exists by googleId or email
      let candidate = await Candidate.findOne({ 
        $or: [
          { googleId: profile.id },
          { email: profile.emails[0].value }
        ]
      });

      if (!candidate) {
        // Create new candidate
        candidate = await Candidate.create({
          name: profile.displayName,
          email: profile.emails[0].value,
          googleId: profile.id
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

export default passport;
