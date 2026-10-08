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

const router = Router();

router.post('/company/register', registerCompany);
router.post('/company/login', loginCompany);

router.post('/candidate/register', registerCandidate);
router.post('/candidate/login', loginCandidate);

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: 'http://localhost:5173/login?error=google_failed' }), googleCallback);

router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.get('/me', protect(['COMPANY', 'CANDIDATE']), getMe);

export default router;
