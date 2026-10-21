import { InterviewSession } from '../models/interviewSession.model.js';
import { Evaluation } from '../models/evaluation.model.js';

/**
 * Close duplicate in-progress rows when a session is finalized for the same candidate + assessment.
 */
export async function closeDuplicateInProgressSessions({ candidateId, assessmentId, keepSessionId }) {
    if (!candidateId || !assessmentId) return;

    await InterviewSession.updateMany(
        {
            candidate: candidateId,
            assessment: assessmentId,
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
 * Returns effective status: 'IN_PROGRESS' | 'COMPLETED' | 'TIMED_OUT'
 */
export async function reconcileInterviewSessionStatus(session) {
    if (!session || session.status !== 'IN_PROGRESS') {
        return session?.status || 'COMPLETED';
    }

    const hasEval = await Evaluation.exists({ session: session._id });
    if (hasEval) {
        session.status = 'COMPLETED';
        session.stage = 'COMPLETED';
        if (!session.endedAt) session.endedAt = new Date();
        await session.save();
        return 'COMPLETED';
    }

    const completedSibling = await InterviewSession.findOne({
        candidate: session.candidate,
        assessment: session.assessment,
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

    return 'IN_PROGRESS';
}
