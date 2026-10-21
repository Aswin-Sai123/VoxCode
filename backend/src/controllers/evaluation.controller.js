import { Evaluation } from '../models/evaluation.model.js';
import { InterviewSession } from '../models/interviewSession.model.js';
import '../models/candidate.model.js';
import '../models/assessment.model.js';
import { evaluateInterviewSession } from '../services/evaluation.service.js';
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

    let evaluation = await Evaluation.findOne({ session: sessionId })
        .populate('candidate', 'name email skills experience')
        .populate('assessment', 'title roleTitle companyName targetCompanyName targetRoleTitle assessmentType skills experienceLevel durationMinutes');

    // If evaluation not found but session is completed, automatically trigger evaluation!
    if (!evaluation || evaluation.status === 'PENDING') {
        const session = await InterviewSession.findById(sessionId);
        if (session) {
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

    // Confidentiality check: candidates only view reports for mock assessments
    if (req.user?.role === 'CANDIDATE' && evaluation.assessment?.assessmentType === 'COMPANY') {
        throw new ApiError(403, 'Company assessment evaluation reports are confidential to the hiring organization. Mock assessment practice sessions provide full transparent scoring and feedback.');
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

    const evaluation = await Evaluation.findById(evaluationId);
    if (!evaluation) {
        throw new ApiError(404, 'Evaluation not found');
    }

    if (recruiterDecision) {
        evaluation.recruiterDecision = recruiterDecision;
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

    const evaluation = await evaluateInterviewSession(sessionId);

    res.status(200).json(new ApiResponse(200, evaluation, 'Evaluation generated successfully'));
});
