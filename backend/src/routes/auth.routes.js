import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import passport from '../passport.js';
import {
    registerCompany,
    loginCompany,
    registerCandidate,
    loginCandidate,
    googleCallback,
    oauthExchange,
    refreshToken,
    logout,
    getMe
} from '../controllers/auth.controller.js';
import { getFrontendUrl } from '../utils/url.utils.js';

import { Company } from '../models/company.model.js';

const router = Router();

router.post('/company/register', registerCompany);
router.post('/company/login', loginCompany);

router.post('/candidate/register', registerCandidate);
router.post('/candidate/login', loginCandidate);

router.post('/register', (req, res, next) => {
    if (req.body?.role === 'COMPANY') {
        return registerCompany(req, res, next);
    }
    return registerCandidate(req, res, next);
});

router.post('/login', async (req, res, next) => {
    if (req.body?.role === 'COMPANY') {
        return loginCompany(req, res, next);
    }
    if (req.body?.role === 'CANDIDATE') {
        return loginCandidate(req, res, next);
    }
    const comp = await Company.findOne({ email: req.body?.email });
    if (comp) {
        return loginCompany(req, res, next);
    }
    return loginCandidate(req, res, next);
});

router.get('/google', (req, res, next) => {
    const frontendUrl = getFrontendUrl();
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

    if (!clientId || !clientSecret || !passport._strategy('google')) {
        return res.redirect(`${frontendUrl}/login?error=google_not_configured`);
    }

    try {
        passport.authenticate('google', {
            scope: ['profile', 'email'],
            session: false
        })(req, res, (err) => {
            if (err) {
                return res.redirect(`${frontendUrl}/login?error=google_failed`);
            }
            next();
        });
    } catch (err) {
        return res.redirect(`${frontendUrl}/login?error=google_failed`);
    }
});

router.get('/google/callback', (req, res, next) => {
    const frontendUrl = getFrontendUrl();
    if (!passport._strategy('google')) {
        return res.redirect(`${frontendUrl}/login?error=google_not_configured`);
    }
    passport.authenticate('google', { session: false }, (err, user, info) => {
        if (err) {
            return res.redirect(`${frontendUrl}/login?error=google_failed`);
        }
        if (!user) {
            const reason = info?.message || 'google_failed';
            return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(reason)}`);
        }
        req.user = user;
        next();
    })(req, res, next);
}, googleCallback);

router.post('/oauth/exchange', oauthExchange);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.get('/me', protect(['COMPANY', 'CANDIDATE']), getMe);

export default router;