import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import {
    startSession,
    startPracticeSession,
    sendCandidateMessage,
    runCandidateCode,
    submitSession,
    recordProctoringEvent,
    recordSessionOutcomeController
} from '../controllers/interview.controller.js';

const router = Router();

router.post('/start/:code', protect(['CANDIDATE']), startSession);
router.post('/start', protect(['CANDIDATE']), startSession);
router.post('/practice/start', protect(['CANDIDATE']), startPracticeSession);
router.post('/message', protect(['CANDIDATE']), sendCandidateMessage);
router.post('/session/:sessionId/answer', protect(['CANDIDATE']), sendCandidateMessage);
router.post('/session/:sessionId/proctoring', protect(['CANDIDATE']), recordProctoringEvent);
router.post('/proctoring/event', protect(['CANDIDATE']), recordProctoringEvent);
router.post('/run-code', protect(['CANDIDATE']), runCandidateCode);
router.post('/execute', protect(['CANDIDATE']), runCandidateCode);
router.post('/submit', protect(['CANDIDATE']), submitSession);
router.post('/session/:sessionId/complete', protect(['CANDIDATE']), submitSession);
router.post('/session/:sessionId/outcome', protect(['CANDIDATE', 'COMPANY']), recordSessionOutcomeController);
router.patch('/session/:sessionId/outcome', protect(['CANDIDATE', 'COMPANY']), recordSessionOutcomeController);

export default router;