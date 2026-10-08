import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/dashboard', protect(['CANDIDATE']), (req, res) => {
    res.json({ message: 'Candidate Dashboard data' });
});

router.get('/profile', protect(['CANDIDATE']), (req, res) => {
    res.json({ message: 'Candidate Profile data' });
});

export default router;
