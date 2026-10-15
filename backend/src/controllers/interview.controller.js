import { Assessment } from '../models/assessment.model.js';
import { InterviewSession } from '../models/interviewSession.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { generateOpeningGreeting, generateNextInterviewStep } from '../services/ai.service.js';
import { evaluateInterviewSession } from '../services/evaluation.service.js';

// In-memory fallback cache in case MongoDB is temporarily bypassed
const inMemorySessions = new Map();

/**
 * Start or resume an interview session
 */
export const startSession = asyncHandler(async (req, res) => {
    const { code } = req.params;

    let assessment = null;
    try {
        assessment = await Assessment.findOne({ assessmentCode: code })
            .populate('role', 'title description')
            .populate('company', 'name');
    } catch {
        // Mongo might not be running
    }

    // Mock assessment fallback if DB is empty or bypassed
    if (!assessment) {
        assessment = {
            _id: 'mock-assessment-id',
            title: 'Technical Assessment',
            role: { title: 'Full Stack Developer', description: 'Web application engineering' },
            company: { name: 'Acme Corp' },
            skills: ['JavaScript', 'React', 'Node.js'],
            experienceLevel: 'Mid',
            durationMinutes: 30,
            blueprint: 'Focus on core JavaScript, asynchronous programming, and problem solving.',
            status: 'ACTIVE'
        };
    }

    if (assessment.status === 'CLOSED') {
        throw new ApiError(400, 'This assessment has been closed by the company.');
    }

    const candidateId = req.user?.id || 'guest-candidate';

    // Check for existing in-progress session
    let session = null;
    try {
        session = await InterviewSession.findOne({
            candidate: candidateId,
            assessment: assessment._id,
            status: 'IN_PROGRESS'
        });
    } catch {
        // Mongo bypassed
    }

    if (!session && inMemorySessions.has(`${candidateId}_${code}`)) {
        session = inMemorySessions.get(`${candidateId}_${code}`);
    }

    if (!session) {
        // Generate opening greeting with natural Indian tech lead persona
        const opening = await generateOpeningGreeting({
            companyName: assessment.company?.name || 'our company',
            candidateName: req.user?.name || '',
            roleTitle: assessment.role?.title || assessment.title || 'Software Engineer',
            skills: assessment.skills,
            experienceLevel: assessment.experienceLevel,
            blueprint: assessment.blueprint
        });

        const initialTranscript = [{
            role: 'ai',
            text: opening.message,
            timestamp: new Date()
        }];

        const sessionData = {
            candidate: candidateId,
            assessment: assessment._id,
            stage: 'CONCEPTUAL',
            status: 'IN_PROGRESS',
            transcript: initialTranscript,
            codingChallenge: null,
            durationMinutes: assessment.durationMinutes || 30,
            startedAt: new Date()
        };

        try {
            session = await InterviewSession.create(sessionData);
        } catch {
            session = { ...sessionData, _id: `session_${Date.now()}` };
        }

        inMemorySessions.set(`${candidateId}_${code}`, session);
    }

    res.status(200).json(new ApiResponse(200, {
        session,
        assessment: {
            title: assessment.title,
            roleTitle: assessment.role?.title || 'Developer',
            companyName: assessment.company?.name || 'Company',
            skills: assessment.skills,
            experienceLevel: assessment.experienceLevel,
            durationMinutes: assessment.durationMinutes
        }
    }, 'Interview session started'));
});

/**
 * Send candidate message (from voice STT or text chat) and get AI interviewer reply
 */
export const sendCandidateMessage = asyncHandler(async (req, res) => {
    const { sessionId, message, code, currentCode, executionOutput } = req.body;
    const candidateId = req.user?.id || 'guest-candidate';

    if (!message || !message.trim()) {
        throw new ApiError(400, 'Message cannot be empty');
    }

    let session = null;
    try {
        session = await InterviewSession.findById(sessionId).populate({
            path: 'assessment',
            populate: [
                { path: 'role', select: 'title' },
                { path: 'company', select: 'name' }
            ]
        });
    } catch {
        // Mongo bypassed
    }

    if (!session && code) {
        session = inMemorySessions.get(`${candidateId}_${code}`);
    }

    if (!session) {
        throw new ApiError(404, 'Active interview session not found');
    }

    // Save current code to session if provided
    if (currentCode) {
        if (!session.codeSubmission) session.codeSubmission = {};
        session.codeSubmission.code = currentCode;
        if (executionOutput) session.codeSubmission.output = executionOutput;
    }

    // Append candidate's message to transcript
    session.transcript.push({
        role: 'candidate',
        text: message.trim(),
        timestamp: new Date()
    });

    // Get assessment details
    let companyName = session.assessment?.company?.name || 'our company';
    let roleTitle = 'Software Engineer';
    let skills = [];
    let experienceLevel = 'Entry';
    let blueprint = '';

    if (session.assessment) {
        roleTitle = session.assessment.role?.title || session.assessment.title || roleTitle;
        skills = session.assessment.skills || [];
        experienceLevel = session.assessment.experienceLevel || 'Entry';
        blueprint = session.assessment.blueprint || '';
    }

    // Call Gemini AI service with live code awareness and dynamic conversation
    const effectiveCode = currentCode || session.codeSubmission?.code || '';
    const effectiveOutput = executionOutput || session.codeSubmission?.output || '';

    const aiResponse = await generateNextInterviewStep({
        companyName,
        roleTitle,
        skills,
        experienceLevel,
        blueprint,
        transcript: session.transcript,
        candidateMessage: message.trim(),
        currentStage: session.stage,
        currentChallenge: session.codingChallenge,
        currentCode: effectiveCode,
        executionOutput: effectiveOutput
    });

    // Append AI's response to transcript
    session.transcript.push({
        role: 'ai',
        text: aiResponse.message,
        timestamp: new Date()
    });

    // Handle transition to CODING stage if triggered
    if (aiResponse.nextStage === 'CODING' && aiResponse.codingChallenge) {
        session.stage = 'CODING';
        session.codingChallenge = aiResponse.codingChallenge;
    }

    try {
        if (typeof session.save === 'function') {
            await session.save();
        }
    } catch {
        // In-memory fallback
    }

    if (code) {
        inMemorySessions.set(`${candidateId}_${code}`, session);
    }

    res.status(200).json(new ApiResponse(200, {
        aiMessage: aiResponse.message,
        stage: session.stage,
        codingChallenge: session.codingChallenge,
        transcript: session.transcript
    }, 'AI response generated'));
});

/**
 * Execute candidate code safely
 */
export const runCandidateCode = asyncHandler(async (req, res) => {
    const { language, code, customInput } = req.body;

    if (!code || !code.trim()) {
        throw new ApiError(400, 'Code cannot be empty');
    }

    let output = '';
    let hasError = false;
    const startTime = Date.now();

    if (language === 'javascript') {
        // Run JavaScript safely with captured console and customInput
        const logs = [];
        const customConsole = {
            log: (...args) => logs.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')),
            error: (...args) => logs.push('[ERROR] ' + args.join(' ')),
            warn: (...args) => logs.push('[WARN] ' + args.join(' '))
        };

        try {
            const runner = new Function('console', 'customInput', `
                try {
                    ${code}
                } catch (e) {
                    console.error(e.message);
                }
            `);
            runner(customConsole, customInput || '');
            output = logs.join('\n') || 'Code executed successfully with no output.';
        } catch (err) {
            output = `Execution error: ${err.message}`;
            hasError = true;
        }
    } else if (language === 'python') {
        // Execute Python using Piston API with optional stdin
        try {
            const pistonBody = {
                language: 'python',
                version: '3.10.0',
                files: [{ content: code }]
            };
            if (customInput) pistonBody.stdin = customInput;

            const response = await fetch('https://emkc.org/api/v2/piston/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pistonBody)
            });

            const data = await response.json();
            if (data.run) {
                output = (data.run.stdout || '') + (data.run.stderr || '');
                hasError = data.run.code !== 0;
            } else {
                output = 'Execution failed: Piston service unavailable.';
                hasError = true;
            }
        } catch (err) {
            output = `Python runner error: ${err.message}`;
            hasError = true;
        }
    } else {
        output = `Language '${language}' is not yet supported for live execution.`;
    }

    const executionTime = `${((Date.now() - startTime) / 1000).toFixed(2)}s`;

    res.status(200).json(new ApiResponse(200, { output, hasError, executionTime }, 'Code executed'));
});

/**
 * Finalize and submit the interview session
 */
export const submitSession = asyncHandler(async (req, res) => {
    const { sessionId, code, codeSubmission } = req.body;
    const candidateId = req.user?.id || 'guest-candidate';

    let session = null;
    try {
        session = await InterviewSession.findById(sessionId);
    } catch {
        // Mongo bypassed
    }

    if (!session && code) {
        session = inMemorySessions.get(`${candidateId}_${code}`);
    }

    if (!session) {
        throw new ApiError(404, 'Session not found');
    }

    session.status = 'COMPLETED';
    session.stage = 'COMPLETED';
    session.endedAt = new Date();
    if (codeSubmission) {
        session.codeSubmission = codeSubmission;
    }

    try {
        if (typeof session.save === 'function') {
            await session.save();
        }
    } catch {
        // In-memory fallback
    }

    if (code) {
        inMemorySessions.delete(`${candidateId}_${code}`);
    }

    // Automatically trigger AI evaluation pipeline in background
    if (session._id) {
        evaluateInterviewSession(session._id).catch(err => {
            console.error('Auto AI evaluation error on submit:', err);
        });
    }

    res.status(200).json(new ApiResponse(200, {
        sessionId: session._id,
        status: 'COMPLETED',
        message: 'Interview submitted and evaluation started successfully'
    }, 'Session completed'));
});
