import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import passport from '../passport.js';
import {
    registerCompany,
    loginCompany,
    registerCandidate,
    loginCandidate,
    googleLogin,
    googleCallback,
    refreshToken,
    logout,
    getMe
} from '../controllers/auth.controller.js';

import { Company } from '../models/company.model.js';

const router = Router();

router.post('/company/register', registerCompany);
router.post('/company/login', loginCompany);

router.post('/candidate/register', registerCandidate);
router.post('/candidate/login', loginCandidate);

// Unified endpoints supporting role in body or auto-detection
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
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return res.redirect(`${frontendUrl}/login?error=google_not_configured`);
    }
    passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    passport.authenticate('google', {
        session: false,
        failureRedirect: `${frontendUrl}/login?error=google_failed`
    })(req, res, next);
}, googleCallback);

router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.get('/me', protect(['COMPANY', 'CANDIDATE']), getMe);

export default router;
