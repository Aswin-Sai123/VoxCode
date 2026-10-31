import { Evaluation } from '../models/evaluation.model.js';
import { InterviewSession } from '../models/interviewSession.model.js';
import { Assessment } from '../models/assessment.model.js';
import '../models/candidate.model.js';
import { evaluateInterviewSession, captureSessionOutcome } from '../services/evaluation.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Get evaluation for a specific interview session
 */
export const getEvaluationBySession = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;

    if (!sessionId) {
        throw new ApiError(400, 'Session ID is required');
    }

    const session = await InterviewSession.findById(sessionId).populate('assessment');
    if (!session) {
        throw new ApiError(404, 'Interview session not found');
    }

    // Role-based access verification
    if (req.user?.role === 'CANDIDATE') {
        if (session.candidate.toString() !== req.user.id) {
            throw new ApiError(403, 'Forbidden: You cannot access another candidate\'s evaluation');
        }
    } else if (req.user?.role === 'COMPANY') {
        if (session.assessment?.company?.toString() !== req.user.id) {
            throw new ApiError(403, 'Forbidden: You cannot access evaluations outside your company');
        }
    }

    let evaluation = await Evaluation.findOne({ session: sessionId })
        .populate('candidate', 'name email skills experience')
        .populate('assessment', 'title roleTitle companyName targetCompanyName targetRoleTitle assessmentType skills experienceLevel durationMinutes');

    // If evaluation not found but session is finalized, trigger evaluation
    if (!evaluation || evaluation.status === 'PENDING') {
        if (session.status === 'COMPLETED' || session.status === 'TIMED_OUT') {
            try {
                evaluation = await evaluateInterviewSession(sessionId);
                evaluation = await Evaluation.findById(evaluation._id)
                    .populate('candidate', 'name email skills experience')
                    .populate('assessment', 'title roleTitle companyName targetCompanyName targetRoleTitle assessmentType skills experienceLevel durationMinutes');
            } catch (err) {
                console.error('Auto evaluation trigger error:', err);
            }
        }
    }

    if (!evaluation) {
        throw new ApiError(404, 'Evaluation report not found for this session');
    }

    res.status(200).json(new ApiResponse(200, evaluation, 'Evaluation report retrieved successfully'));
});

/**
 * Candidate: Get all past interview evaluation reports for logged in candidate
 */
export const getMyReports = asyncHandler(async (req, res) => {
    const candidateId = req.user?._id || req.user?.id;

    if (!candidateId) {
        throw new ApiError(401, 'Unauthorized: Candidate authentication required');
    }

    const reports = await Evaluation.find({ candidate: candidateId })
        .populate('assessment', 'title roleTitle companyName targetCompanyName targetRoleTitle assessmentType skills experienceLevel')
        .populate('session', 'startedAt endedAt stage status durationMinutes')
        .sort({ createdAt: -1 });

    res.status(200).json(new ApiResponse(200, reports, 'Candidate reports retrieved successfully'));
});


/**
 * Company: Get all candidate evaluations for an assessment (Recruiter Leaderboard)
 */
export const getAssessmentEvaluations = asyncHandler(async (req, res) => {
    const { assessmentId } = req.params;
    const { verdict, sortBy = 'score', search } = req.query;

    if (!assessmentId) {
        throw new ApiError(400, 'Assessment ID is required');
    }

    // Verify company ownership of this assessment
    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
        throw new ApiError(404, 'Assessment not found');
    }
    if (assessment.company.toString() !== req.user.id) {
        throw new ApiError(403, 'Forbidden: You do not have access to this assessment');
    }

    const query = { assessment: assessmentId };
    if (verdict && verdict !== 'ALL') {
        query.verdict = verdict;
    }

    let evaluations = await Evaluation.find(query)
        .populate('candidate', 'name email skills experience')
        .populate('session', 'startedAt endedAt stage status')
        .populate('assessment', 'title roleTitle companyName');

    // Client-side or memory filter for candidate search
    if (search && search.trim()) {
        const s = search.toLowerCase();
        evaluations = evaluations.filter(ev =>
            ev.candidate?.name?.toLowerCase().includes(s) ||
            ev.candidate?.email?.toLowerCase().includes(s)
        );
    }

    // Sort evaluations
    if (sortBy === 'score') {
        evaluations.sort((a, b) => (b.scores?.overall || 0) - (a.scores?.overall || 0));
    } else if (sortBy === 'date') {
        evaluations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    res.status(200).json(new ApiResponse(200, evaluations, 'Assessment evaluations retrieved successfully'));
});

/**
 * Company: Update recruiter hiring decision (Shortlist, Reject, Next Round)
 */
export const updateRecruiterDecision = asyncHandler(async (req, res) => {
    const { evaluationId } = req.params;
    const { recruiterDecision, recruiterNotes } = req.body;

    const evaluation = await Evaluation.findById(evaluationId).populate('assessment');
    if (!evaluation) {
        throw new ApiError(404, 'Evaluation not found');
    }

    // Verify company ownership
    if (evaluation.assessment?.company?.toString() !== req.user.id) {
        throw new ApiError(403, 'Forbidden: You cannot modify decisions for assessments outside your company');
    }

    if (recruiterDecision) {
        evaluation.recruiterDecision = recruiterDecision;
        const dec = String(recruiterDecision).toUpperCase();
        const isHireable = ['SHORTLISTED', 'ACCEPTED', 'HIRED', 'NEXT_ROUND'].includes(dec);
        const isReject = ['REJECTED', 'FAILED', 'NO_HIRE'].includes(dec);
        if (isHireable || isReject) {
            try {
                await captureSessionOutcome(evaluation.session, {
                    hireable: isHireable,
                    evaluationAccuracy: evaluation.scores?.overall
                        ? (isHireable ? (evaluation.scores.overall >= 70 ? 0.95 : 0.6) : (evaluation.scores.overall < 70 ? 0.90 : 0.4))
                        : 0.85
                });
            } catch (outcomeErr) {
                console.warn('[captureSessionOutcome] Non-fatal outcome sync warning:', outcomeErr.message);
            }
        }
    }
    if (recruiterNotes !== undefined) {
        evaluation.recruiterNotes = recruiterNotes;
    }

    await evaluation.save();

    res.status(200).json(new ApiResponse(200, evaluation, 'Recruiter decision updated successfully'));
});

/**
 * Trigger or re-run evaluation manually
 */
export const triggerEvaluation = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;

    const session = await InterviewSession.findById(sessionId).populate('assessment');
    if (!session) {
        throw new ApiError(404, 'Interview session not found');
    }

    // Authorization check
    if (req.user?.role === 'CANDIDATE') {
        if (session.candidate.toString() !== req.user.id) {
            throw new ApiError(403, 'Forbidden: Cannot trigger evaluation for another candidate');
        }
    } else if (req.user?.role === 'COMPANY') {
        if (session.assessment?.company?.toString() !== req.user.id) {
            throw new ApiError(403, 'Forbidden: Cannot trigger evaluation outside your company');
        }
    }

    // Check if evaluation already exists and is completed to prevent duplicate Gemini API calls
    const existing = await Evaluation.findOne({ session: sessionId });
    if (existing && existing.status === 'COMPLETED') {
        return res.status(200).json(new ApiResponse(200, existing, 'Evaluation report already completed'));
    }

    const evaluation = await evaluateInterviewSession(sessionId);

    res.status(200).json(new ApiResponse(200, evaluation, 'Evaluation generated successfully'));
});
