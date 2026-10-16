import { Assessment } from '../models/assessment.model.js';
import { Role } from '../models/role.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendAssessmentInvite } from '../services/email.service.js';

// helper to generate a unique assessment code like "ASMT-7821-9043"
const generateCode = () => {
    const random4 = () => Math.floor(1000 + Math.random() * 9000); // 4 digit random
    return `ASMT-${random4()}-${random4()}`;
};

// Company creates a new assessment
export const createAssessment = asyncHandler(async (req, res) => {
    const { roleId, title, skills, experienceLevel, durationMinutes, blueprint } = req.body;

    if (!roleId || !title) {
        throw new ApiError(400, 'Role and title are required');
    }

    // make sure the role actually belongs to this company
    const role = await Role.findOne({ _id: roleId, company: req.user.id });
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

    const assessment = await Assessment.create({
        company: req.user.id,
        role: roleId,
        title,
        skills: skills || [],
        experienceLevel: experienceLevel || 'Entry',
        durationMinutes: durationMinutes || 30,
        blueprint: blueprint || '',
        assessmentCode
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

    const assessment = await Assessment.findOne({ assessmentCode: code })
        .populate('role', 'title description')
        .populate('company', 'name');

    if (!assessment) {
        throw new ApiError(404, 'Invalid assessment code. Please check and try again.');
    }

    if (assessment.status === 'CLOSED') {
        throw new ApiError(400, 'This assessment is no longer accepting candidates.');
    }

    // send back only what the candidate needs to see (no blueprint — that's for the AI later)
    const lobbyData = {
        _id: assessment._id,
        title: assessment.title,
        companyName: assessment.company.name,
        roleTitle: assessment.role.title,
        skills: assessment.skills,
        experienceLevel: assessment.experienceLevel,
        durationMinutes: assessment.durationMinutes,
        assessmentCode: assessment.assessmentCode
    };

    res.json(new ApiResponse(200, lobbyData, 'Assessment found'));
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

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.status(200).json(new ApiResponse(200, {
        assessmentCode: assessment.assessmentCode,
        magicLink: `${frontendUrl}/candidate/assessment/${assessment.assessmentCode}`,
        invitations: results
    }, `Invitations processed for ${results.length} candidate(s)`));
});

