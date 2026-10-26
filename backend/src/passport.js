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
        const rawEmail = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        if (!rawEmail) {
          return done(new Error('No email found in Google profile'), null);
        }
        const email = rawEmail.trim().toLowerCase();

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
          // Prevent pre-account takeover: if account was registered with email/password,
          // reject silent linking to protect the user's account.
          if (candidate.password) {
            return done(null, false, { message: 'account_exists_with_password' });
          }
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
