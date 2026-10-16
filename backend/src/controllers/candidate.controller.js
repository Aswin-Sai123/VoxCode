import { Candidate } from '../models/candidate.model.js';
import { Evaluation } from '../models/evaluation.model.js';
import { InterviewSession } from '../models/interviewSession.model.js';
import { Assessment } from '../models/assessment.model.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Get rich dashboard metrics, in-progress sessions, and recent reports for logged-in candidate
 */
export const getCandidateDashboard = asyncHandler(async (req, res) => {
    const candidateId = req.user?._id || req.user?.id;

    if (!candidateId) {
        throw new ApiError(401, 'Unauthorized: Candidate authentication required');
    }

    const candidate = await Candidate.findById(candidateId).select('-password');
    if (!candidate) {
        throw new ApiError(404, 'Candidate not found');
    }

    // 1. Fetch completed evaluations
    const evaluations = await Evaluation.find({ candidate: candidateId })
        .populate('assessment', 'title roleTitle companyName skills experienceLevel durationMinutes assessmentCode')
        .populate('session', 'startedAt endedAt stage status')
        .sort({ createdAt: -1 });

    // Calculate aggregated stats
    const totalInterviews = evaluations.length;
    let avgScore = 0;
    let highestScore = 0;
    let bestVerdict = 'N/A';

    if (totalInterviews > 0) {
        const sumScores = evaluations.reduce((acc, curr) => acc + (curr.scores?.overall || 0), 0);
        avgScore = Math.round(sumScores / totalInterviews);
        highestScore = Math.max(...evaluations.map(e => e.scores?.overall || 0));

        const verdictPriority = ['Strong Hire', 'Hire', 'Needs Improvement', 'Reject'];
        for (const v of verdictPriority) {
            if (evaluations.some(e => e.verdict === v)) {
                bestVerdict = v;
                break;
            }
        }
    }

    // 2. Fetch any in-progress sessions (so candidate can resume)
    const inProgressSessions = await InterviewSession.find({
        candidate: candidateId,
        status: 'IN_PROGRESS'
    })
        .populate('assessment', 'title roleTitle companyName skills durationMinutes assessmentCode')
        .sort({ updatedAt: -1 })
        .limit(3);

    // 3. Recommended / Available Practice Assessments (e.g. active assessments available to practice)
    const availableAssessments = await Assessment.find({ status: 'ACTIVE' })
        .select('title roleTitle companyName skills experienceLevel durationMinutes assessmentCode')
        .sort({ createdAt: -1 })
        .limit(3);

    res.status(200).json(new ApiResponse(200, {
        candidate,
        stats: {
            totalInterviews,
            avgScore,
            highestScore,
            bestVerdict
        },
        recentReports: evaluations.slice(0, 5),
        inProgressSessions,
        availableAssessments
    }, 'Candidate dashboard data retrieved successfully'));
});

/**
 * Get candidate profile
 */
export const getCandidateProfile = asyncHandler(async (req, res) => {
    const candidateId = req.user?._id || req.user?.id;
    const candidate = await Candidate.findById(candidateId).select('-password');
    if (!candidate) {
        throw new ApiError(404, 'Candidate not found');
    }
    res.status(200).json(new ApiResponse(200, candidate, 'Candidate profile retrieved successfully'));
});
