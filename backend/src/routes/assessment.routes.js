import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import {
    createAssessment,
    getMyAssessments,
    getAssessmentById,
    toggleAssessmentStatus,
    verifyAssessmentCode,
    inviteCandidates
} from '../controllers/assessment.controller.js';

const router = Router();

// Candidate route — verify assessment code (must be above /:id to avoid conflict)
router.get('/join/:code', protect(['CANDIDATE']), verifyAssessmentCode);
router.get('/code/:code', protect(['CANDIDATE']), verifyAssessmentCode);

// Company routes (protected — COMPANY only)
router.post('/', protect(['COMPANY']), createAssessment);
router.get('/', protect(['COMPANY']), getMyAssessments);
router.get('/:id', protect(['COMPANY']), getAssessmentById);
router.patch('/:id/status', protect(['COMPANY']), toggleAssessmentStatus);
router.post('/:id/invite', protect(['COMPANY']), inviteCandidates);

export default router;

