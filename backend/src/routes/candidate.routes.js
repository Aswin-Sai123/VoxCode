import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { getCandidateDashboard, getCandidateProfile } from '../controllers/candidate.controller.js';

const router = Router();

router.get('/dashboard', protect(['CANDIDATE']), getCandidateDashboard);
router.get('/profile', protect(['CANDIDATE']), getCandidateProfile);

export default router;
