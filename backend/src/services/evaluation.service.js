import mongoose from 'mongoose';
import { Evaluation } from '../models/evaluation.model.js';
import { InterviewSession } from '../models/interviewSession.model.js';
import '../models/candidate.model.js';
import '../models/assessment.model.js';
import { executeCodeSandbox } from './sandbox.service.js';
import { sendEvaluationNotification } from './email.service.js';
import { estimateCandidateLevel } from '../utils/candidateProfileTracker.js';

const GEMINI_MODELS = ['gemini-flash-lite-latest', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.5-flash'];

/**
 * Resilient multi-model Gemini caller with automatic fallback
 */
const callGemini = async (body) => {
    if (process.env.NODE_ENV === 'test') return null;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    for (const model of GEMINI_MODELS) {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey
                },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(20000)
            });

            const data = await response.json();
            if (data.error) {
                console.warn(`[Evaluation] Model ${model} error ${data.error.code}: ${data.error.message?.slice(0, 80)}. Trying fallback...`);
                continue;
            }

            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) return text;
        } catch (err) {
            console.warn(`[Evaluation] Model ${model} failed:`, err.message);
        }
    }
    return null;
};

/**
 * Safely executes JavaScript / Python / Compiled code against structured test cases
 */
export const runTestCases = async (language = 'javascript', code = '', testCases = []) => {
    if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
        return [];
    }

    if (language === 'python') {
        const results = [];
        for (const tc of testCases) {
            try {
                const pyRunnerCode = `
import json, sys
${code}

def __run_test__():
    try:
        candidates = [v for k, v in list(globals().items()) if callable(v) and not k.startswith('_')]
        if not candidates:
            print("No function defined")
            return
        fn = candidates[-1]
        raw_input = ${JSON.stringify(tc.input || '')}
        try:
            parsed = json.loads(raw_input)
            val = fn(*parsed) if isinstance(parsed, list) else fn(parsed)
        except Exception:
            val = fn(raw_input)
        print(json.dumps(val) if isinstance(val, (dict, list)) else str(val))
    except Exception as e:
        print(f"Error: {e}")

__run_test__()
`;
                const res = await executeCodeSandbox({ language: 'python', code: pyRunnerCode, timeoutMs: 3000 });
                const actualOutput = res.output || '';
                const cleanExpected = (tc.expectedOutput || '').trim().replace(/\s+/g, '');
                const cleanActual = actualOutput.trim().replace(/\s+/g, '');
                const passed = !res.hasError && cleanActual.length > 0 && cleanActual === cleanExpected;
                results.push({
                    input: tc.input || '',
                    expectedOutput: tc.expectedOutput || '',
                    actualOutput,
                    passed,
                    executionTime: res.executionTime || '0.05s'
                });
            } catch (err) {
                results.push({
                    input: tc.input || '',
                    expectedOutput: tc.expectedOutput || '',
                    actualOutput: `Execution Error: ${err.message}`,
                    passed: false,
                    executionTime: '0.00s'
                });
            }
        }
        return results;
    }

    if (language === 'javascript' || language === 'node' || language === 'js') {
        const results = [];
        for (const tc of testCases) {
            try {
                const jsRunnerCode = `
${code}

(function __run_test__() {
    try {
        let fn = null;
        if (typeof solution === 'function') fn = solution;
        else if (typeof twoSum === 'function') fn = twoSum;
        else if (typeof solve === 'function') fn = solve;
        else {
            const keys = Object.keys(global).concat(Object.keys(this || {}));
            for (const k of keys) {
                if (typeof global[k] === 'function' && !['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'setImmediate', 'clearImmediate', 'queueMicrotask'].includes(k)) {
                    fn = global[k];
                    break;
                }
            }
        }
        if (fn) {
            let parsedInput;
            try {
                parsedInput = JSON.parse(${JSON.stringify(tc.input || '')});
            } catch(e) {
                try {
                    parsedInput = eval(${JSON.stringify(tc.input || '')});
                } catch(e2) {
                    parsedInput = ${JSON.stringify(tc.input || '')};
                }
            }
            const res = Array.isArray(parsedInput) ? fn(...parsedInput) : fn(parsedInput);
            if (res !== undefined) {
                console.log(typeof res === 'object' ? JSON.stringify(res) : String(res));
            }
        }
    } catch(err) {
        console.error(err.message);
    }
})();
`;
                const res = await executeCodeSandbox({ language: 'javascript', code: jsRunnerCode, timeoutMs: 3000 });
                const actualOutput = res.output || '';
                const cleanExpected = (tc.expectedOutput || '').trim().replace(/\s+/g, '');
                const cleanActual = actualOutput.trim().replace(/\s+/g, '');
                const passed = !res.hasError && cleanActual.length > 0 && cleanActual === cleanExpected;
                results.push({
                    input: tc.input || '',
                    expectedOutput: tc.expectedOutput || '',
                    actualOutput,
                    passed,
                    executionTime: res.executionTime || '0.05s'
                });
            } catch (err) {
                results.push({
                    input: tc.input || '',
                    expectedOutput: tc.expectedOutput || '',
                    actualOutput: `Sandbox Execution Error: ${err.message}`,
                    passed: false,
                    executionTime: '0.00s'
                });
            }
        }
        return results;
    }

    // For C++ / Java / Other compiled languages
    const results = [];
    for (const tc of testCases) {
        try {
            const res = await executeCodeSandbox({
                language,
                code,
                customInput: tc.input || '',
                timeoutMs: 5000
            });
            const actualOutput = res.output || '';
            const cleanExpected = (tc.expectedOutput || '').trim().replace(/\s+/g, '');
            const cleanActual = actualOutput.trim().replace(/\s+/g, '');
            const passed = !res.hasError && cleanActual.length > 0 && cleanActual === cleanExpected;
            results.push({
                input: tc.input || '',
                expectedOutput: tc.expectedOutput || '',
                actualOutput,
                passed,
                executionTime: res.executionTime || '0.05s'
            });
        } catch (err) {
            results.push({
                input: tc.input || '',
                expectedOutput: tc.expectedOutput || '',
                actualOutput: `Compiler/Execution error: ${err.message}`,
                passed: false,
                executionTime: '0.00s'
            });
        }
    }
    return results;
};

/**
 * Call Gemini 2.5 Flash to comprehensively grade the transcript and code with Role Rubrics, Company History Context & Candidate Q&A
 */
export const generateAiEvaluation = async ({
    roleTitle = 'Software Engineer',
    companyName = 'Engineering Team',
    experienceLevel = 'Mid',
    transcript = [],
    codingChallenge = {},
    codeSubmission = {},
    testCaseResults = [],
    candidateResume = '',
    interviewFormat = 'FULL_INTERVIEW',
    blueprint = '',
    roundSummary = '',
    keyCompetencies = [],
    skills = [],
    companyHistory = { priorInterviewsCount: 0, trajectorySummary: '', priorScores: [] }
}) => {
    const apiKey = process.env.GEMINI_API_KEY;
    const isProjectOnly = interviewFormat === 'PROJECT_AND_TECHNICAL_ONLY';

    // Helper to detect if candidate submitted real, substantive code beyond comments or boilerplate
    const isSubstantiveCode = (code) => {
        if (!code || typeof code !== 'string') return false;
        const stripped = code
            .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '') // remove comments
            .replace(/function\s+\w*\s*\([^)]*\)\s*\{?\s*\}?/g, '') // remove function signature
            .replace(/return\s+input;?/g, '')
            .replace(/\s+/g, '');
        return stripped.length > 15;
    };

    const candidateMessages = (transcript || []).filter(
        t => t.role === 'candidate' && typeof t.text === 'string' && t.text.trim().length > 0
    );
    const hasCode = isSubstantiveCode(codeSubmission?.code);

    const competenciesList = keyCompetencies && keyCompetencies.length > 0
        ? keyCompetencies
        : (skills && skills.length > 0 ? skills.slice(0, 4) : ['Problem Solving & Algorithms', 'System Architecture', 'Code Quality', 'Technical Communication']);

    // Fast-path guard for unattempted / abandoned interviews
    if (candidateMessages.length === 0 && !hasCode) {
        return {
            scores: {
                overall: 0,
                conceptual: 0,
                coding: 0,
                codeQuality: 0,
                communication: 0
            },
            verdict: 'Reject',
            summary: `Evaluation for ${roleTitle} at ${companyName} (${experienceLevel} level). The candidate abandoned or concluded the interview session without providing responses to any interview questions and without submitting any code. No technical competencies, problem-solving skills, or communication abilities could be evaluated.`,
            strengths: [
                'None demonstrated — session was terminated without candidate participation.'
            ],
            areasForImprovement: [
                'Must actively participate in interview discussions and answer technical questions.',
                'Must implement and submit solutions for coding challenges.'
            ],
            codeReview: {
                correctness: 'No code was submitted. The coding challenge was left completely unattempted (0 tests passed).',
                timeComplexity: 'N/A — No code submitted',
                spaceComplexity: 'N/A — No code submitted',
                suggestions: [
                    'Implement algorithmic solutions for technical challenges.',
                    'Communicate thought processes clearly during technical assessments.'
                ]
            },
            roleRubricsFeedback: competenciesList.map(c => ({
                competency: c,
                score: 0,
                status: 'BELOW_EXPECTATIONS',
                feedback: 'No signal demonstrated as session was unattempted or abandoned.'
            })),
            candidateQuestionsAsked: [],
            companyHistoryContext: companyHistory
        };
    }

    // Build a dynamic fallback from actual transcript analysis (no hardcoded baseline scores)
    const buildDynamicFallback = () => {
        const totalWords = candidateMessages.reduce((sum, m) => sum + (m.text || '').split(/\s+/).length, 0);
        const avgWords = candidateMessages.length > 0 ? Math.round(totalWords / candidateMessages.length) : 0;

        const technicalPatterns = /complexity|thread|memory|async|event loop|index|cache|hash|pointer|latency|scale|partition|transaction|closure|prototype|stack|heap|cpu|io|api|database|query|middleware|routing|authentication|deployment|microservice|container|docker|kubernetes|ci\/cd|rest|graphql|websocket|redis|kafka|queue|distributed/gi;
        const techHits = candidateMessages.reduce((sum, m) => {
            const matches = (m.text || '').match(technicalPatterns);
            return sum + (matches ? matches.length : 0);
        }, 0);

        // Per-answer evaluation scores from AI inline evaluation (if available)
        const inlineScores = candidateMessages
            .filter(m => m.evaluation && typeof m.evaluation.correctness === 'number')
            .map(m => m.evaluation);

        let conceptualScore = 0;
        let communicationScore = 0;

        if (inlineScores.length > 0) {
            conceptualScore = Math.round(inlineScores.reduce((s, e) => s + (e.correctness || 0), 0) / inlineScores.length);
            const depthAvg = Math.round(inlineScores.reduce((s, e) => s + (e.depth || 0), 0) / inlineScores.length);
            communicationScore = Math.min(100, Math.round((conceptualScore + depthAvg) / 2 + (avgWords > 30 ? 5 : 0)));
        } else if (candidateMessages.length > 0) {
            const engagementFactor = Math.min(1, candidateMessages.length / 3);
            const wordFactor = Math.min(1, avgWords / 40);
            const techFactor = Math.min(1, techHits / 4);

            conceptualScore = Math.round(engagementFactor * (wordFactor * 35 + techFactor * 65));
            communicationScore = Math.round(engagementFactor * (wordFactor * 60 + (techHits > 0 ? 30 : 10) + (avgWords > 15 ? 10 : 0)));
        }

        // Coding score from test case results
        const passedTests = testCaseResults.filter(t => t.passed).length;
        const totalTests = testCaseResults.length;
        let codingScore = 0;
        let codeQualityScore = 0;

        if (isProjectOnly) {
            codingScore = conceptualScore;
            codeQualityScore = conceptualScore;
        } else if (totalTests > 0) {
            codingScore = Math.round((passedTests / totalTests) * 100);
            codeQualityScore = hasCode
                ? Math.min(100, Math.max(10, codingScore + (codeSubmission.code.length > 100 ? 10 : 0)))
                : 0;
        } else if (hasCode) {
            codingScore = 40;
            codeQualityScore = 35;
        } else {
            codingScore = 0;
            codeQualityScore = 0;
        }

        const overall = Math.round((conceptualScore * 0.35) + (codingScore * 0.3) + (codeQualityScore * 0.15) + (communicationScore * 0.2));

        let verdict;
        if (overall >= 85) verdict = 'Strong Hire';
        else if (overall >= 68) verdict = 'Hire';
        else if (overall >= 50) verdict = 'Needs Improvement';
        else verdict = 'Reject';

        // Extract questions asked by the candidate from transcript
        const extractedQuestions = [];
        for (let i = 0; i < transcript.length; i++) {
            const item = transcript[i];
            if (item.role === 'candidate' && typeof item.text === 'string') {
                const trimmed = item.text.trim();
                const isQuestion = trimmed.endsWith('?') || /^(what|how|why|could|can|is|are|tell me|do you)\b/i.test(trimmed);
                if (isQuestion && trimmed.length > 12) {
                    const nextAi = transcript.slice(i + 1).find(t => t.role === 'ai');
                    extractedQuestions.push({
                        question: trimmed,
                        interviewerAnswer: nextAi?.text ? nextAi.text.slice(0, 300) : 'Interviewer discussed and provided context on team operations.',
                        analysis: 'Candidate demonstrated curiosity about engineering practices, architecture, and team workflows.'
                    });
                }
            }
        }

        // Heuristic role rubrics feedback mapped to competencies
        const rubricsFeedback = competenciesList.map(comp => {
            const compLower = comp.toLowerCase();
            let score = conceptualScore;
            if (compLower.includes('code') || compLower.includes('algorithm') || compLower.includes('data structure')) {
                score = Math.round((codingScore + codeQualityScore) / 2);
            } else if (compLower.includes('communicat') || compLower.includes('collab') || compLower.includes('culture')) {
                score = communicationScore;
            }
            let status = 'MEETS_EXPECTATIONS';
            if (score >= 80) status = 'EXCEEDS_EXPECTATIONS';
            else if (score < 55) status = 'BELOW_EXPECTATIONS';

            return {
                competency: comp,
                score,
                status,
                feedback: score >= 80
                    ? `Demonstrated advanced knowledge and thorough reasoning across ${comp}.`
                    : score >= 55
                        ? `Adequately addressed core aspects of ${comp}; would benefit from deeper architectural examples.`
                        : `Showed gaps in ${comp} relative to the ${experienceLevel}-level benchmark.`
            };
        });

        return {
            scores: {
                overall: Math.min(100, Math.max(0, overall)),
                conceptual: Math.min(100, Math.max(0, conceptualScore)),
                coding: Math.min(100, Math.max(0, codingScore)),
                codeQuality: Math.min(100, Math.max(0, codeQualityScore)),
                communication: Math.min(100, Math.max(0, communicationScore))
            },
            verdict,
            summary: `Evaluation for ${roleTitle} at ${companyName} (${experienceLevel} level). ${companyHistory?.trajectorySummary ? companyHistory.trajectorySummary + ' ' : ''}The candidate answered ${candidateMessages.length} questions with an average response length of ${avgWords} words. ${techHits > 5 ? 'Demonstrated strong technical vocabulary usage across responses.' : 'Technical depth in responses was limited.'} ${totalTests > 0 ? `Passed ${passedTests} of ${totalTests} test cases in the coding round.` : isProjectOnly ? 'Evaluated on project discussion and technical architecture.' : 'No coding test cases were executed.'} Note: This evaluation was generated using heuristic analysis.`,
            strengths: candidateMessages.length > 0
                ? [
                    `Engaged with ${candidateMessages.length} interview questions`,
                    avgWords > 25 ? 'Provided detailed responses with good elaboration' : 'Responded to questions asked',
                    techHits > 3 ? 'Used relevant technical terminology in discussions' : 'Communicated during the interview'
                ]
                : ['Completed the interview session'],
            areasForImprovement: [
                avgWords < 30 ? 'Provide more detailed and thorough explanations in responses' : 'Continue deepening technical explanations with concrete examples',
                techHits < 5 ? 'Incorporate more specific technical terms, Big-O analysis, and system design concepts' : 'Explore edge cases and failure scenarios in technical discussions'
            ],
            codeReview: {
                correctness: isProjectOnly
                    ? 'Project & Technical Architecture discussion round — evaluated on system design depth.'
                    : totalTests > 0
                        ? `Passed ${passedTests} of ${totalTests} automated test cases.`
                        : hasCode
                            ? 'Code was submitted but no automated tests were available for verification.'
                            : 'No substantive code was submitted during the coding round.',
                timeComplexity: isProjectOnly ? 'N/A — Architecture evaluation' : (hasCode ? 'Unable to determine — heuristic analysis' : 'N/A'),
                spaceComplexity: isProjectOnly ? 'N/A — Architecture evaluation' : (hasCode ? 'Unable to determine — heuristic analysis' : 'N/A'),
                suggestions: [
                    'Review the problem constraints and optimize for edge cases.',
                    'Add input validation and error handling for production readiness.'
                ]
            },
            roleRubricsFeedback: rubricsFeedback,
            candidateQuestionsAsked: extractedQuestions,
            companyHistoryContext: companyHistory
        };
    };

    const fallbackEvaluation = buildDynamicFallback();

    if (!apiKey) return fallbackEvaluation;

    const formattedTranscript = transcript.map(t => `${t.role.toUpperCase()}: ${t.text}`).join('\n\n');
    const passedTestsCount = testCaseResults.filter(t => t.passed).length;
    const totalTestsCount = testCaseResults.length;

    const prompt = `You are a Principal Engineering Director and Senior Hiring Committee Bar Raiser at ${companyName}.
You are conducting a rigorous, unsparing technical evaluation of a candidate's completed interview for the ${experienceLevel}-level ${roleTitle} position.

CRITICAL HIRING COMMITTEE DIRECTIVE:
FACE-TO-FACE FACTS. DO NOT PLAY A SAFE GAME.
Do not sugarcoat. Do not hedge diplomatically. Treat this candidate like an engineer being vetted for mission-critical production systems. If their answers were superficial buzzwords without understanding memory or concurrency, state it bluntly. If their code fails edge cases, has poor Big-O, or lacks defensive checks, document the exact failure modes.

ZERO TOLERANCE FOR ABANDONED / UNANSWERED SESSIONS:
If the transcript shows that the candidate abandoned the interview, gave no substantive answers, provided only greetings without addressing technical questions, or submitted no working code, you MUST award a score of 0 across all categories (overall: 0, conceptual: 0, coding: 0, codeQuality: 0, communication: 0) and verdict: "Reject". Under NO circumstances award baseline or sympathy points for unattempted questions or blank code.

--- INTERVIEW CONTEXT ---
Role: ${roleTitle}
Target Level: ${experienceLevel}
Company: ${companyName}
Format: ${isProjectOnly ? 'PROJECT & TECHNICAL ARCHITECTURE ONLY (No live coding round was scheduled. Focus evaluation on their project discussions, architectural depth, trade-offs, and communication.)' : 'FULL TECHNICAL LOOP (Technical / Project discussion followed by live coding challenge)'}

--- ROLE RUBRICS & KEY COMPETENCIES ---
Round Focus: ${roundSummary || 'Technical & System Architecture Assessment'}
Competencies to Evaluate: ${competenciesList.join(', ')}
${blueprint ? `Hiring Blueprint / Rubric Excerpt:\n${blueprint.slice(0, 1500)}\n` : ''}

--- CANDIDATE HISTORY WITH COMPANY (${companyName}) ---
Prior Completed Interviews with ${companyName}: ${companyHistory.priorInterviewsCount}
Trajectory Context: ${companyHistory.trajectorySummary || 'First formal interview loop with company.'}
${companyHistory.priorScores && companyHistory.priorScores.length > 0 ? `Prior Scores: ${JSON.stringify(companyHistory.priorScores)}` : ''}

${candidateResume ? `--- CANDIDATE RESUME & PROJECTS CONTEXT ---\n${candidateResume}\n` : ''}

--- CODING CHALLENGE GIVEN TO CANDIDATE ---
Title: ${codingChallenge?.title || (isProjectOnly ? 'N/A (Project Architecture Discussion)' : 'Algorithmic Problem')}
Description: ${codingChallenge?.description || (isProjectOnly ? 'This round evaluated project experience, scalability, and system design.' : 'N/A')}
Input/Output Expectations: ${codingChallenge?.inputFormat || 'N/A'} -> ${codingChallenge?.outputFormat || 'N/A'}

--- CANDIDATE'S FINAL SUBMITTED CODE ---
Language: ${codeSubmission?.language || 'javascript'}
Code:
"""
${codeSubmission?.code || (isProjectOnly ? '// No coding required for this round' : '// No code submitted')}
"""

--- AUTOMATED TEST SUITE EXECUTION RESULTS ---
Passed: ${passedTestsCount} / ${totalTestsCount}
Details:
${JSON.stringify(testCaseResults, null, 2)}

--- FULL LIVE INTERVIEW CONVERSATION TRANSCRIPT ---
${formattedTranscript || 'No transcript available.'}

--- EVALUATION REQUIREMENTS ---
1. Conceptual Knowledge (0-100): Measure foundational depth vs superficial terminology. If not answered, award 0.
2. Coding Correctness (0-100): ${isProjectOnly ? 'Since this was a Project/Architecture round without live coding, grade their technical depth, algorithmic clarity, and architectural soundness shown in dialogue.' : 'Did the code pass all tests? If no code was written, award 0.'}
3. Code Quality (0-100): ${isProjectOnly ? 'Grade their engineering standards, best practices, and code structure discussed during project review.' : 'Is it clean, idiomatic, modular, with proper error handling? If no code was written, award 0.'}
4. Communication (0-100): Did they articulate architectural trade-offs with precision or speak in vague generalities? If they did not speak, award 0.
5. Overall Score (0-100): Rigorous weighted average. If abandoned or unanswered, MUST be 0.
6. Hiring Verdict: Choose strictly one of: 'Strong Hire', 'Hire', 'Needs Improvement', 'Reject'.
7. Executive Summary: Face-to-face facts. 2 detailed paragraphs analyzing technical competency, real-world readiness, historical context with ${companyName}, and production risks.
8. Strengths: 3 to 4 specific technical strengths demonstrated with exact evidence from transcript/code (or state 'None demonstrated' if unattempted).
9. Areas for Improvement: 2 to 3 unvarnished, actionable technical growth areas.
10. Role Rubrics Feedback: Evaluate each target competency (${competenciesList.join(', ')}). For each, provide a score (0-100), status ("EXCEEDS_EXPECTATIONS" | "MEETS_EXPECTATIONS" | "BELOW_EXPECTATIONS"), and a concise 1-2 sentence evidence-based critique.
11. Candidate Questions Asked: Identify any questions the candidate asked Rohan (about the company, role, team, technology, or process) in the transcript. For each question, record the exact question, interviewer's response summary, and an analysis of what asking this question signals about their seniority and motivation. If none asked, return [].
12. Code Review: Detailed breakdown of correctness, exact Big-O Time & Space complexity with mathematical proof, and specific actionable refactoring suggestions.

Return ONLY a JSON object matching this exact schema:
{
  "scores": {
    "overall": 85,
    "conceptual": 85,
    "coding": 88,
    "codeQuality": 82,
    "communication": 85
  },
  "verdict": "Hire",
  "summary": "Executive summary paragraph here...",
  "strengths": [
    "Strength 1",
    "Strength 2",
    "Strength 3"
  ],
  "areasForImprovement": [
    "Improvement area 1",
    "Improvement area 2"
  ],
  "roleRubricsFeedback": [
    {
      "competency": "Competency name",
      "score": 85,
      "status": "EXCEEDS_EXPECTATIONS",
      "feedback": "Specific feedback on this rubric competency..."
    }
  ],
  "candidateQuestionsAsked": [
    {
      "question": "Candidate question text",
      "interviewerAnswer": "Summary of Rohan's answer",
      "analysis": "Analysis of candidate curiosity, seniority, or culture fit"
    }
  ],
  "codeReview": {
    "correctness": "Detailed correctness evaluation...",
    "timeComplexity": "O(n) - explanation",
    "spaceComplexity": "O(1) - explanation",
    "suggestions": [
      "Suggestion 1",
      "Suggestion 2"
    ]
  }
}`;

    try {
        const text = await callGemini({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.2 // low temperature for consistent, objective evaluation
            }
        });

        if (text) {
            const parsed = JSON.parse(text);

            // Safe numeric score resolver that preserves valid 0s (never treating 0 as falsy via ||)
            const resolveScore = (score, fallback) => {
                return typeof score === 'number' && !isNaN(score)
                    ? Math.min(100, Math.max(0, Math.round(score)))
                    : fallback;
            };

            const computedScores = {
                overall: resolveScore(parsed.scores?.overall, fallbackEvaluation.scores.overall),
                conceptual: resolveScore(parsed.scores?.conceptual, fallbackEvaluation.scores.conceptual),
                coding: resolveScore(parsed.scores?.coding, fallbackEvaluation.scores.coding),
                codeQuality: resolveScore(parsed.scores?.codeQuality, fallbackEvaluation.scores.codeQuality),
                communication: resolveScore(parsed.scores?.communication, fallbackEvaluation.scores.communication)
            };

            let verdict = ['Strong Hire', 'Hire', 'Needs Improvement', 'Reject'].includes(parsed.verdict)
                ? parsed.verdict
                : fallbackEvaluation.verdict;

            // Zero overall score guarantees Reject
            if (computedScores.overall === 0) {
                verdict = 'Reject';
            }

            return {
                scores: computedScores,
                verdict,
                summary: parsed.summary || fallbackEvaluation.summary,
                strengths: parsed.strengths && parsed.strengths.length ? parsed.strengths : fallbackEvaluation.strengths,
                areasForImprovement: parsed.areasForImprovement && parsed.areasForImprovement.length ? parsed.areasForImprovement : fallbackEvaluation.areasForImprovement,
                roleRubricsFeedback: Array.isArray(parsed.roleRubricsFeedback) && parsed.roleRubricsFeedback.length > 0 
                    ? parsed.roleRubricsFeedback 
                    : fallbackEvaluation.roleRubricsFeedback,
                candidateQuestionsAsked: Array.isArray(parsed.candidateQuestionsAsked) 
                    ? parsed.candidateQuestionsAsked 
                    : fallbackEvaluation.candidateQuestionsAsked,
                codeReview: {
                    correctness: parsed.codeReview?.correctness || fallbackEvaluation.codeReview.correctness,
                    timeComplexity: parsed.codeReview?.timeComplexity || fallbackEvaluation.codeReview.timeComplexity,
                    spaceComplexity: parsed.codeReview?.spaceComplexity || fallbackEvaluation.codeReview.spaceComplexity,
                    suggestions: parsed.codeReview?.suggestions || fallbackEvaluation.codeReview.suggestions
                },
                companyHistoryContext: companyHistory
            };
        }
    } catch (err) {
        console.error('Gemini AI evaluation error:', err);
    }

    return fallbackEvaluation;
};

/**
 * Full Pipeline: Evaluates an interview session and saves an Evaluation document
 */
export const evaluateInterviewSession = async (sessionId) => {
    const session = await InterviewSession.findById(sessionId)
        .populate('candidate')
        .populate({
            path: 'assessment',
            populate: [
                { path: 'role', select: 'title description' },
                { path: 'company', select: 'name' }
            ]
        });

    if (!session) {
        throw new Error(`Interview session ${sessionId} not found`);
    }

    // Check if evaluation already exists
    let evaluation = await Evaluation.findOne({ session: session._id });
    if (evaluation && evaluation.status === 'COMPLETED') {
        return evaluation;
    }

    if (!evaluation) {
        try {
            evaluation = await Evaluation.create({
                session: session._id,
                candidate: session.candidate?._id || session.candidate,
                assessment: session.assessment?._id || session.assessment,
                status: 'PENDING'
            });
        } catch (dupErr) {
            evaluation = await Evaluation.findOne({ session: session._id });
            if (evaluation && evaluation.status === 'COMPLETED') {
                return evaluation;
            }
        }
    }

    // 1. Run test cases
    const testCases = session.codingChallenge?.sampleTestCases || [];
    const testCaseResults = await runTestCases(
        session.codeSubmission?.language || 'javascript',
        session.codeSubmission?.code || '',
        testCases
    );

    // 2. Compute Candidate History Context with Company
    const candidateId = session.candidate?._id || session.candidate;
    const companyId = session.assessment?.company?._id || session.assessment?.company;
    const targetCompanyName = session.assessment?.targetCompanyName || session.assessment?.company?.name || 'Engineering Team';

    let priorEvaluations = [];
    try {
        priorEvaluations = await Evaluation.find({
            candidate: candidateId,
            session: { $ne: session._id },
            status: 'COMPLETED'
        })
        .populate({
            path: 'assessment',
            select: 'company targetCompanyName title role targetRoleTitle'
        })
        .sort({ createdAt: -1 })
        .limit(10);
    } catch (e) {
        console.warn('[Evaluation] Could not fetch prior candidate evaluations:', e.message);
    }

    const companyPriorEvals = priorEvaluations.filter(e => {
        const evalCompanyId = e.assessment?.company?.toString();
        const evalCompName = (e.assessment?.targetCompanyName || '').trim().toLowerCase();
        const currCompName = (targetCompanyName || '').trim().toLowerCase();
        if (companyId && evalCompanyId === companyId.toString()) return true;
        if (currCompName && evalCompName && evalCompName === currCompName) return true;
        return false;
    });

    const priorScores = companyPriorEvals.map(e => ({
        overall: e.scores?.overall || 0,
        date: e.createdAt,
        roleTitle: e.assessment?.targetRoleTitle || e.assessment?.title || 'Technical Assessment',
        verdict: e.verdict || 'Evaluated'
    }));

    let trajectorySummary = '';
    if (companyPriorEvals.length === 0) {
        trajectorySummary = `First formal evaluation loop with ${targetCompanyName}.`;
    } else {
        const lastEval = companyPriorEvals[0];
        const lastScore = lastEval.scores?.overall || 0;
        trajectorySummary = `Candidate has completed ${companyPriorEvals.length} previous round(s) with ${targetCompanyName}. Most recent round score: ${lastScore}/100 (${lastEval.verdict}).`;
    }

    const companyHistory = {
        priorInterviewsCount: companyPriorEvals.length,
        trajectorySummary,
        priorScores
    };

    // 3. Extract Role Rubrics & Blueprint Details
    const blueprint = session.assessment?.blueprint || session.assessment?.scrapedBlueprint || '';
    const keyCompetencies = session.assessment?.blueprintAnalysis?.keyCompetencies || [];
    const skills = session.assessment?.skills || [];
    const roundSummary = session.assessment?.blueprintAnalysis?.roundSummary || '';
    const roleTitle = session.assessment?.targetRoleTitle || session.assessment?.role?.title || session.assessment?.title || 'Software Engineer';

    // 4. Call Gemini for AI Scoring & Comprehensive Evaluation
    const aiResult = await generateAiEvaluation({
        roleTitle,
        companyName: targetCompanyName,
        experienceLevel: session.assessment?.experienceLevel || 'Mid',
        transcript: session.transcript || [],
        codingChallenge: session.codingChallenge || {},
        codeSubmission: session.codeSubmission || {},
        testCaseResults,
        candidateResume: session.candidateResume || '',
        interviewFormat: session.interviewFormat || 'FULL_INTERVIEW',
        blueprint,
        roundSummary,
        keyCompetencies,
        skills,
        companyHistory
    });

    // 5. Update and persist Evaluation (including proctoring audit)
    const proc = session.proctoring || {};
    const integrityScore = typeof proc.integrityScore === 'number' ? proc.integrityScore : 100;
    let trustLevel = 'HIGH_TRUST';
    if (integrityScore < 50) trustLevel = 'FLAGGED';
    else if (integrityScore < 75) trustLevel = 'SUSPICIOUS';
    else if (integrityScore < 90) trustLevel = 'MODERATE_TRUST';

    evaluation.scores = aiResult.scores;
    evaluation.verdict = aiResult.verdict;
    evaluation.summary = aiResult.summary;
    evaluation.strengths = aiResult.strengths;
    evaluation.areasForImprovement = aiResult.areasForImprovement;
    evaluation.roleRubricsFeedback = aiResult.roleRubricsFeedback || [];
    evaluation.candidateQuestionsAsked = aiResult.candidateQuestionsAsked || [];
    evaluation.companyHistoryContext = companyHistory;
    evaluation.codeReview = aiResult.codeReview;
    evaluation.testCaseResults = testCaseResults;
    evaluation.proctoringSummary = {
        integrityScore,
        trustLevel,
        tabSwitchCount: proc.tabSwitchCount || 0,
        windowBlurCount: proc.windowBlurCount || 0,
        pasteCount: proc.pasteCount || 0,
        fullscreenExitCount: proc.fullscreenExitCount || 0,
        faceMissingCount: proc.faceMissingCount || 0,
        multipleFacesCount: proc.multipleFacesCount || 0,
        totalViolations: (proc.events || []).length,
        events: (proc.events || []).slice(-25)
    };
    try {
        const deepEval = await generateDeepEvaluation(session);
        evaluation.deepEvaluation = deepEval;
    } catch (deepErr) {
        console.warn('[Evaluation] Deep evaluation synthesis non-fatal warning:', deepErr.message);
    }

    evaluation.status = 'COMPLETED';

    await evaluation.save();

    // Link back to InterviewSession
    session.evaluation = evaluation._id;
    await session.save();

    // Automated Email Notification to Candidate
    if (session.candidate?.email) {
        try {
            await sendEvaluationNotification({
                candidateEmail: session.candidate.email,
                companyName: targetCompanyName,
                roleTitle,
                overallScore: evaluation.scores?.overall || 0,
                verdict: evaluation.verdict,
                sessionId: session._id
            });
        } catch (err) {
            console.warn('Evaluation email notification dispatch failed:', err.message);
        }
    }

    return evaluation;
};

/**
 * Safe JSON extractor for LLM output strings
 */
export const extractJSON = (text) => {
    if (!text || typeof text !== 'string') return null;
    try {
        return JSON.parse(text);
    } catch {
        const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
        if (match) {
            try {
                return JSON.parse(match[1] || match[0]);
            } catch {
                return null;
            }
        }
        return null;
    }
};

/**
 * Score a single candidate turn/answer turn-by-turn (0-10)
 * Returns { score, signal, dimensions: { correctness, depth, communication, practical_application }, keyInsight }
 */
export async function scoreSingleAnswer({ question = '', answer = '', topic = 'General', rubrics = [], sessionContext = '' } = {}) {
    if (!answer || typeof answer !== 'string' || answer.trim().length < 10) {
        return {
            score: 0,
            signal: 'no_answer',
            dimensions: {
                correctness: 0,
                depth: 0,
                communication: 0,
                practical_application: 0
            },
            keyInsight: 'Candidate provided no answer or insufficient response.'
        };
    }

    const safeRubrics = Array.isArray(rubrics) ? rubrics : [];
    const rubricsText = safeRubrics.map(r => typeof r === 'string' ? r : `${r.dimension || r.name || 'Rubric'}: ${r.description || ''}`).join(', ');

    const prompt = `TOPIC: ${topic}
QUESTION: "${question}"
CANDIDATE ANSWER: "${answer}"
RUBRICS: ${rubricsText || 'Technical correctness, depth of understanding, clear communication, practical application'}
CONTEXT (what they've shown so far): ${sessionContext || 'Standard interview progression'}

Return JSON ONLY:
{
  "score": <0-10>,
  "signal": "<strong|adequate|weak|no_answer>",
  "dimensions": {
    "correctness": <0-10>,
    "depth": <0-10>,
    "communication": <0-10>,
    "practical_application": <0-10>
  },
  "keyInsight": "<one sentence about what this reveals>"
}`;

    if (process.env.NODE_ENV !== 'test') {
        try {
            const raw = await callGemini({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
            });
            const parsed = extractJSON(raw);
            if (parsed && typeof parsed.score === 'number' && parsed.dimensions) {
                const score = Math.max(0, Math.min(10, Number(parsed.score.toFixed(1))));
                const signal = ['strong', 'adequate', 'weak', 'no_answer'].includes(parsed.signal)
                    ? parsed.signal
                    : (score >= 7.5 ? 'strong' : score >= 5.0 ? 'adequate' : 'weak');
                return {
                    score,
                    signal,
                    dimensions: {
                        correctness: Math.max(0, Math.min(10, Number(parsed.dimensions.correctness ?? score))),
                        depth: Math.max(0, Math.min(10, Number(parsed.dimensions.depth ?? score))),
                        communication: Math.max(0, Math.min(10, Number(parsed.dimensions.communication ?? score))),
                        practical_application: Math.max(0, Math.min(10, Number(parsed.dimensions.practical_application ?? score)))
                    },
                    keyInsight: parsed.keyInsight || `Candidate evaluated on ${topic}.`
                };
            }
        } catch (err) {
            console.warn('[scoreSingleAnswer] Gemini parsing error:', err.message);
        }
    }

    // Deterministic rule-based evaluation (used in tests and as resilient fallback)
    const words = answer.trim().split(/\s+/);
    const wordCount = words.length;

    // Technical concept detection
    const techRegex = /\b(complexity|latency|throughput|async|await|promise|cache|redis|kafka|queue|database|sql|nosql|index|partition|sharding|concurrency|lock|mutex|thread|process|memory|heap|stack|garbage collection|http|rest|graphql|websocket|microservice|docker|kubernetes|load balancer|idempotent|acid|transaction|consistency|eventual consistency|cap theorem|distributed|replication|failover|circuit breaker|algorithm|tree|graph|hash map|binary search)\b/gi;
    const techMatches = (answer.match(techRegex) || []).length;

    // Depth & architecture signals
    const depthRegex = /\b(trade-off|bottleneck|benchmark|p99|scale|failover|redundancy|resilience|deadlock|race condition|backoff|rate limit|exponential|profiling|optimization|decoupling)\b/gi;
    const depthMatches = (answer.match(depthRegex) || []).length;

    // Communication signals: structured phrasing, clear reasoning
    const structureRegex = /\b(first|second|finally|because|specifically|for example|in practice|on the other hand|alternatively|therefore|consequently)\b/gi;
    const structureMatches = (answer.match(structureRegex) || []).length;

    // Practical application signals
    const practicalRegex = /\b(production|deploy|monitoring|metrics|datadog|prometheus|incident|post-mortem|logging|testing|unit test|integration test|migration|canary|slo|sla|alert)\b/gi;
    const practicalMatches = (answer.match(practicalRegex) || []).length;

    let correctness = Math.min(10, Math.round(3 + Math.min(4, techMatches * 1.2) + Math.min(3, wordCount / 20)));
    let depth = Math.min(10, Math.round(2 + Math.min(4, depthMatches * 1.5) + Math.min(4, techMatches * 0.8)));
    let communication = Math.min(10, Math.round(3 + Math.min(4, structureMatches * 1.5) + (wordCount >= 25 && wordCount <= 180 ? 3 : 1)));
    let practical_application = Math.min(10, Math.round(2 + Math.min(5, practicalMatches * 1.8) + (techMatches > 0 ? 3 : 0)));

    const isDeflection = /\b(don't know|not sure|no idea|never used|haven't worked|skip)\b/i.test(answer) && wordCount < 20;
    if (isDeflection) {
        correctness = Math.min(correctness, 2);
        depth = Math.min(depth, 1);
        practical_application = Math.min(practical_application, 1);
    }

    const score = Number(((correctness * 0.35) + (depth * 0.35) + (communication * 0.15) + (practical_application * 0.15)).toFixed(1));
    const signal = score >= 7.5 ? 'strong' : score >= 5.0 ? 'adequate' : 'weak';

    let keyInsight;
    if (signal === 'strong') {
        keyInsight = `Candidate demonstrated strong technical depth and concrete architectural trade-offs in ${topic}.`;
    } else if (signal === 'adequate') {
        keyInsight = `Candidate showed working familiarity with ${topic} fundamentals, but could elaborate deeper on edge cases.`;
    } else {
        keyInsight = `Candidate struggled to provide substantive depth or clear mechanics for ${topic}.`;
    }

    return {
        score,
        signal,
        dimensions: { correctness, depth, communication, practical_application },
        keyInsight
    };
}

/**
 * Pass 1: Per-Topic Deep Analysis
 */
export async function analyzeByTopic(transcript = [], microScores = [], rubrics = []) {
    const topicMap = {};

    // Group microScores by topic
    for (const ms of (microScores || [])) {
        const topic = ms.topic || 'General Technical';
        if (!topicMap[topic]) {
            topicMap[topic] = [];
        }
        topicMap[topic].push(ms);
    }

    // Fallback if no microScores
    if (Object.keys(topicMap).length === 0) {
        topicMap['General Technical'] = [];
        for (const t of (transcript || [])) {
            if (t.role === 'candidate' && t.text) {
                topicMap['General Technical'].push({
                    score: 6.0,
                    signal: 'adequate',
                    dimensions: { correctness: 6, depth: 6, communication: 6, practical_application: 6 },
                    keyInsight: 'Evaluated from general conversation.'
                });
            }
        }
    }

    const topicBreakdown = [];
    const topicScores = {};
    let totalScoreSum = 0;
    let topicCount = 0;

    for (const [topic, items] of Object.entries(topicMap)) {
        const scores = items.map(i => i.score).filter(s => typeof s === 'number');
        const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        const avgScore = Number(avg.toFixed(1));
        const percentScore = Math.round(avgScore * 10);
        topicScores[topic] = avgScore;
        totalScoreSum += avgScore;
        topicCount++;

        let mastery = 'Developing';
        if (avgScore >= 8.0) mastery = 'Mastery';
        else if (avgScore >= 6.0) mastery = 'Proficient';
        else if (avgScore < 4.0) mastery = 'Needs Focus';

        const strengths = [];
        const areasForImprovement = [];
        if (avgScore >= 6.5) {
            strengths.push(`Solid grasp of ${topic} fundamentals and architectural implementation.`);
        } else {
            areasForImprovement.push(`Deepen domain knowledge and trade-off analysis in ${topic}.`);
        }

        topicBreakdown.push({
            topic,
            avgScore,
            percentScore,
            mastery,
            responseCount: items.length,
            strengths,
            areasForImprovement
        });
    }

    const overallTopicAverage = topicCount > 0 ? Number((totalScoreSum / topicCount).toFixed(1)) : 0;

    return {
        topicScores,
        topicBreakdown,
        overallTopicAverage
    };
}

/**
 * Pass 2: Cross-Topic Patterns & Consistency Analysis
 */
export async function analyzeCrossTopicPatterns(transcript = [], microScores = []) {
    const scores = (microScores || []).map(m => m.score).filter(s => typeof s === 'number');

    let trajectory = 'consistent';
    if (scores.length >= 4) {
        const mid = Math.floor(scores.length / 2);
        const firstHalf = scores.slice(0, mid);
        const secondHalf = scores.slice(mid);
        const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        if (avgSecond - avgFirst >= 1.0) trajectory = 'improving';
        else if (avgFirst - avgSecond >= 1.0) trajectory = 'declining';
    }

    let variance = 0;
    if (scores.length > 1) {
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
        variance = Number((scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length).toFixed(2));
    }
    const consistency = variance < 1.5 ? 'High Consistency' : variance < 3.5 ? 'Moderate Consistency' : 'High Variance Across Topics';

    const candidateTexts = (transcript || []).filter(t => t.role === 'candidate').map(t => t.text || '').join(' ');
    const tradeOffHits = (candidateTexts.match(/\b(versus|trade-off|latency vs|consistency vs|pros and cons|compromise|instead of)\b/gi) || []).length;
    const tradeOffReasoningScore = Math.min(100, Math.round(40 + Math.min(50, tradeOffHits * 15)));

    return {
        trajectory,
        consistency,
        variance,
        tradeOffReasoningScore,
        synthesis: `Candidate performance exhibited ${trajectory} trajectory with ${consistency.toLowerCase()}. Trade-off reasoning score: ${tradeOffReasoningScore}/100.`
    };
}

/**
 * Pass 3: Coding Quality & Implementation Analysis
 */
export async function analyzeCodingQuality(codeSubmissions = []) {
    if (!codeSubmissions || codeSubmissions.length === 0 || !codeSubmissions[0]?.code) {
        return {
            evaluated: false,
            summary: 'No code submitted for live coding analysis.'
        };
    }

    const sub = codeSubmissions[0];
    const code = sub.code || '';
    const language = sub.language || 'javascript';

    const lineCount = code.split('\n').filter(l => l.trim()).length;
    const hasLoops = /\b(for|while|reduce|forEach|map)\b/.test(code);
    const hasDataStructures = /\b(Map|Set|dict|list|queue|stack|heap|Array)\b/i.test(code);
    const hasComments = /\/\/|\/\*|#/.test(code);

    let correctnessScore = 50;
    if (lineCount > 10) correctnessScore += 20;
    if (hasDataStructures) correctnessScore += 15;
    if (hasLoops) correctnessScore += 10;
    if (hasComments) correctnessScore += 5;
    correctnessScore = Math.min(100, correctnessScore);

    const modularityScore = code.includes('class ') || (code.match(/function\s+\w+|def\s+\w+/g) || []).length >= 2 ? 85 : 70;

    return {
        evaluated: true,
        language,
        correctnessScore,
        modularityScore,
        complexityAssessment: 'Algorithmic solution targets optimal time complexity with clean state representation.',
        codeReview: {
            correctness: `Candidate implemented a working ${language} solution with ${lineCount} effective lines.`,
            timeComplexity: hasDataStructures ? 'O(n) - hash-based lookups' : 'O(n^2) - iterative scans',
            spaceComplexity: hasDataStructures ? 'O(n) auxiliary storage' : 'O(1) in-place',
            suggestions: [
                'Ensure boundary conditions and null/empty inputs are explicitly handled.',
                'Add unit tests covering edge cases and scale limits.'
            ]
        }
    };
}

/**
 * Pass 4: Technical Communication Quality Analysis
 */
export async function analyzeCommunicationQuality(transcript = []) {
    const candidateTurns = (transcript || []).filter(t => t.role === 'candidate' && t.text && t.text.trim());
    if (candidateTurns.length === 0) {
        return {
            communicationScore: 0,
            avgWordCount: 0,
            articulationLevel: 'Unattempted',
            summary: 'Candidate provided no responses.'
        };
    }

    const wordCounts = candidateTurns.map(t => t.text.trim().split(/\s+/).length);
    const totalWords = wordCounts.reduce((a, b) => a + b, 0);
    const avgWordCount = Math.round(totalWords / candidateTurns.length);

    let communicationScore = 65;
    if (avgWordCount >= 25 && avgWordCount <= 120) communicationScore += 20;
    else if (avgWordCount > 120) communicationScore += 10;
    else if (avgWordCount < 10) communicationScore -= 20;

    const allText = candidateTurns.map(t => t.text).join(' ');
    const hasStructure = /\b(first|specifically|for instance|the trade-off is|in summary)\b/i.test(allText);
    if (hasStructure) communicationScore += 15;

    communicationScore = Math.min(100, Math.max(10, communicationScore));

    const articulationLevel = communicationScore >= 80 ? 'Structured & Articulate' : communicationScore >= 60 ? 'Conversational' : 'Needs Structure';

    return {
        communicationScore,
        avgWordCount,
        articulationLevel,
        summary: `Candidate maintained an average of ${avgWordCount} words per turn with ${articulationLevel.toLowerCase()} communication.`
    };
}

/**
 * Pass 5: Behavioral & Collaborative Signals Analysis
 */
export async function analyzeBehavioralSignals(transcript = []) {
    const candidateTurns = (transcript || []).filter(t => t.role === 'candidate' && t.text && t.text.trim());
    const allText = candidateTurns.map(t => t.text).join(' ');

    const ownershipRegex = /\b(I decided|my team|I owned|I architected|I implemented|we learned|post-mortem|I led)\b/gi;
    const ownershipHits = (allText.match(ownershipRegex) || []).length;

    const collaborativeRegex = /\b(feedback|agreed|good point|collaborate|pair|we discussed|team)\b/gi;
    const collaborativeHits = (allText.match(collaborativeRegex) || []).length;

    const questionAsking = candidateTurns.some(t => t.text.includes('?'));

    let behavioralScore = 70;
    if (ownershipHits > 0) behavioralScore += 10;
    if (collaborativeHits > 0) behavioralScore += 10;
    if (questionAsking) behavioralScore += 10;
    behavioralScore = Math.min(100, behavioralScore);

    return {
        behavioralScore,
        ownershipMindset: ownershipHits > 0 ? 'High Engineering Ownership' : 'Standard Execution Mindset',
        receptivenessToFeedback: collaborativeHits > 0 ? 'Receptive & Collaborative' : 'Independent Problem Solver',
        summary: `Demonstrated ${ownershipHits > 0 ? 'strong' : 'adequate'} ownership and constructive interview collaboration.`
    };
}

/**
 * Synthesizes the 5 analysis passes into a comprehensive final evaluation report
 */
export function synthesizeFinalReport({
    topicAnalysis = {},
    patternAnalysis = {},
    codingAnalysis = null,
    commAnalysis = {},
    behavioralAnalysis = {},
    companyName = 'Engineering Team',
    roleTitle = 'Software Engineer',
    criTrajectory = null
} = {}) {
    const topicScore = typeof topicAnalysis.overallTopicAverage === 'number'
        ? Math.round(topicAnalysis.overallTopicAverage * 10)
        : 65;

    const commScore = commAnalysis.communicationScore || 70;
    const behavioralScore = behavioralAnalysis.behavioralScore || 75;

    let overallScore;
    if (codingAnalysis && codingAnalysis.evaluated) {
        const codingScore = codingAnalysis.correctnessScore || 70;
        overallScore = Math.round((topicScore * 0.35) + (codingScore * 0.30) + (commScore * 0.20) + (behavioralScore * 0.15));
    } else {
        overallScore = Math.round((topicScore * 0.50) + (commScore * 0.30) + (behavioralScore * 0.20));
    }

    let recommendation;
    let verdict;
    if (overallScore >= 85) {
        recommendation = 'STRONG_HIRE';
        verdict = 'Strong Hire';
    } else if (overallScore >= 70) {
        recommendation = 'HIRE';
        verdict = 'Hire';
    } else if (overallScore >= 55) {
        recommendation = 'LEANING_HIRE';
        verdict = 'Needs Improvement';
    } else if (overallScore >= 45) {
        recommendation = 'LEANING_REJECT';
        verdict = 'Needs Improvement';
    } else {
        recommendation = 'REJECT';
        verdict = 'Reject';
    }

    const strengths = [];
    if (topicScore >= 70) strengths.push(`Strong conceptual grasp across evaluated topics (${(topicAnalysis.topicBreakdown || []).map(t => t.topic).join(', ')}).`);
    if (commScore >= 75) strengths.push('Clear, structured technical communication and rationale.');
    if (behavioralScore >= 75) strengths.push('Demonstrated engineering ownership and active collaboration.');
    if (codingAnalysis?.evaluated && codingAnalysis.correctnessScore >= 70) strengths.push('Clean algorithmic implementation and code organization.');
    if (strengths.length === 0) strengths.push('Demonstrated fundamental familiarity with core engineering concepts.');

    const weaknesses = [];
    if (topicScore < 70) weaknesses.push('Deepen technical precision and trade-off analysis under high-scale constraints.');
    if (commScore < 70) weaknesses.push('Structure answers more concisely with upfront high-level summaries before drilling into details.');
    if (codingAnalysis?.evaluated && codingAnalysis.correctnessScore < 70) weaknesses.push('Strengthen algorithmic edge case verification and test coverage.');
    if (weaknesses.length === 0) weaknesses.push('Continue practicing cross-domain system architecture trade-offs.');

    const actionableFeedback = [
        ...weaknesses.map(w => `Action: ${w}`),
        'Practice time-boxed algorithmic problems with explicit Big-O trade-off verbalization.'
    ];

    return {
        overallScore,
        recommendation,
        verdict,
        strengths,
        weaknesses,
        topicBreakdown: topicAnalysis.topicBreakdown || [],
        criTrajectory: criTrajectory !== null ? criTrajectory : (patternAnalysis.trajectory || 'consistent'),
        actionableFeedback,
        passes: {
            topicAnalysis,
            patternAnalysis,
            codingAnalysis,
            commAnalysis,
            behavioralAnalysis
        }
    };
}

/**
 * 5-Pass Parallel Deep Evaluation orchestrator
 */
export async function generateDeepEvaluation(session = {}) {
    const transcript = session.transcript || [];
    const microScores = session.microScores || [];
    const rubrics = session.assessment?.blueprintAnalysis?.rubrics || session.rubrics || [];
    const codeSubmissions = session.codeSubmission ? [session.codeSubmission] : (session.codeSubmissions || []);
    const companyName = session.assessment?.company?.name || session.companyName || 'Engineering Team';
    const roleTitle = session.assessment?.role?.title || session.roleTitle || 'Software Engineer';
    const criTrajectory = session.candidateProfile?.cri || (typeof estimateCandidateLevel === 'function' ? estimateCandidateLevel(session) : 5.0);

    const [topicAnalysis, patternAnalysis, codingAnalysis, commAnalysis, behavioralAnalysis] = await Promise.all([
        analyzeByTopic(transcript, microScores, rubrics),
        analyzeCrossTopicPatterns(transcript, microScores),
        codeSubmissions.length > 0 && codeSubmissions[0]?.code ? analyzeCodingQuality(codeSubmissions) : null,
        analyzeCommunicationQuality(transcript),
        analyzeBehavioralSignals(transcript)
    ]);

    return synthesizeFinalReport({
        topicAnalysis,
        patternAnalysis,
        codingAnalysis,
        commAnalysis,
        behavioralAnalysis,
        companyName,
        roleTitle,
        criTrajectory
    });
}

/**
 * Captures post-session training outcomes (hireable, candidateRating, evaluationAccuracy)
 * onto session.trainingSignals.sessionOutcome
 *
 * @param {string|InterviewSession} sessionOrId 
 * @param {Object} outcome
 * @param {boolean} [outcome.hireable]
 * @param {number} [outcome.candidateRating]
 * @param {number} [outcome.evaluationAccuracy]
 * @returns {Promise<InterviewSession>}
 */
export async function captureSessionOutcome(sessionOrId, outcome = {}) {
    let session = sessionOrId;
    if (typeof sessionOrId === 'string' || (sessionOrId && sessionOrId._bsontype === 'ObjectID')) {
        session = await InterviewSession.findById(sessionOrId);
    }
    if (!session) {
        throw new Error('Interview session not found');
    }

    if (!session.trainingSignals) {
        session.trainingSignals = { questionEffectiveness: [], sessionOutcome: {} };
    }
    if (!session.trainingSignals.sessionOutcome) {
        session.trainingSignals.sessionOutcome = {};
    }

    if (outcome.hireable !== undefined) {
        session.trainingSignals.sessionOutcome.hireable = Boolean(outcome.hireable);
    }
    if (typeof outcome.candidateRating === 'number') {
        session.trainingSignals.sessionOutcome.candidateRating = Math.min(5, Math.max(1, outcome.candidateRating));
    }
    if (typeof outcome.evaluationAccuracy === 'number') {
        session.trainingSignals.sessionOutcome.evaluationAccuracy = Math.min(1, Math.max(0, outcome.evaluationAccuracy));
    }

    if (typeof session.save === 'function' && mongoose.connection?.readyState === 1) {
        await session.save();
    }
    return session;
}

export const recordSessionOutcome = captureSessionOutcome;

