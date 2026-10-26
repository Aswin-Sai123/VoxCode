import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Candidate } from './models/candidate.model.js';
import { getGoogleCallbackUrl } from './utils/url.utils.js';
import dotenv from 'dotenv';
dotenv.config();

const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

if (googleClientId && googleClientSecret) {
  const callbackURL = getGoogleCallbackUrl();
  console.log(`[Passport] Initializing Google OAuth with callback URL: ${callbackURL}`);

  passport.use(new GoogleStrategy({
      clientID: googleClientId,
      clientSecret: googleClientSecret,
      callbackURL: callbackURL,
      proxy: true
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
