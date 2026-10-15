import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import {
    getEvaluationBySession,
    getMyReports,
    getAssessmentEvaluations,
    updateRecruiterDecision,
    triggerEvaluation
} from '../controllers/evaluation.controller.js';

const router = Router();

// Candidate: view all past evaluation reports
router.get('/my-reports', protect(['CANDIDATE']), getMyReports);

// Get evaluation report for a specific interview session
router.get('/session/:sessionId', getEvaluationBySession);

// Company: get all candidate evaluations for an assessment (leaderboard)
router.get('/assessment/:assessmentId', protect(['COMPANY']), getAssessmentEvaluations);

// Company: update recruiter decision (Shortlist, Reject, Next Round)
router.patch('/:evaluationId/decision', protect(['COMPANY']), updateRecruiterDecision);

// Trigger evaluation manually
router.post('/trigger/:sessionId', triggerEvaluation);

export default router;
