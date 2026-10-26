import { Assessment } from '../models/assessment.model.js';
import { Candidate } from '../models/candidate.model.js';
import { Company } from '../models/company.model.js';
import { Role } from '../models/role.model.js';
import { InterviewSession } from '../models/interviewSession.model.js';
import { Evaluation } from '../models/evaluation.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { generateOpeningGreeting, generateNextInterviewStep } from '../services/ai.service.js';
import { evaluateInterviewSession } from '../services/evaluation.service.js';
import { executeCodeSandbox } from '../services/sandbox.service.js';
import {
    buildInitialStateMachine,
    stateMachineToLegacyFields,
    applyStateActionToMachine
} from '../utils/interviewStateMachine.js';
import {
    closeDuplicateInProgressSessions,
    reconcileInterviewSessionStatus
} from '../utils/reconcileInterviewSession.js';

// Helper to ensure a dedicated default Practice Assessment exists in the system
const getOrCreatePracticeAssessment = async () => {
    let practiceAssessment = await Assessment.findOne({ assessmentCode: 'PRACTICE-MOCK-SESSION' });
    if (!practiceAssessment) {
        // Find or create default demo company and role
        let demoCompany = await Company.findOne({ email: 'recruiter@acme.ai' });
        if (!demoCompany) {
            demoCompany = await Company.create({
                name: 'VoxCode Practice Lab',
                email: 'practice@voxcode.internal',
                password: 'PracticePassword123!',
                role: 'COMPANY'
            });
        }
        let demoRole = await Role.findOne({ company: demoCompany._id, title: 'Full Stack Engineer' });
        if (!demoRole) {
            demoRole = await Role.create({
                company: demoCompany._id,
                title: 'Full Stack Engineer',
                description: 'General Engineering & Algorithms Practice'
            });
        }
        practiceAssessment = await Assessment.create({
            company: demoCompany._id,
            role: demoRole._id,
            title: 'Technical Practice Mock Interview',
            skills: ['JavaScript', 'System Fundamentals', 'Data Structures & Algorithms'],
            experienceLevel: 'Mid',
            durationMinutes: 30,
            blueprint: 'Simulate realistic Indian engineering lead technical interview covering fundamentals, architectural trade-offs, and practical coding challenge.',
            assessmentCode: 'PRACTICE-MOCK-SESSION',
            status: 'ACTIVE',
            accessType: 'PUBLIC',
            codingRoundEnabled: true,
            voiceRoundEnabled: true
        });
    }
    return practiceAssessment;
};

/**
 * Start or resume a real candidate assessment interview session
 * Enforces strict backend validation:
 * 1. Assessment existence & status
 * 2. Opening & closing validity windows
 * 3. Candidate authorization/eligibility
 * 4. FIX CHANGE H: Reject if already COMPLETED. Cannot resume completed interviews!
 */
export const startSession = asyncHandler(async (req, res) => {
    const rawCode = req.params.code || req.body.code || req.body.assessmentCode;
    const { resumeText } = req.body || {};
    const candidateId = req.user?.id || req.user?._id;

    if (!candidateId) {
        throw new ApiError(401, 'Unauthorized: Candidate login required');
    }

    const cleanCode = rawCode ? rawCode.trim().toUpperCase() : '';
    const assessment = await Assessment.findOne({ assessmentCode: cleanCode })
        .populate('role', 'title description')
        .populate('company', 'name');

    if (!assessment) {
        throw new ApiError(404, 'Assessment not found. Please check your assessment code.');
    }

    if (assessment.status === 'CLOSED') {
        throw new ApiError(403, 'This assessment has been closed by the recruiter.');
    }

    // 1. Validate Time Window
    const now = new Date();
    // Allow 2-minute clock skew grace period so candidate's system clock differences don't lock them out
    if (assessment.openingTime && (new Date(assessment.openingTime).getTime() - now.getTime()) > 120000) {
        throw new ApiError(403, `Assessment is not open yet. Opening time is scheduled for: ${new Date(assessment.openingTime).toLocaleString()}`);
    }
    if (assessment.closingTime && now > new Date(assessment.closingTime)) {
        throw new ApiError(403, `Assessment has expired. The access window closed on: ${new Date(assessment.closingTime).toLocaleString()}`);
    }

    // 2. Validate Candidate Eligibility (Invite-Only Assessments)
    if (assessment.accessType === 'INVITE_ONLY') {
        const candidate = await Candidate.findById(candidateId);
        const email = candidate?.email?.trim().toLowerCase();
        const allowedEmails = (assessment.eligibleEmails || []).map(e => (e || '').trim().toLowerCase());
        if (!email || !allowedEmails.includes(email)) {
            throw new ApiError(403, 'Access Restricted: You are not authorized for this private assessment. Please contact the recruiter.');
        }
    }

    // Retrieve or persist candidate resume
    let candidateResume = (resumeText || '').trim();
    if (!candidateResume && candidateId !== 'guest-candidate') {
        try {
            const candDoc = await Candidate.findById(candidateId).select('resumeText');
            if (candDoc?.resumeText) {
                candidateResume = candDoc.resumeText.trim();
            }
        } catch {
            // Mongo bypassed
        }
    } else if (candidateResume && candidateId !== 'guest-candidate') {
        try {
            await Candidate.findByIdAndUpdate(candidateId, { resumeText: candidateResume });
        } catch {
            // Mongo bypassed
        }
    }

    // Candidate MUST have uploaded a resume
    if (!candidateResume) {
        throw new ApiError(400, 'Resume is required to start this interview. Please upload or paste your resume in the assessment lobby.');
    }

    // 3. Interview Format is 100% determined by Company Assessment Blueprint (never candidate choice)
    let selectedFormat = 'FULL_INTERVIEW';
    if (assessment.interviewFormat) {
        selectedFormat = assessment.interviewFormat;
    } else if (assessment.blueprintAnalysis?.interviewFormat) {
        selectedFormat = assessment.blueprintAnalysis.interviewFormat;
    } else if (assessment.codingRoundEnabled === false) {
        selectedFormat = 'PROJECT_AND_TECHNICAL_ONLY';
    }

    // 4. FIX CHANGE H (Resume-Interview Bug):
    // Check if candidate already completed this assessment. If so, REJECT!
    const completedSession = await InterviewSession.findOne({
        candidate: candidateId,
        assessment: assessment._id,
        status: 'COMPLETED'
    });

    if (completedSession) {
        throw new ApiError(403, 'Assessment already completed. Completed assessments cannot be resumed or restarted.');
    }

    // 5. Check for existing IN_PROGRESS session
    let session = await InterviewSession.findOne({
        candidate: candidateId,
        assessment: assessment._id,
        status: 'IN_PROGRESS'
    });

    // 6. If no active session, initialize a new one with AI opening greeting
    if (!session) {
        const candidate = await Candidate.findById(candidateId);
        const companyName = assessment.targetCompanyName || assessment.company?.name || 'our company';
        const roleTitle = assessment.targetRoleTitle || assessment.role?.title || assessment.title || 'Software Engineer';

        const opening = await generateOpeningGreeting({
            companyName,
            candidateName: candidate?.name || req.user?.name || '',
            roleTitle,
            skills: assessment.skills,
            experienceLevel: assessment.experienceLevel,
            blueprint: assessment.blueprint || assessment.scrapedBlueprint || '',
            blueprintAnalysis: assessment.blueprintAnalysis || null,
            candidateResume,
            interviewFormat: selectedFormat
        });

        const initialTranscript = [{
            role: 'ai',
            text: opening.message,
            timestamp: new Date()
        }];

        const stateMachine = buildInitialStateMachine({
            skills: assessment.skills,
            codingEnabled: selectedFormat !== 'PROJECT_AND_TECHNICAL_ONLY' && assessment.codingRoundEnabled !== false
        });
        const { topics, currentTopicIndex, questionsInCurrentTopic } =
            stateMachineToLegacyFields(stateMachine);

        session = await InterviewSession.create({
            candidate: candidateId,
            assessment: assessment._id,
            isPractice: false,
            stage: 'CONCEPTUAL',
            status: 'IN_PROGRESS',
            stateMachine,
            topics,
            currentTopicIndex,
            questionsInCurrentTopic,
            transcript: initialTranscript,
            codingChallenge: null,
            candidateResume,
            interviewFormat: selectedFormat,
            durationMinutes: assessment.durationMinutes || 30,
            startedAt: new Date()
        });
    } else {
        await reconcileInterviewSessionStatus(session);
        session = await InterviewSession.findById(session._id);
        if (session.status === 'COMPLETED') {
            throw new ApiError(403, 'Assessment already completed. Completed assessments cannot be resumed or restarted.');
        }
    }

    res.status(200).json(new ApiResponse(200, {
        session,
        assessment: {
            _id: assessment._id,
            title: assessment.title,
            assessmentType: assessment.assessmentType || 'COMPANY',
            roleTitle: assessment.targetRoleTitle || assessment.role?.title || 'Developer',
            companyName: assessment.targetCompanyName || assessment.company?.name || 'Company',
            skills: assessment.skills,
            experienceLevel: assessment.experienceLevel,
            durationMinutes: assessment.durationMinutes,
            assessmentCode: assessment.assessmentCode,
            codingRoundEnabled: selectedFormat !== 'PROJECT_AND_TECHNICAL_ONLY' && assessment.codingRoundEnabled !== false,
            voiceRoundEnabled: assessment.voiceRoundEnabled
        }
    }, 'Interview session active'));
});

/**
 * Dedicated Practice Mock Interview flow (CHANGE C)
 * Completely separated from real company assessments so practice attempts
 * never consume or modify candidate's real assessment attempts.
 */
export const startPracticeSession = asyncHandler(async (req, res) => {
    const candidateId = req.user?.id || req.user?._id;
    if (!candidateId) {
        throw new ApiError(401, 'Unauthorized: Candidate login required');
    }

    const practiceAssessment = await getOrCreatePracticeAssessment();
    const candidate = await Candidate.findById(candidateId);

    // Check if candidate already has an in-progress practice session
    let session = await InterviewSession.findOne({
        candidate: candidateId,
        assessment: practiceAssessment._id,
        isPractice: true,
        status: 'IN_PROGRESS'
    });

    if (!session) {
        const opening = await generateOpeningGreeting({
            companyName: 'VoxCode Autonomous Practice Studio',
            candidateName: candidate?.name || req.user?.name || '',
            roleTitle: 'Full Stack Engineer (Practice Round)',
            skills: ['JavaScript', 'System Architecture', 'DSA'],
            experienceLevel: 'Mid',
            blueprint: practiceAssessment.blueprint
        });

        const initialTranscript = [{
            role: 'ai',
            text: opening.message,
            timestamp: new Date()
        }];

        const stateMachine = buildInitialStateMachine({
            skills: practiceAssessment.skills,
            codingEnabled: true
        });
        const { topics, currentTopicIndex, questionsInCurrentTopic } =
            stateMachineToLegacyFields(stateMachine);

        session = await InterviewSession.create({
            candidate: candidateId,
            assessment: practiceAssessment._id,
            isPractice: true,
            stage: 'CONCEPTUAL',
            status: 'IN_PROGRESS',
            stateMachine,
            topics,
            currentTopicIndex,
            questionsInCurrentTopic,
            transcript: initialTranscript,
            codingChallenge: null,
            durationMinutes: 30,
            startedAt: new Date()
        });
    }

    res.status(200).json(new ApiResponse(200, {
        session,
        assessment: {
            _id: practiceAssessment._id,
            title: practiceAssessment.title,
            roleTitle: 'Full Stack Engineer',
            companyName: 'VoxCode Practice Studio',
            skills: practiceAssessment.skills,
            experienceLevel: practiceAssessment.experienceLevel,
            durationMinutes: 30,
            assessmentCode: practiceAssessment.assessmentCode,
            codingRoundEnabled: true,
            voiceRoundEnabled: true
        }
    }, 'Practice session started'));
});


/**
 * Send candidate message (from voice STT or text chat) and get AI interviewer reply
 */
export const sendCandidateMessage = asyncHandler(async (req, res) => {
    const sessionId = req.params.sessionId || req.body.sessionId;
    const rawMessage = req.body.message !== undefined ? req.body.message : req.body.answer;
    const { currentCode, executionOutput } = req.body;
    const candidateId = req.user?.id || req.user?._id;

    if (!sessionId) {
        throw new ApiError(400, 'Session ID is required');
    }

    if (!rawMessage || !String(rawMessage).trim()) {
        throw new ApiError(400, 'Message cannot be empty');
    }

    const message = String(rawMessage).trim();

    const session = await InterviewSession.findById(sessionId).populate({
        path: 'assessment',
        populate: [
            { path: 'role', select: 'title' },
            { path: 'company', select: 'name' }
        ]
    });

    if (!session) {
        throw new ApiError(404, 'Active interview session not found');
    }

    // Ownership check: session must belong to the authenticated candidate
    if (String(session.candidate) !== String(candidateId)) {
        throw new ApiError(403, 'Unauthorized access to this interview session');
    }

    // Reject answer if interview was already submitted/completed
    if (session.status === 'COMPLETED') {
        throw new ApiError(403, 'Interview session has already completed. No further responses can be submitted.');
    }

    // Save current code to session if provided
    if (currentCode) {
        if (!session.codeSubmission) session.codeSubmission = {};
        session.codeSubmission.code = currentCode;
        if (executionOutput) session.codeSubmission.output = executionOutput;
    }

    // Assessment details
    const companyName = session.assessment?.targetCompanyName || session.assessment?.company?.name || 'our company';
    let roleTitle = 'Software Engineer';
    let skills = [];
    let experienceLevel = 'Entry';
    let blueprint = '';

    if (session.assessment) {
        roleTitle = session.assessment.targetRoleTitle || session.assessment.role?.title || session.assessment.title || roleTitle;
        skills = session.assessment.skills || [];
        experienceLevel = session.assessment.experienceLevel || 'Entry';
        blueprint = session.assessment.blueprint || session.assessment.scrapedBlueprint || '';
    }

    // Resolve active topics and current state (prefer stored state machine)
    let topics = session.topics && session.topics.length ? session.topics : [];
    let currentTopicIndex = session.currentTopicIndex || 0;
    let questionsInCurrentTopic = session.questionsInCurrentTopic || 0;
    if (session.stateMachine) {
        const legacy = stateMachineToLegacyFields(session.stateMachine);
        topics = legacy.topics.length ? legacy.topics : topics;
        currentTopicIndex = legacy.currentTopicIndex;
        questionsInCurrentTopic = legacy.questionsInCurrentTopic;
    }
    if (!topics.length) {
        topics = [
            skills[0] || 'General Engineering',
            skills[1] || skills[0] || 'General Engineering',
            skills[2] || 'General Engineering'
        ];
    }
    const currentTopicName = topics[Math.min(currentTopicIndex, topics.length - 1)];

    // Call Gemini AI service
    const effectiveCode = currentCode || session.codeSubmission?.code || '';
    const effectiveOutput = executionOutput || session.codeSubmission?.output || '';

    const aiResponse = await generateNextInterviewStep({
        companyName,
        roleTitle,
        skills,
        experienceLevel,
        blueprint,
        blueprintAnalysis: session.assessment?.blueprintAnalysis || null,
        candidateResume: session.candidateResume || '',
        interviewFormat: session.interviewFormat || 'FULL_INTERVIEW',
        transcript: session.transcript,
        candidateMessage: message.trim(),
        currentStage: session.stage,
        currentChallenge: session.codingChallenge,
        currentCode: effectiveCode,
        executionOutput: effectiveOutput,
        topics,
        currentTopicIndex,
        questionsInCurrentTopic,
        stateMachine: session.stateMachine || null
    });

    // Append candidate's message with evaluation and active topic
    session.transcript.push({
        role: 'candidate',
        text: message.trim(),
        timestamp: new Date(),
        evaluation: aiResponse.answerEvaluation || null,
        topic: currentTopicName
    });

    // Append AI's response to transcript
    session.transcript.push({
        role: 'ai',
        text: aiResponse.message,
        timestamp: new Date()
    });

    // State machine topic transition (counts only; LLM supplies stateAction):
    if (session.stateMachine && aiResponse.stateAction) {
        session.stateMachine = applyStateActionToMachine(session.stateMachine, aiResponse.stateAction);
        const legacy = stateMachineToLegacyFields(session.stateMachine);
        session.currentTopicIndex = legacy.currentTopicIndex;
        session.questionsInCurrentTopic = legacy.questionsInCurrentTopic;
        session.topics = legacy.topics;
    } else if (aiResponse.stateAction === 'ADVANCE_TOPIC') {
        session.currentTopicIndex = Math.min(currentTopicIndex + 1, topics.length - 1);
        session.questionsInCurrentTopic = 0;
    } else if (aiResponse.stateAction === 'DRILL_DEEPER') {
        session.questionsInCurrentTopic = questionsInCurrentTopic + 1;
    }

    // Transition to CODING stage if triggered
    if (aiResponse.nextStage === 'CODING' && aiResponse.codingChallenge) {
        session.stage = 'CODING';
        session.codingChallenge = aiResponse.codingChallenge;
        if (session.stateMachine?.coding) {
            session.stateMachine.coding.entered = true;
            session.stateMachine.phase = 'CODING';
        }
    } else if (aiResponse.nextStage === 'COMPLETED') {
        session.stage = 'COMPLETED';
        session.status = 'COMPLETED';
        session.endedAt = new Date();
        if (session.stateMachine) {
            session.stateMachine.phase = 'COMPLETED';
        }
        if (session._id) {
            evaluateInterviewSession(session._id).catch(err => {
                console.error('Auto AI evaluation error on completion:', err);
            });
        }
    }

    await session.save();

    res.status(200).json(new ApiResponse(200, {
        aiMessage: aiResponse.message,
        stage: session.stage,
        currentTopic: topics[session.currentTopicIndex || 0],
        currentTopicIndex: session.currentTopicIndex || 0,
        totalTopics: topics.length,
        codingChallenge: session.codingChallenge,
        transcript: session.transcript,
        answerEvaluation: aiResponse.answerEvaluation
    }, 'AI response generated'));
});

/**
 * Execute candidate code safely across JavaScript, Python, C++, and Java in isolated sandbox
 */
export const runCandidateCode = asyncHandler(async (req, res) => {
    const { language = 'javascript', code, customInput } = req.body;

    if (!code || !code.trim()) {
        throw new ApiError(400, 'Code cannot be empty');
    }

    const result = await executeCodeSandbox({
        language,
        code,
        customInput: customInput || ''
    });

    res.status(200).json(new ApiResponse(200, {
        output: result.output,
        hasError: result.hasError,
        executionTime: result.executionTime
    }, 'Code executed'));
});

/**
 * Finalize and submit the interview session
 * Idempotent: If already completed, returns existing status without restarting or duplicating.
 */
export const submitSession = asyncHandler(async (req, res) => {
    const sessionId = req.params.sessionId || req.body.sessionId;
    const { codeSubmission } = req.body;
    const candidateId = req.user?.id || req.user?._id;

    if (!sessionId) {
        throw new ApiError(400, 'Session ID is required');
    }

    const session = await InterviewSession.findById(sessionId);
    if (!session) {
        throw new ApiError(404, 'Session not found');
    }

    // Verify candidate ownership
    if (String(session.candidate) !== String(candidateId)) {
        throw new ApiError(403, 'Unauthorized access to this session');
    }

    // If session is already completed, return existing status idempotently
    if (session.status === 'COMPLETED') {
        const existingEval = await Evaluation.findOne({ session: session._id });
        return res.status(200).json(new ApiResponse(200, {
            sessionId: session._id,
            status: 'COMPLETED',
            evaluationId: existingEval?._id || null,
            message: 'Interview was already finalized'
        }, 'Session already completed'));
    }

    session.status = 'COMPLETED';
    session.stage = 'COMPLETED';
    session.endedAt = new Date();
    if (session.stateMachine) {
        session.stateMachine.phase = 'COMPLETED';
    }
    if (codeSubmission) {
        session.codeSubmission = codeSubmission;
    }
    await session.save();

    await closeDuplicateInProgressSessions({
        candidateId: session.candidate,
        assessmentId: session.assessment,
        keepSessionId: session._id
    });

    // Trigger AI evaluation pipeline
    let evaluation = null;
    try {
        evaluation = await evaluateInterviewSession(session._id);
    } catch (err) {
        console.error('Auto AI evaluation error on submit:', err);
    }

    res.status(200).json(new ApiResponse(200, {
        sessionId: session._id,
        status: 'COMPLETED',
        evaluationId: evaluation?._id || null,
        message: 'Interview submitted and evaluation generated successfully'
    }, 'Session completed'));
});

/**
 * Record live proctoring event (tab switch, window blur, code paste, fullscreen exit, etc.)
 */
export const recordProctoringEvent = asyncHandler(async (req, res) => {
    const candidateId = req.user?.id || req.user?._id;
    const { sessionId, eventType, details } = req.body;
    const targetSessionId = req.params.sessionId || sessionId;

    if (!targetSessionId) {
        throw new ApiError(400, 'Session ID is required');
    }

    const session = await InterviewSession.findOne({
        _id: targetSessionId,
        candidate: candidateId
    });

    if (!session) {
        throw new ApiError(404, 'Active interview session not found');
    }

    if (!session.proctoring) {
        session.proctoring = {
            integrityScore: 100,
            tabSwitchCount: 0,
            windowBlurCount: 0,
            pasteCount: 0,
            fullscreenExitCount: 0,
            cameraStatus: 'ACTIVE',
            micStatus: 'ACTIVE',
            events: []
        };
    }

    let penalty = 0;
    switch (eventType) {
        case 'TAB_SWITCH':
            session.proctoring.tabSwitchCount = (session.proctoring.tabSwitchCount || 0) + 1;
            penalty = 8;
            break;
        case 'WINDOW_BLUR':
            session.proctoring.windowBlurCount = (session.proctoring.windowBlurCount || 0) + 1;
            penalty = 3;
            break;
        case 'SUSPICIOUS_PASTE':
            session.proctoring.pasteCount = (session.proctoring.pasteCount || 0) + 1;
            penalty = 12;
            break;
        case 'FULLSCREEN_EXIT':
            session.proctoring.fullscreenExitCount = (session.proctoring.fullscreenExitCount || 0) + 1;
            penalty = 5;
            break;
        case 'DEVTOOLS_ATTEMPT':
            penalty = 15;
            break;
        case 'CAMERA_OFF':
            session.proctoring.cameraStatus = 'DISABLED';
            penalty = 10;
            break;
        case 'FACE_ABSENT':
        case 'NO_FACE_DETECTED':
            session.proctoring.faceMissingCount = (session.proctoring.faceMissingCount || 0) + 1;
            penalty = 6;
            break;
        case 'FACE_OBSTRUCTED':
            session.proctoring.faceMissingCount = (session.proctoring.faceMissingCount || 0) + 1;
            penalty = 5;
            break;
        case 'MULTIPLE_FACES':
            session.proctoring.multipleFacesCount = (session.proctoring.multipleFacesCount || 0) + 1;
            penalty = 12;
            break;
        case 'AUDIO_ANOMALY':
            penalty = 5;
            break;
        default:
            penalty = 2;
    }

    session.proctoring.integrityScore = Math.max(0, (session.proctoring.integrityScore || 100) - penalty);
    session.proctoring.events.push({
        type: eventType,
        timestamp: new Date(),
        details: details || '',
        penalty
    });

    await session.save();

    res.status(200).json(new ApiResponse(200, {
        integrityScore: session.proctoring.integrityScore,
        tabSwitchCount: session.proctoring.tabSwitchCount,
        pasteCount: session.proctoring.pasteCount,
        blurCount: session.proctoring.windowBlurCount
    }, 'Proctoring telemetry recorded'));
});
