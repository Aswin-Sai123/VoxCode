import { InterviewSession } from '../models/interviewSession.model.js';
import { Evaluation } from '../models/evaluation.model.js';

/**
 * Close duplicate in-progress rows when a session is finalized for the same candidate + assessment.
 */
export async function closeDuplicateInProgressSessions({ candidateId, assessmentId, keepSessionId }) {
    const cId = candidateId?._id || candidateId;
    const aId = assessmentId?._id || assessmentId;
    if (!cId || !aId) return;

    await InterviewSession.updateMany(
        {
            candidate: cId,
            assessment: aId,
            status: 'IN_PROGRESS',
            ...(keepSessionId ? { _id: { $ne: keepSessionId } } : {})
        },
        {
            $set: {
                status: 'COMPLETED',
                stage: 'COMPLETED',
                endedAt: new Date()
            }
        }
    );
}

/**
 * If a session is still IN_PROGRESS but should be treated as done, fix it in place.
 * Checks multiple signals: existing evaluation, completed siblings, stage mismatch,
 * and duration-based timeout.
 * Returns effective status: 'IN_PROGRESS' | 'COMPLETED' | 'TIMED_OUT'
 */
export async function reconcileInterviewSessionStatus(session) {
    if (!session || session.status !== 'IN_PROGRESS') {
        return session?.status || 'COMPLETED';
    }

    // 1. If stage is already COMPLETED but status wasn't updated (the root bug)
    if (session.stage === 'COMPLETED') {
        session.status = 'COMPLETED';
        if (!session.endedAt) session.endedAt = new Date();
        await session.save();
        return 'COMPLETED';
    }

    // 2. If an evaluation already exists for this session
    const hasEval = await Evaluation.exists({ session: session._id });
    if (hasEval) {
        session.status = 'COMPLETED';
        session.stage = 'COMPLETED';
        if (!session.endedAt) session.endedAt = new Date();
        await session.save();
        return 'COMPLETED';
    }

    // 3. If another session for same candidate+assessment is already completed
    const candId = session.candidate?._id || session.candidate;
    const asmtId = session.assessment?._id || session.assessment;
    const completedSibling = await InterviewSession.findOne({
        candidate: candId,
        assessment: asmtId,
        status: 'COMPLETED',
        _id: { $ne: session._id }
    }).select('_id');

    if (completedSibling) {
        session.status = 'COMPLETED';
        session.stage = 'COMPLETED';
        if (!session.endedAt) session.endedAt = new Date();
        await session.save();
        return 'COMPLETED';
    }

    // 4. Duration-based timeout: if session has been running longer than allowed + buffer
    const durationMs = (session.durationMinutes || 30) * 60 * 1000;
    const bufferMs = 15 * 60 * 1000; // 15 minute grace period
    const startTime = session.startedAt || session.createdAt;
    if (startTime && (Date.now() - new Date(startTime).getTime()) > (durationMs + bufferMs)) {
        session.status = 'TIMED_OUT';
        session.stage = 'COMPLETED';
        if (!session.endedAt) session.endedAt = new Date();
        await session.save();
        return 'TIMED_OUT';
    }

    return 'IN_PROGRESS';
}
