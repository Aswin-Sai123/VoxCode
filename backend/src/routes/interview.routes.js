import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import {
    startSession,
    startPracticeSession,
    sendCandidateMessage,
    runCandidateCode,
    submitSession
} from '../controllers/interview.controller.js';

const router = Router();

// Candidate interview endpoints
router.post('/start/:code', protect(['CANDIDATE']), startSession);
router.post('/start', protect(['CANDIDATE']), startSession);
router.post('/practice/start', protect(['CANDIDATE']), startPracticeSession);
router.post('/message', protect(['CANDIDATE']), sendCandidateMessage);
router.post('/session/:sessionId/answer', protect(['CANDIDATE']), sendCandidateMessage);
router.post('/run-code', protect(['CANDIDATE']), runCandidateCode);
router.post('/execute', protect(['CANDIDATE']), runCandidateCode);
router.post('/submit', protect(['CANDIDATE']), submitSession);
router.post('/session/:sessionId/complete', protect(['CANDIDATE']), submitSession);

export default router;
