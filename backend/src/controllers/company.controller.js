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

    const seenCompletedKeys = new Set();

    for (const session of sessions) {
        let ev = evalMap.get(session._id.toString());
        const effectiveStatus = await reconcileInterviewSessionStatus(session);

        const candId = session.candidate?._id || session.candidate;
        const asmtId = session.assessment?._id || session.assessment;

        // If session is completed but no eval was mapped directly to this sessionId,
        // lookup any evaluation created for this session or candidate+assessment
        if (effectiveStatus !== 'IN_PROGRESS' && !ev) {
            ev = await Evaluation.findOne({
                $or: [
                    { session: session._id },
                    { candidate: candId, assessment: asmtId }
                ]
            });
        }

        const item = {
            _id: session._id,
            sessionId: session._id,
            candidateName: session.candidate?.name || 'Candidate',
            candidateEmail: session.candidate?.email || 'N/A',
            assessmentId: asmtId,
            assessmentTitle: session.assessment?.title || session.assessment?.roleTitle || 'Assessment',
            assessmentCode: session.assessment?.assessmentCode,
            status: effectiveStatus,
            currentStage: session.stage,
            startedAt: session.startedAt || session.createdAt,
            updatedAt: session.updatedAt,
            hasReport: !!ev && ev.status === 'COMPLETED',
            evaluationStatus: ev ? ev.status : 'NONE', // 'NONE' | 'PENDING' | 'COMPLETED' | 'FAILED'
            evaluationId: ev ? ev._id : null,
            score: ev?.scores?.overall ?? null
        };

        if (effectiveStatus === 'IN_PROGRESS') {
            ongoing.push(item);
        } else {
            const key = `${candId?.toString()}_${asmtId?.toString()}`;
            // If we have seen a completed record for this candidate and assessment, keep the one with a report/higher score
            if (!seenCompletedKeys.has(key)) {
                seenCompletedKeys.add(key);
                completed.push(item);
            } else if (item.hasReport) {
                // Replace existing entry if current item has a valid report and previous didn't
                const existingIdx = completed.findIndex(c => `${c.candidateEmail}_${c.assessmentCode}` === `${item.candidateEmail}_${item.assessmentCode}`);
                if (existingIdx !== -1 && !completed[existingIdx].hasReport) {
                    completed[existingIdx] = item;
                }
            }
        }
    }

    res.json(new ApiResponse(200, { ongoing, completed }, "Company interviews fetched successfully"));
});
