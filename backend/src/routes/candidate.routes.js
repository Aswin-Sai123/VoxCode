import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { 
    getCandidateDashboard, 
    getCandidateProfile,
    createMockAssessment,
    getCompanyIntelligence,
    updateCandidateResume,
    uploadCandidateResume,
    getCandidateResume
} from '../controllers/candidate.controller.js';

const router = Router();

router.get('/dashboard', protect(['CANDIDATE']), getCandidateDashboard);
router.get('/profile', protect(['CANDIDATE']), getCandidateProfile);
router.get('/company-intelligence', protect(['CANDIDATE']), getCompanyIntelligence);
router.post('/mock-assessment', protect(['CANDIDATE']), createMockAssessment);
router.get('/resume', protect(['CANDIDATE']), getCandidateResume);
router.post('/resume', protect(['CANDIDATE']), updateCandidateResume);
router.post('/resume/upload', protect(['CANDIDATE']), uploadCandidateResume);

export default router;

