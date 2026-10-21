import { Role } from '../models/role.model.js';
import { Assessment } from '../models/assessment.model.js';
import { InterviewSession } from '../models/interviewSession.model.js';
import { Evaluation } from '../models/evaluation.model.js';
import '../models/candidate.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { reconcileInterviewSessionStatus } from '../utils/reconcileInterviewSession.js';

export const getRoles = asyncHandler(async (req, res) => {
    const roles = await Role.find({ company: req.user.id });
    res.json(new ApiResponse(200, roles, "Roles fetched successfully"));
});

export const createRole = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    const role = await Role.create({
        company: req.user.id,
        title,
        description
    });
    res.status(201).json(new ApiResponse(201, role, "Role created successfully"));
});

export const updateRole = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    const role = await Role.findOneAndUpdate(
        { _id: req.params.id, company: req.user.id },
        { title, description },
        { new: true }
    );
    if (!role) {
        throw new ApiError(404, 'Role not found');
    }
    res.json(new ApiResponse(200, role, "Role updated successfully"));
});

export const deleteRole = asyncHandler(async (req, res) => {
    const role = await Role.findOneAndDelete({ _id: req.params.id, company: req.user.id });
    if (!role) {
        throw new ApiError(404, 'Role not found');
    }
    res.json(new ApiResponse(200, null, "Role deleted successfully"));
});

export const getCompanyInterviews = asyncHandler(async (req, res) => {
    const companyId = req.user.id;

    // 1. Find all assessments owned by this company
    const assessments = await Assessment.find({ company: companyId }).select('_id title roleTitle assessmentCode');
    const assessmentIds = assessments.map(a => a._id);

    // 2. Fetch all interview sessions for these assessments (excluding practice sessions)
    const sessions = await InterviewSession.find({
        assessment: { $in: assessmentIds },
        isPractice: { $ne: true }
    })
    .populate('candidate', 'name email skills')
    .populate('assessment', 'title roleTitle assessmentCode')
    .sort({ updatedAt: -1 });

    // 3. Find associated evaluations
    const sessionIds = sessions.map(s => s._id);
    const evaluations = await Evaluation.find({ session: { $in: sessionIds } });
    const evalMap = new Map();
    evaluations.forEach(ev => {
        evalMap.set(ev.session.toString(), ev);
    });

    const ongoing = [];
    const completed = [];

    for (const session of sessions) {
        const ev = evalMap.get(session._id.toString());
        const item = {
            _id: session._id,
            sessionId: session._id,
            candidateName: session.candidate?.name || 'Candidate',
            candidateEmail: session.candidate?.email || 'N/A',
            assessmentId: session.assessment?._id,
            assessmentTitle: session.assessment?.title || session.assessment?.roleTitle || 'Assessment',
            assessmentCode: session.assessment?.assessmentCode,
            status: session.status,
            currentStage: session.stage,
            startedAt: session.startedAt || session.createdAt,
            updatedAt: session.updatedAt,
            hasReport: !!ev && ev.status === 'COMPLETED',
            evaluationStatus: ev ? ev.status : 'NONE', // 'NONE' | 'PENDING' | 'COMPLETED' | 'FAILED'
            evaluationId: ev ? ev._id : null,
            score: ev?.scores?.overall ?? null
        };

        const effectiveStatus = await reconcileInterviewSessionStatus(session);
        item.status = effectiveStatus;

        if (effectiveStatus === 'IN_PROGRESS') {
            ongoing.push(item);
        } else {
            completed.push(item);
        }
    }

    res.json(new ApiResponse(200, { ongoing, completed }, "Company interviews fetched successfully"));
});
