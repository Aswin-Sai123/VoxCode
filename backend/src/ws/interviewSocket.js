import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { InterviewSession } from '../models/interviewSession.model.js';
import { streamTTSChunks } from '../services/tts.service.js';
import { transcribeAudioBuffer } from '../services/stt.service.js';
import { generateNextInterviewStep } from '../services/ai.service.js';
import { scoreSingleAnswer } from '../services/evaluation.service.js';
import { updateCandidateProfile } from '../utils/candidateProfileTracker.js';
import { getActivePhaseInfo, buildDefaultTimeline } from '../utils/blueprintParser.js';

/**
 * Generates natural interviewer observation commentary on live code
 */
export async function generateCodeObservation(code, language = 'javascript', session = {}) {
    if (!code || typeof code !== 'string' || code.trim().length < 15) {
        return '';
    }

    const problemTitle = session?.codingChallenge?.title || session?.currentCodingProblem?.title || 'the coding challenge';

    if (process.env.NODE_ENV !== 'test' && process.env.GEMINI_API_KEY) {
        const prompt = `You're an interviewer watching someone code live. Problem: "${problemTitle}"
Code so far (${language}):
\`\`\`${language}
${code}
\`\`\`

If there's something worth saying (approach choice, potential bug, good pattern): say it in 1-2 casual sentences.
If nothing notable, return empty string.
Sound human, not like a code reviewer. Follow human speech directives (use contractions, natural observation).`;

        try {
            const resp = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': process.env.GEMINI_API_KEY
                },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
                signal: AbortSignal.timeout(10000)
            });
            const data = await resp.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text && text.trim()) return text.trim();
        } catch (err) {
            console.warn('[generateCodeObservation] Gemini error:', err.message);
        }
    }

    // Deterministic rule-based observation
    const trimmed = code.trim();
    if (/\b(Map|Set|dict|hash|seen)\b/i.test(trimmed)) {
        return "Nice approach using a hash map here — that keeps lookups down to O(1).";
    }
    if (/\b(stack|push|pop)\b/i.test(trimmed) && /valid|paren|bracket/i.test(problemTitle + trimmed)) {
        return "Good call on using a stack; that's the standard idiom for matching nested structures.";
    }
    if (/for\s*\(.*?\)\s*\{[\s\S]*?for\s*\(.*?\)/.test(trimmed)) {
        return "I see the nested loop structure; once you have the baseline working, we can think about how to optimize that.";
    }
    if (/\b(while\s*\(left\s*<=\s*right\)|while\s*\(l\s*<=\s*r\)|binarySearch)\b/i.test(trimmed)) {
        return "Binary search looks solid. Be sure to double-check your boundary condition updates on left and right.";
    }
    if (/\b(dfs|bfs|queue|visited)\b/i.test(trimmed)) {
        return "Graph traversal looks on track. Remember to mark nodes as visited to prevent cycles.";
    }
    if (trimmed.length > 50) {
        return "Good progress on setting up the core logic — keep going.";
    }

    return '';
}

/**
 * Evaluates candidate response to capture question effectiveness training signals
 * @param {string} question 
 * @param {string} answer 
 * @param {Object} microScore 
 * @returns {{ question: string, candidateSignal: string, topicCoverage: number, discriminativeness: number }}
 */
export function calculateQuestionEffectivenessSignal(question, answer = '', microScore = {}) {
    const trimmed = (answer || '').trim().toLowerCase();

    // 1. Candidate Signal: 'strong_answer' | 'adequate' | 'confused' | 'deflected' | 'weak'
    let candidateSignal = 'adequate';
    const isConfused = /\b(i don'?t know|not sure|confused|can you clarify|no idea|what do you mean|lost me|unclear)\b/i.test(trimmed) || microScore.signal === 'no_answer';
    const isDeflected = /\b(skip this|different question|change the subject|let'?s move on|not familiar with that|can we talk about something else|pass on this|prefer not to answer)\b/i.test(trimmed);

    if (isConfused) {
        candidateSignal = 'confused';
    } else if (isDeflected) {
        candidateSignal = 'deflected';
    } else if (microScore.signal === 'strong' || (typeof microScore.score === 'number' && microScore.score >= 7.5)) {
        candidateSignal = 'strong_answer';
    } else if (microScore.signal === 'weak' || (typeof microScore.score === 'number' && microScore.score < 5.0)) {
        candidateSignal = 'weak';
    } else {
        candidateSignal = 'adequate';
    }

    // 2. Topic Coverage (0 - 1)
    let topicCoverage = 0.5;
    if (microScore.dimensions && typeof microScore.dimensions.depth === 'number' && typeof microScore.dimensions.correctness === 'number') {
        const rawCoverage = (microScore.dimensions.depth + microScore.dimensions.correctness) / 20;
        topicCoverage = Math.min(1, Math.max(0, +rawCoverage.toFixed(2)));
    } else if (typeof microScore.score === 'number') {
        topicCoverage = Math.min(1, Math.max(0, +(microScore.score / 10).toFixed(2)));
    }

    // 3. Discriminativeness (0 - 1)
    let discriminativeness = 0.5;
    if (candidateSignal === 'strong_answer') {
        const depth = microScore.dimensions?.depth ?? 8;
        discriminativeness = Math.min(1, Math.max(0.65, +(depth / 10).toFixed(2)));
    } else if (candidateSignal === 'weak' || candidateSignal === 'confused') {
        const penalty = typeof microScore.score === 'number' ? (10 - microScore.score) / 10 : 0.7;
        discriminativeness = Math.min(0.95, Math.max(0.6, +penalty.toFixed(2)));
    } else if (candidateSignal === 'deflected') {
        discriminativeness = 0.40;
    } else {
        const dimVariance = microScore.dimensions
            ? Math.abs((microScore.dimensions.depth || 5) - (microScore.dimensions.correctness || 5)) / 10
            : 0.1;
        discriminativeness = Math.min(0.75, Math.max(0.45, +(0.50 + dimVariance).toFixed(2)));
    }

    return {
        question: question || 'Technical question',
        candidateSignal,
        topicCoverage,
        discriminativeness
    };
}

/**
 * Mounts the real-time interview WebSocket server at /ws/interview
 * @param {import('http').Server} server 
 * @returns {WebSocketServer}
 */
export function mountInterviewSocket(server) {
    const wss = new WebSocketServer({ server, path: '/ws/interview' });

    wss.on('connection', async (ws, req) => {
        let url;
        try {
            url = new URL(req.url, 'http://localhost');
        } catch {
            ws.close(4001, 'Unauthorized');
            return;
        }

        const token = url.searchParams.get('token');
        const sessionId = url.searchParams.get('sessionId');

        // 1. JWT Authentication
        if (!token) {
            ws.close(4001, 'Unauthorized');
            return;
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        } catch {
            ws.close(4001, 'Unauthorized');
            return;
        }

        if (!decoded || !decoded.id) {
            ws.close(4001, 'Unauthorized');
            return;
        }

        // 2. Session Existence & Candidate Ownership Validation
        if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
            ws.close(4003, 'Session not found');
            return;
        }

        let session;
        try {
            session = await InterviewSession.findById(sessionId).populate({
                path: 'assessment',
                populate: [
                    { path: 'role', select: 'title' },
                    { path: 'company', select: 'name' }
                ]
            });
        } catch {
            ws.close(4003, 'Session not found');
            return;
        }

        if (!session || !session.candidate) {
            ws.close(4003, 'Session not found');
            return;
        }

        const sessionCandidateId = (session.candidate._id || session.candidate).toString();
        if (sessionCandidateId !== decoded.id) {
            ws.close(4003, 'Session not found');
            return;
        }

        // 3. Completed or Timed-Out Session Guard
        if (session.status === 'COMPLETED' || session.status === 'TIMED_OUT') {
            ws.close(4004, 'Session already completed');
            return;
        }

        // 4. Per-connection State
        const state = {
            abortController: null,
            isInterrupted: false,
            wasInterrupted: false,
            audioChunks: [],
            codeCommentTimer: null
        };

        // 5. Handler for candidate spoken or typed turn
        async function handleCandidateTurn(candidateText) {
            if (!candidateText || typeof candidateText !== 'string' || !candidateText.trim()) {
                ws.send(JSON.stringify({ type: 'ERROR', message: 'Message text cannot be empty' }));
                return;
            }

            // Abort previous in-flight generation
            if (state.abortController) {
                state.abortController.abort();
            }
            state.abortController = new AbortController();
            state.isInterrupted = false;
            const { signal } = state.abortController;

            const trimmedText = candidateText.trim();

            // Progressive Evaluation: Turn-by-Turn micro-scoring
            const lastAiTurn = [...(session.transcript || [])].reverse().find(t => t.role === 'ai');
            const lastQuestion = lastAiTurn?.text || 'Technical question';
            const currentTopic = (session.topics && session.topics[session.currentTopicIndex])
                ? session.topics[session.currentTopicIndex]
                : (session.stage || 'General');

            let microScore = null;
            try {
                microScore = await scoreSingleAnswer({
                    question: lastQuestion,
                    answer: trimmedText,
                    topic: currentTopic,
                    rubrics: session.assessment?.blueprintAnalysis?.rubrics || [],
                    sessionContext: `Stage: ${session.stage}, Topic: ${currentTopic}`
                });
            } catch (scoreErr) {
                console.warn('[WS MicroScore] Scoring warning:', scoreErr.message);
                microScore = {
                    score: 6.0,
                    signal: 'adequate',
                    dimensions: { correctness: 6, depth: 6, communication: 6, practical_application: 6 },
                    keyInsight: 'Fallback micro-score evaluation.'
                };
            }

            // Record micro-score
            if (!Array.isArray(session.microScores)) {
                session.microScores = [];
            }
            session.microScores.push({
                question: lastQuestion,
                answer: trimmedText,
                topic: currentTopic,
                score: microScore.score,
                signal: microScore.signal,
                dimensions: microScore.dimensions,
                keyInsight: microScore.keyInsight,
                timestamp: new Date()
            });

            // Update running Candidate Profile & CRI
            const updatedProfile = updateCandidateProfile(session, currentTopic, microScore);

            // Record training signal: Question Effectiveness
            if (!session.trainingSignals) {
                session.trainingSignals = { questionEffectiveness: [], sessionOutcome: {} };
            }
            if (!Array.isArray(session.trainingSignals.questionEffectiveness)) {
                session.trainingSignals.questionEffectiveness = [];
            }
            const qSignal = calculateQuestionEffectivenessSignal(lastQuestion, trimmedText, microScore);
            session.trainingSignals.questionEffectiveness.push(qSignal);

            // Send CRI update frame over WebSocket
            const currentCri = typeof updatedProfile.candidateReadinessIndex === 'number'
                ? updatedProfile.candidateReadinessIndex
                : (typeof updatedProfile.cri === 'number' ? updatedProfile.cri : 5.0);

            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'CRI_UPDATE',
                    cri: currentCri,
                    signal: updatedProfile.overallSignal || 'adequate'
                }));
            }

            session.transcript.push({
                role: 'candidate',
                text: trimmedText,
                timestamp: new Date()
            });
            await session.save();

            // Acknowledge interruption naturally if candidate previously barged in
            let ackPrefix = '';
            if (state.wasInterrupted) {
                ackPrefix = 'Sure, go ahead. ';
                state.wasInterrupted = false;
            }

            // Timing & pacing context from session blueprint
            const startedAt = session.startedAt || session.createdAt || new Date();
            const elapsedMs = Math.max(0, Date.now() - new Date(startedAt).getTime());
            const elapsedMinutes = Math.floor(elapsedMs / (60 * 1000));
            const totalDurationMinutes = session.durationMinutes || session.assessment?.durationMinutes || 30;
            const remainingMinutes = Math.max(0, Math.ceil(((totalDurationMinutes * 60 * 1000) - elapsedMs) / (60 * 1000)));

            let timeline = session.assessment?.blueprintAnalysis?.timeline;
            if (!timeline || !timeline.length) {
                timeline = buildDefaultTimeline(
                    totalDurationMinutes,
                    session.interviewFormat !== 'PROJECT_AND_TECHNICAL_ONLY' && session.assessment?.codingRoundEnabled !== false
                );
            }
            const timingContext = getActivePhaseInfo(timeline, elapsedMinutes, totalDurationMinutes);

            // Detect if candidate is explicitly asking to code or shift to practical coding round
            const wantsToCode = /(shift|move|switch|transition|go|start|jump|ready|let'?s?)\s+(to|for|over\s+to|into)?\s*(the\s+)?(cod|dsa|problem|editor|practical|exercise|implementation)/i.test(trimmedText) ||
                /(can\s+we|shall\s+we|should\s+we|may\s+i|i\s+want\s+to|i'd\s+like\s+to)\s+(code|start\s+coding|do\s+the\s+coding|solve\s+the\s+problem)/i.test(trimmedText);

            if (wantsToCode && session.interviewFormat !== 'PROJECT_AND_TECHNICAL_ONLY' && session.assessment?.codingRoundEnabled !== false) {
                if (timingContext) {
                    timingContext.isPastCodingPhase = true;
                    timingContext.isNearCodingPhase = true;
                }
            }

            let aiResponse;
            try {
                aiResponse = await generateNextInterviewStep({
                    companyName: session.assessment?.company?.name || 'our company',
                    roleTitle: session.assessment?.role?.title || 'Software Engineer',
                    skills: session.assessment?.skills || [],
                    experienceLevel: session.assessment?.experienceLevel || 'Mid',
                    blueprint: session.assessment?.blueprint || '',
                    blueprintAnalysis: session.assessment?.blueprintAnalysis || null,
                    candidateResume: session.candidateResume || '',
                    interviewFormat: session.interviewFormat || 'FULL_INTERVIEW',
                    transcript: session.transcript,
                    candidateMessage: trimmedText,
                    currentStage: session.stage || 'CONCEPTUAL',
                    currentChallenge: session.codingChallenge,
                    currentCode: session.liveCode || '',
                    topics: session.topics || [],
                    currentTopicIndex: session.currentTopicIndex || 0,
                    timingContext,
                    voiceModel: session.voiceModel || ''
                });
            } catch (aiErr) {
                if (signal.aborted) return;
                console.error('[WS AI] Generation error:', aiErr);
                ws.send(JSON.stringify({ type: 'ERROR', message: 'Failed to generate interviewer response' }));
                return;
            }

            if (signal.aborted || state.isInterrupted) return;

            let replyText = (aiResponse?.message || aiResponse?.text || '').trim();
            if (ackPrefix) {
                replyText = ackPrefix + replyText;
            }

            // 1. Stream response tokens (TEXT_TOKEN)
            const words = replyText.split(' ');
            for (let i = 0; i < words.length; i++) {
                if (signal.aborted || state.isInterrupted) break;
                const token = words[i] + (i < words.length - 1 ? ' ' : '');
                ws.send(JSON.stringify({ type: 'TEXT_TOKEN', token }));
            }

            // 2. Stream sentence audio chunks (AUDIO_CHUNK)
            const streamedSentences = [];
            if (replyText) {
                try {
                    const voiceModel = session.voiceModel || 'edge-neural-neerja';
                    for await (const chunk of streamTTSChunks(replyText, voiceModel, { signal })) {
                        if (signal.aborted || state.isInterrupted) break;
                        streamedSentences.push(chunk.text);
                        ws.send(JSON.stringify({
                            type: 'AUDIO_CHUNK',
                            audioBase64: chunk.audioBase64,
                            sentence: chunk.text
                        }));
                    }
                } catch (ttsErr) {
                    if (ttsErr.name !== 'AbortError' && !signal.aborted) {
                        console.warn('[WS TTS] Stream chunking warning:', ttsErr.message);
                    }
                }
            }

            // Save AI reply to transcript
            const recordedText = state.isInterrupted
                ? (streamedSentences.join(' ') || replyText) + ' [Interrupted]'
                : replyText;

            session.transcript.push({
                role: 'ai',
                text: recordedText,
                timestamp: new Date(),
                evaluation: aiResponse?.feedback || aiResponse?.answerEvaluation || null
            });

            // Stage Transition (e.g. CONCEPTUAL -> CODING)
            let stageChanged = false;
            let activeChallenge = session.codingChallenge;

            if (aiResponse?.nextStage && aiResponse.nextStage !== session.stage) {
                session.stage = aiResponse.nextStage;
                stageChanged = true;
            }

            if (aiResponse?.codingChallenge) {
                session.codingChallenge = aiResponse.codingChallenge;
                activeChallenge = aiResponse.codingChallenge;
            }

            if (session.stage === 'CODING' && !session.codingChallenge) {
                session.codingChallenge = aiResponse?.codingChallenge;
            }

            await session.save();

            // Dispatch STAGE_TRANSITION event to frontend over WebSocket
            if (stageChanged || (session.stage === 'CODING' && aiResponse?.codingChallenge)) {
                ws.send(JSON.stringify({
                    type: 'STAGE_TRANSITION',
                    stage: session.stage,
                    codingChallenge: activeChallenge
                }));
            }

            state.abortController = null;
        }

        // 6. Frame Dispatcher
        ws.on('message', async (raw) => {
            let msg;
            try {
                msg = JSON.parse(raw.toString());
            } catch {
                ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid JSON payload' }));
                return;
            }

            try {
                switch (msg.type) {
                    case 'TEXT_MESSAGE': {
                        await handleCandidateTurn(msg.text);
                        break;
                    }

                    case 'AUDIO_CHUNK': {
                        if (typeof msg.data === 'string') {
                            state.audioChunks.push(msg.data);
                            const transcript = await transcribeAudioBuffer(msg.data, msg.sampleRate || 16000);
                            if (transcript && transcript.trim()) {
                                await handleCandidateTurn(transcript.trim());
                            }
                        }
                        break;
                    }

                    case 'CODE_SNAPSHOT': {
                        if (typeof msg.code === 'string') {
                            session.liveCode = msg.code;
                            if (!session.codeSubmission) session.codeSubmission = {};
                            session.codeSubmission.code = msg.code;
                            if (msg.language) session.codeSubmission.language = msg.language;
                            await session.save();

                            // 8s debounced observation commentary
                            if (state.codeCommentTimer) {
                                clearTimeout(state.codeCommentTimer);
                            }
                            const debounceMs = Number(process.env.CODE_COMMENT_DEBOUNCE_MS) || 8000;
                            state.codeCommentTimer = setTimeout(async () => {
                                try {
                                    const comment = await generateCodeObservation(
                                        msg.code,
                                        msg.language || session.codeSubmission?.language || 'javascript',
                                        session
                                    );
                                    if (comment && comment.trim() && ws.readyState === WebSocket.OPEN) {
                                        ws.send(JSON.stringify({ type: 'AI_CODE_COMMENT', text: comment.trim() }));
                                    }
                                } catch (codeCommentErr) {
                                    console.warn('[WS Code Comment] Error:', codeCommentErr.message);
                                }
                            }, debounceMs);
                        }
                        break;
                    }

                    case 'INTERRUPT': {
                        state.isInterrupted = true;
                        state.wasInterrupted = true;
                        if (state.abortController) {
                            state.abortController.abort();
                            state.abortController = null;
                        }
                        ws.send(JSON.stringify({ type: 'AI_INTERRUPTED' }));
                        break;
                    }

                    default:
                        ws.send(JSON.stringify({ type: 'ERROR', message: `Unknown message type: ${msg.type}` }));
                        break;
                }
            } catch (dispatchErr) {
                console.error('[WS Message Error]', dispatchErr);
                ws.send(JSON.stringify({ type: 'ERROR', message: 'Internal server error processing frame' }));
            }
        });

        ws.on('close', () => {
            if (state.abortController) {
                state.abortController.abort();
                state.abortController = null;
            }
            if (state.codeCommentTimer) {
                clearTimeout(state.codeCommentTimer);
                state.codeCommentTimer = null;
            }
        });

        // 7. Successful Handshake Notification
        ws.send(JSON.stringify({ type: 'SESSION_READY', sessionId }));
    });

    return wss;
}

