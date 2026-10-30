import crypto from 'crypto';
import { Assessment } from '../models/assessment.model.js';
import { Company } from '../models/company.model.js';
import { Role } from '../models/role.model.js';
import { Candidate } from '../models/candidate.model.js';
import { InterviewSession } from '../models/interviewSession.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendAssessmentInvite } from '../services/email.service.js';
import { synthesizeInterviewBlueprint } from '../services/ai.service.js';
import { getFrontendUrl } from '../utils/url.utils.js';

// Cryptographically secure, unguessable assessment code e.g. "ASMT-A7F2B9-8E1C4D"
const generateCode = () => {
    const part1 = crypto.randomBytes(3).toString('hex').toUpperCase();
    const part2 = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `ASMT-${part1}-${part2}`;
};

/**
 * Company uploads blueprint doc or pastes hiring blueprint to synthesize structured format via Gemini
 */
export const synthesizeBlueprint = asyncHandler(async (req, res) => {
    const { 
        roleId, 
        roleTitle: customRoleTitle,
        title, 
        skills = [], 
        experienceLevel = 'Mid', 
        blueprintText = '', 
        fileBase64 = '', 
        mimeType = 'application/pdf',
        fileName = ''
    } = req.body;

    let roleTitle = customRoleTitle || 'Software Engineer';
    if (roleId) {
        const role = await Role.findById(roleId);
        if (role?.title) roleTitle = role.title;
    }

    let companyName = req.user?.name;
    if (!companyName && req.user?.id) {
        const comp = await Company.findById(req.user.id).select('name');
        if (comp?.name) companyName = comp.name;
    }
    companyName = companyName || 'Tech Organization';

    const analysis = await synthesizeInterviewBlueprint({
        companyName,
        roleTitle,
        experienceLevel,
        skills,
        blueprintText,
        fileBase64,
        mimeType
    });

    res.status(200).json(new ApiResponse(200, {
        analysis,
        fileName: fileName || '',
        extractedText: blueprintText || ''
    }, 'Interview blueprint synthesized successfully'));
});

// Company creates a new assessment
export const createAssessment = asyncHandler(async (req, res) => {
    const { 
        roleId, 
        role: bodyRole,
        title, 
        skills, 
        experienceLevel, 
        durationMinutes, 
        blueprint,
        openingTime,
        closingTime,
        accessType,
        eligibleEmails,
        codingRoundEnabled,
        voiceRoundEnabled
    } = req.body;

    const targetRoleId = roleId || bodyRole;

    if (!targetRoleId || !title) {
        throw new ApiError(400, 'Role and title are required');
    }

    // Default blueprint fallback if not provided via API
    let effectiveBlueprint = blueprint?.trim() || '';
    if (!effectiveBlueprint && !req.body.blueprintFileName) {
        if (req.body.blueprintAnalysis?.roundSummary) {
            effectiveBlueprint = req.body.blueprintAnalysis.roundSummary;
        } else {
            effectiveBlueprint = `Standard ${experienceLevel || 'Mid'}-level technical assessment for ${title}.`;
        }
    }

    const parsedDuration = (durationMinutes !== undefined && durationMinutes !== null) ? parseInt(durationMinutes, 10) : 30;
    if (isNaN(parsedDuration) || parsedDuration < 5 || parsedDuration > 240) {
        throw new ApiError(400, 'Assessment duration must be an integer between 5 and 240 minutes');
    }

    if (openingTime && isNaN(new Date(openingTime).getTime())) {
        throw new ApiError(400, 'Invalid opening time format');
    }

    if (closingTime && isNaN(new Date(closingTime).getTime())) {
        throw new ApiError(400, 'Invalid closing time format');
    }

    if (closingTime && new Date(closingTime) <= new Date()) {
        throw new ApiError(400, 'Assessment closing time cannot be in the past');
    }

    if (openingTime && closingTime) {
        const openDate = new Date(openingTime);
        const closeDate = new Date(closingTime);
        if (openDate >= closeDate) {
            throw new ApiError(400, 'Assessment closing time must be strictly after opening time');
        }
        const windowMinutes = (closeDate.getTime() - openDate.getTime()) / (60 * 1000);
        if (windowMinutes < parsedDuration) {
            throw new ApiError(400, `Assessment access window (${Math.round(windowMinutes)} mins) must be at least as long as the test duration (${parsedDuration} mins)`);
        }
    }

    // make sure the role actually belongs to this company
    const role = await Role.findOne({ _id: targetRoleId, company: req.user.id });
    if (!role) {
        throw new ApiError(404, 'Role not found or does not belong to your company');
    }

    // generate a unique code (keep trying if collision happens)
    let assessmentCode = generateCode();
    let codeExists = await Assessment.findOne({ assessmentCode });
    while (codeExists) {
        assessmentCode = generateCode();
        codeExists = await Assessment.findOne({ assessmentCode });
    }

    // Process eligible emails if provided
    let cleanEmails = [];
    if (eligibleEmails) {
        cleanEmails = Array.isArray(eligibleEmails)
            ? eligibleEmails.map(e => e.trim().toLowerCase()).filter(Boolean)
            : String(eligibleEmails).split(/[\n,;]+/).map(e => e.trim().toLowerCase()).filter(Boolean);
    }

    // Synthesize blueprint analysis if not pre-computed
    let finalAnalysis = req.body.blueprintAnalysis;
    if (!finalAnalysis) {
        let companyName = req.user?.name;
        if (!companyName && req.user?.id) {
            const comp = await Company.findById(req.user.id).select('name');
            if (comp?.name) companyName = comp.name;
        }
        companyName = companyName || 'Tech Organization';

        finalAnalysis = await synthesizeInterviewBlueprint({
            companyName,
            roleTitle: role?.title || title,
            experienceLevel: experienceLevel || 'Entry',
            skills: skills || [],
            blueprintText: blueprint || ''
        });
    }

    const effectiveCoding = codingRoundEnabled !== undefined 
        ? codingRoundEnabled 
        : (finalAnalysis?.codingRoundEnabled !== false);

    const effectiveFormat = req.body.interviewFormat || finalAnalysis?.interviewFormat || (effectiveCoding ? 'FULL_INTERVIEW' : 'PROJECT_AND_TECHNICAL_ONLY');

    const assessment = await Assessment.create({
        company: req.user.id,
        role: targetRoleId,
        title: title.trim(),
        skills: skills || [],
        experienceLevel: experienceLevel || 'Entry',
        durationMinutes: parsedDuration,
        blueprint: effectiveBlueprint,
        blueprintFileName: req.body.blueprintFileName || '',
        blueprintAnalysis: finalAnalysis,
        interviewFormat: effectiveFormat,
        assessmentCode,
        openingTime: openingTime ? new Date(openingTime) : null,
        closingTime: closingTime ? new Date(closingTime) : null,
        accessType: accessType === 'INVITE_ONLY' ? 'INVITE_ONLY' : 'PUBLIC',
        eligibleEmails: cleanEmails,
        codingRoundEnabled: effectiveCoding,
        voiceRoundEnabled: voiceRoundEnabled !== false
    });

    res.status(201).json(new ApiResponse(201, assessment, 'Assessment created successfully'));
});

// Company gets all their assessments
export const getMyAssessments = asyncHandler(async (req, res) => {
    const assessments = await Assessment.find({ company: req.user.id })
        .populate('role', 'title')
        .sort({ createdAt: -1 });

    res.json(new ApiResponse(200, assessments, 'Assessments fetched successfully'));
});

// Company gets a single assessment by id
export const getAssessmentById = asyncHandler(async (req, res) => {
    const assessment = await Assessment.findOne({ 
        _id: req.params.id, 
        company: req.user.id 
    }).populate('role', 'title');

    if (!assessment) {
        throw new ApiError(404, 'Assessment not found');
    }

    res.json(new ApiResponse(200, assessment, 'Assessment fetched'));
});

// Company toggles assessment status (ACTIVE <-> CLOSED)
export const toggleAssessmentStatus = asyncHandler(async (req, res) => {
    const assessment = await Assessment.findOne({ 
        _id: req.params.id, 
        company: req.user.id 
    });

    if (!assessment) {
        throw new ApiError(404, 'Assessment not found');
    }

    // flip the status
    assessment.status = assessment.status === 'ACTIVE' ? 'CLOSED' : 'ACTIVE';
    await assessment.save();

    res.json(new ApiResponse(200, assessment, `Assessment ${assessment.status === 'ACTIVE' ? 'activated' : 'closed'}`));
});

// Candidate verifies an assessment code and gets the lobby info
export const verifyAssessmentCode = asyncHandler(async (req, res) => {
    const { code } = req.params;
    const candidateId = req.user?.id || req.user?._id;

    const assessment = await Assessment.findOne({ assessmentCode: code.trim().toUpperCase() })
        .populate('role', 'title description')
        .populate('company', 'name');

    if (!assessment) {
        throw new ApiError(404, 'Invalid assessment code. Please check and try again.');
    }

    if (assessment.status === 'CLOSED') {
        throw new ApiError(403, 'This assessment has been closed by the recruiter.');
    }

    // 1. Time Window Validation
    const now = new Date();
    if (assessment.closingTime && now > new Date(assessment.closingTime)) {
        throw new ApiError(403, `Assessment has expired. The access window closed on: ${new Date(assessment.closingTime).toLocaleString()}`);
    }

    const isNotOpenYet = assessment.openingTime && now < new Date(assessment.openingTime);

    // 2. Candidate Eligibility Validation (Invite-Only Assessments)
    if (assessment.accessType === 'INVITE_ONLY' && candidateId) {
        const candidate = await Candidate.findById(candidateId);
        const candidateEmail = candidate?.email?.trim().toLowerCase();
        const allowedEmails = (assessment.eligibleEmails || []).map(e => (e || '').trim().toLowerCase());
        if (!candidateEmail || !allowedEmails.includes(candidateEmail)) {
            throw new ApiError(403, 'Access Restricted: You are not authorized for this private assessment. Please contact the company recruiter.');
        }
    }

    // 3. Duplicate participation: block if any completed session exists for this assessment
    let inProgressSession = null;
    if (candidateId) {
        const completedSession = await InterviewSession.findOne({
            candidate: candidateId,
            assessment: assessment._id,
            status: 'COMPLETED'
        });

        if (completedSession) {
            throw new ApiError(403, 'Assessment already completed. Duplicate assessment attempts are not permitted.');
        }

        inProgressSession = await InterviewSession.findOne({
            candidate: candidateId,
            assessment: assessment._id,
            status: 'IN_PROGRESS'
        });
    }

    // send back safe lobby data (no prompt blueprints or internal secrets)
    const lobbyData = {
        _id: assessment._id,
        title: assessment.title,
        assessmentType: assessment.assessmentType || 'COMPANY',
        companyName: assessment.targetCompanyName || assessment.company?.name || 'Hiring Team',
        roleTitle: assessment.targetRoleTitle || assessment.role?.title || 'Software Engineer',
        roleDescription: assessment.role?.description || '',
        skills: assessment.skills || [],
        experienceLevel: assessment.experienceLevel || 'Entry',
        durationMinutes: assessment.durationMinutes || 30,
        assessmentCode: assessment.assessmentCode,
        openingTime: assessment.openingTime,
        closingTime: assessment.closingTime,
        isNotOpenYet: !!isNotOpenYet,
        accessType: assessment.accessType,
        codingRoundEnabled: assessment.codingRoundEnabled !== false,
        voiceRoundEnabled: assessment.voiceRoundEnabled !== false,
        hasInProgressSession: !!inProgressSession
    };

    res.json(new ApiResponse(200, lobbyData, 'Assessment verified successfully'));
});


// Company invites candidates via email with automated magic links
export const inviteCandidates = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { emails, customMessage } = req.body;

    if (!emails || (Array.isArray(emails) && emails.length === 0)) {
        throw new ApiError(400, 'At least one candidate email is required');
    }

    const assessment = await Assessment.findOne({ _id: id, company: req.user.id })
        .populate('role', 'title')
        .populate('company', 'name');

    if (!assessment) {
        throw new ApiError(404, 'Assessment not found or unauthorized');
    }

    // Support either array of emails or comma-separated string
    const emailList = Array.isArray(emails)
        ? emails.map(e => e.trim()).filter(Boolean)
        : emails.split(/[\n,;]+/).map(e => e.trim()).filter(Boolean);

    const results = [];
    for (const email of emailList) {
        try {
            const inviteRes = await sendAssessmentInvite({
                candidateEmail: email,
                companyName: assessment.companyName || assessment.company?.name || 'Company',
                roleTitle: assessment.roleTitle || assessment.role?.title || 'Software Engineer',
                assessmentTitle: assessment.title,
                assessmentCode: assessment.assessmentCode,
                durationMinutes: assessment.durationMinutes,
                customMessage
            });
            results.push({
                email,
                success: true,
                magicLink: inviteRes.magicLink,
                previewUrl: inviteRes.previewUrl
            });
        } catch (err) {
            results.push({
                email,
                success: false,
                error: err.message
            });
        }
    }

    // Automatically authorize invited emails in assessment eligibleEmails list
    const newEligible = new Set([...(assessment.eligibleEmails || []), ...emailList.map(e => e.toLowerCase())]);
    assessment.eligibleEmails = Array.from(newEligible);
    await assessment.save();

    const frontendUrl = getFrontendUrl();
    res.status(200).json(new ApiResponse(200, {
        assessmentCode: assessment.assessmentCode,
        magicLink: `${frontendUrl}/candidate/assessment/${assessment.assessmentCode}`,
        invitations: results
    }, `Invitations processed for ${results.length} candidate(s)`));
});

