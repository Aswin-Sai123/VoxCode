import { Candidate } from '../models/candidate.model.js';
import { Evaluation } from '../models/evaluation.model.js';
import { InterviewSession } from '../models/interviewSession.model.js';
import { Assessment } from '../models/assessment.model.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getCuratedCompanyProfiles, getScrapedCompanyIntelligence } from '../services/companyScraper.service.js';
import { parseResumeProjects, parseResumeDocument } from '../services/ai.service.js';
import { reconcileInterviewSessionStatus } from '../utils/reconcileInterviewSession.js';

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
        .populate('assessment', 'title roleTitle companyName targetCompanyName targetRoleTitle assessmentType skills experienceLevel durationMinutes assessmentCode')
        .populate('session', 'startedAt endedAt stage status')
        .sort({ createdAt: -1 });

    // Filter reports: Mock assessments have full public results for candidate, Company assessments are confidential
    const processedReports = evaluations.map(ev => {
        const asmt = ev.assessment || {};
        const isMock = asmt.assessmentType === 'MOCK';
        return {
            _id: ev._id,
            sessionId: ev.session?._id,
            assessmentTitle: asmt.title || `${asmt.targetCompanyName || asmt.companyName || 'Company'} Assessment`,
            companyName: asmt.targetCompanyName || asmt.companyName || 'Hiring Team',
            roleTitle: asmt.targetRoleTitle || asmt.roleTitle || 'Software Engineer',
            assessmentType: asmt.assessmentType || 'COMPANY',
            isMock,
            scores: ev.scores,
            verdict: ev.verdict,
            createdAt: ev.createdAt,
            // For company assessments, note confidentiality
            confidentialNotice: !isMock ? 'Confidential — delivered directly to company recruiting team' : null
        };
    });

    // Calculate aggregated stats (based primarily on mock assessments & candidate practice)
    const mockEvaluations = evaluations.filter(e => e.assessment?.assessmentType === 'MOCK' || !e.assessment?.assessmentType);
    const totalInterviews = evaluations.length;
    let avgScore = 0;
    let highestScore = 0;
    let bestVerdict = 'N/A';

    if (evaluations.length > 0) {
        const sumScores = evaluations.reduce((acc, curr) => acc + (curr.scores?.overall || 0), 0);
        avgScore = Math.round(sumScores / evaluations.length);
        highestScore = Math.max(...evaluations.map(e => e.scores?.overall || 0));

        const verdictPriority = ['Strong Hire', 'Hire', 'Needs Improvement', 'Reject'];
        for (const v of verdictPriority) {
            if (evaluations.some(e => e.verdict === v)) {
                bestVerdict = v;
                break;
            }
        }
    }

    // 2. Fetch valid in-progress sessions (exclude completed evaluations, expired or closed assessments)
    const rawInProgress = await InterviewSession.find({
        candidate: candidateId,
        status: 'IN_PROGRESS'
    })
        .populate('assessment', 'title roleTitle companyName targetCompanyName targetRoleTitle assessmentType skills durationMinutes assessmentCode status openingTime closingTime')
        .sort({ updatedAt: -1 });

    const inProgressSessions = [];
    for (const sess of rawInProgress) {
        // If assessment is missing, closed, or practice lab session, skip
        if (!sess.assessment || sess.assessment.status === 'CLOSED' || sess.assessment.assessmentCode === 'PRACTICE-MOCK-SESSION') continue;

        const effectiveStatus = await reconcileInterviewSessionStatus(sess);
        if (effectiveStatus !== 'IN_PROGRESS') continue;

        inProgressSessions.push({
            _id: sess._id,
            assessmentId: sess.assessment._id,
            assessmentTitle: sess.assessment.title,
            assessmentCode: sess.assessment.assessmentCode,
            companyName: sess.assessment.targetCompanyName || sess.assessment.companyName || 'Company',
            stage: sess.stage,
            isPractice: sess.isPractice || false,
            startedAt: sess.startedAt
        });
    }

    // 3. Recommended / Available Assessments (exclude Practice Lab dummy assessment)
    const availableAssessments = await Assessment.find({ 
        status: 'ACTIVE',
        assessmentCode: { $ne: 'PRACTICE-MOCK-SESSION' }
    })
        .select('title roleTitle companyName targetCompanyName targetRoleTitle assessmentType skills experienceLevel durationMinutes assessmentCode')
        .sort({ createdAt: -1 })
        .limit(4);

    const completedAssessmentCodes = Array.from(new Set(
        evaluations.map(e => e.assessment?.assessmentCode).filter(Boolean)
    ));

    res.status(200).json(new ApiResponse(200, {
        candidate,
        stats: {
            totalInterviews,
            avgScore,
            highestScore,
            bestVerdict
        },
        recentReports: processedReports.slice(0, 5),
        inProgressSessions,
        availableAssessments,
        completedAssessmentCodes
    }, 'Candidate dashboard data retrieved successfully'));
});

/**
 * Get curated company intelligence for mock assessments (Google, Meta, Amazon, Netflix, etc.)
 */
export const getCompanyIntelligence = asyncHandler(async (req, res) => {
    const companies = getCuratedCompanyProfiles();
    res.status(200).json(new ApiResponse(200, companies, 'Curated company intelligence retrieved'));
});

/**
 * Create a candidate mock assessment with authentic scraped blueprint & questions
 */
export const createMockAssessment = asyncHandler(async (req, res) => {
    const candidateId = req.user?._id || req.user?.id;
    if (!candidateId) {
        throw new ApiError(401, 'Unauthorized: Candidate login required');
    }

    const { companyName = 'Google', roleTitle = 'Full Stack Engineer', experienceLevel = 'Mid', skills = [], durationMinutes = 30 } = req.body;

    // Retrieve scraped intelligence and authentic interview blueprint
    const intelligence = await getScrapedCompanyIntelligence({
        companyName,
        roleTitle,
        experienceLevel
    });

    const prefix = (intelligence.badge || 'MOCK').slice(0, 4);
    const random4 = () => Math.floor(1000 + Math.random() * 9000);
    const assessmentCode = `MOCK-${prefix}-${random4()}`;

    const assessment = await Assessment.create({
        createdByCandidate: candidateId,
        assessmentType: 'MOCK',
        targetCompanyName: intelligence.companyName,
        targetRoleTitle: intelligence.roleTitle,
        title: `${intelligence.companyName} ${intelligence.roleTitle} Mock Assessment`,
        skills: skills && skills.length ? skills : intelligence.skills,
        experienceLevel: experienceLevel || 'Mid',
        durationMinutes: durationMinutes || 30,
        blueprint: intelligence.blueprint,
        scrapedBlueprint: intelligence.blueprint,
        scrapedQuestions: intelligence.sampleQuestions,
        assessmentCode,
        status: 'ACTIVE'
    });

    res.status(201).json(new ApiResponse(201, {
        assessmentCode: assessment.assessmentCode,
        title: assessment.title,
        companyName: intelligence.companyName,
        roleTitle: intelligence.roleTitle,
        experienceLevel: assessment.experienceLevel,
        durationMinutes: assessment.durationMinutes,
        skills: assessment.skills,
        blueprint: assessment.blueprint,
        sampleQuestions: assessment.scrapedQuestions
    }, 'Mock assessment generated successfully with authentic company blueprint'));
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

/**
 * Update candidate resume and auto-parse projects
 */
export const updateCandidateResume = asyncHandler(async (req, res) => {
    const candidateId = req.user?._id || req.user?.id;
    if (!candidateId) {
        throw new ApiError(401, 'Unauthorized');
    }

    const { resumeText } = req.body;
    if (!resumeText || !resumeText.trim()) {
        throw new ApiError(400, 'Resume text is required');
    }

    // Auto-parse structured projects using Gemini
    const parsedData = await parseResumeProjects(resumeText);

    const updatedCandidate = await Candidate.findByIdAndUpdate(
        candidateId,
        {
            resumeText: resumeText.trim(),
            parsedProjects: parsedData.projects || []
        },
        { new: true }
    ).select('-password');

    res.status(200).json(new ApiResponse(200, {
        candidate: updatedCandidate,
        parsedData
    }, 'Resume updated and projects parsed successfully'));
});

/**
 * Upload candidate resume document (PDF / Text) and auto-parse with Gemini
 */
export const uploadCandidateResume = asyncHandler(async (req, res) => {
    const candidateId = req.user?._id || req.user?.id;
    const { fileBase64, mimeType, fileName, resumeText } = req.body;

    if (!fileBase64 && (!resumeText || !resumeText.trim())) {
        throw new ApiError(400, 'Either a resume file or text content is required');
    }

    // Auto-parse using Gemini document parser
    const parsedData = await parseResumeDocument({
        fileBase64: fileBase64 || '',
        mimeType: mimeType || 'application/pdf',
        resumeText: resumeText || ''
    });

    let updatedCandidate = null;
    if (candidateId) {
        updatedCandidate = await Candidate.findByIdAndUpdate(
            candidateId,
            {
                resumeText: parsedData.extractedText || resumeText || '',
                resumeFileName: fileName || 'Uploaded_Resume.pdf',
                parsedProjects: parsedData.projects || []
            },
            { new: true }
        ).select('-password');
    }

    res.status(200).json(new ApiResponse(200, {
        candidate: updatedCandidate,
        parsedData,
        extractedText: parsedData.extractedText,
        fileName: fileName || 'Uploaded_Resume.pdf',
        projects: parsedData.projects || [],
        summary: parsedData.summary,
        skills: parsedData.skills
    }, 'Resume document parsed and saved successfully'));
});

/**
 * Get candidate resume and parsed projects
 */
export const getCandidateResume = asyncHandler(async (req, res) => {
    const candidateId = req.user?._id || req.user?.id;
    if (!candidateId) {
        throw new ApiError(401, 'Unauthorized');
    }

    const candidate = await Candidate.findById(candidateId).select('resumeText resumeFileName parsedProjects');
    res.status(200).json(new ApiResponse(200, {
        resumeText: candidate?.resumeText || '',
        resumeFileName: candidate?.resumeFileName || '',
        parsedProjects: candidate?.parsedProjects || []
    }, 'Resume retrieved successfully'));
});


