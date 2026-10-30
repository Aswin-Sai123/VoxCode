import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { 
    getCandidateDashboard, 
    createMockAssessment,
    updateCandidateResume,
    uploadCandidateResume,
    getCandidateResume
} from '../controllers/candidate.controller.js';

const router = Router();

router.get('/dashboard', protect(['CANDIDATE']), getCandidateDashboard);
router.post('/mock-assessment', protect(['CANDIDATE']), createMockAssessment);
router.get('/resume', protect(['CANDIDATE']), getCandidateResume);
router.post('/resume', protect(['CANDIDATE']), updateCandidateResume);
router.post('/resume/upload', protect(['CANDIDATE']), uploadCandidateResume);

export default router;