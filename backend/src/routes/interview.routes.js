import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import {
    startSession,
    sendCandidateMessage,
    runCandidateCode,
    submitSession
} from '../controllers/interview.controller.js';

const router = Router();

// Candidate interview endpoints
router.post('/start/:code', protect(['CANDIDATE']), startSession);
router.post('/message', protect(['CANDIDATE']), sendCandidateMessage);
router.post('/run-code', protect(['CANDIDATE']), runCandidateCode);
router.post('/submit', protect(['CANDIDATE']), submitSession);

export default router;
