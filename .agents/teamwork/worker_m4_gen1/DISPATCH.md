## 2026-10-30T18:17:32Z
You are worker_m4_gen1. Your working directory is:
c:\Users\pratheek\OneDrive\Documents\VoxCode\.agents\teamwork\worker_m4_gen1\

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY READING:
- c:\Users\pratheek\OneDrive\Documents\VoxCode\.agents\teamwork\ORIGINAL_REQUEST.md
- c:\Users\pratheek\OneDrive\Documents\VoxCode\PROJECT.md
- C:\Users\pratheek\.gemini\antigravity\brain\b96f18cf-b1bf-4f4c-ba3a-6b8d0ad2e40a\REAL_INTERVIEW_UPGRADE_PLAN.md (Phases 4 & 5)

TASK: Complete Milestone 4 — Progressive Evaluation & Live Collaborative Coding:
1. Candidate Profile Tracker (`backend/src/utils/candidateProfileTracker.js`):
   - Implement `updateCandidateProfile(session, topicKey, microScore)`
   - Exponential moving average (EMA) on `topicScores[topicKey]` with alpha = 0.4
   - Rolling average for `communicationScore` and `technicalDepth`
   - Calculate composite CRI (Candidate Readiness Index, 0-10 or 0-100 scale, composite of topicScores, technicalDepth, communicationScore)
   - Determine `overallSignal` ('strong' for avg >= 7.5, 'adequate' for avg >= 5.0, 'weak' for < 5.0)
   - Track `weakTopics` (topics with score < 6.0)
   - Export helper functions (`rollingAvg`, `calculateCandidateReadinessIndex`, etc.)

2. Coding Problem Engine (`backend/src/services/codingProblemEngine.js`):
   - Implement `selectCodingProblem(candidateProfile, companyIntel)`
   - Map `candidateProfile.overallSignal` to difficulty: 'strong' -> 'hard', 'adequate' -> 'medium', 'weak' -> 'easy' (fallback 'medium')
   - Match topics against candidateProfile.weakTopics and companyIntel.focusAreas
   - Implement curated and scraped problem catalog (with problem description, starter code in python/javascript, test cases with input/output, time complexity target)
   - Implement `scrapeCompanyCodingProblems(options)` with robust offline/mock fallback

3. Progressive & Multi-Pass Evaluation (`backend/src/services/evaluation.service.js`):
   - Implement `scoreSingleAnswer({ question, answer, topic, rubrics, sessionContext })`:
     - Returns `{ score, signal, dimensions: { correctness, depth, communication, practical_application }, keyInsight }`
     - Handles empty/short answer (< 10 chars) as `{ score: 0, signal: 'no_answer', ... }`
     - Calls Gemini or rule-based evaluator with deterministic fallback in test environment
   - Implement 5-pass deep evaluation (`generateDeepEvaluation(session)`):
     - `analyzeByTopic(transcript, microScores, rubrics)`
     - `analyzeCrossTopicPatterns(transcript, microScores)`
     - `analyzeCodingQuality(codeSubmissions)`
     - `analyzeCommunicationQuality(transcript)`
     - `analyzeBehavioralSignals(transcript)`
     - `synthesizeFinalReport(...)`: produces comprehensive report (overallScore, recommendation, strengths, weaknesses, topicBreakdown, criTrajectory, actionableFeedback)
   - Ensure existing `evaluateInterviewSession` remains compatible and passes existing tests!

4. WebSocket Integration (`backend/src/ws/interviewSocket.js`):
   - Handle `CODE_SNAPSHOT`:
     - Store `session.liveCode = msg.code`
     - Debounce with 8s timer `session.codeCommentTimer`
     - Generate observation commentary via `generateCodeObservation(code, language, session)`
     - Send `{ type: 'AI_CODE_COMMENT', text: comment }` when generated
   - In candidate response handling (text message or audio transcribe):
     - Compute microScore using `scoreSingleAnswer`
     - Update candidate profile using `updateCandidateProfile`
     - Send `{ type: 'CRI_UPDATE', cri: profile.candidateReadinessIndex || profile.cri, signal: profile.overallSignal }`

5. Verify Dual Sandbox Execution (`backend/src/services/sandbox.service.js`):
   - Ensure `executeCode` cleanly falls back from Docker to child_process sandbox.

6. Testing:
   - Create comprehensive unit test suite: `backend/tests/progressiveEvaluation.test.js`
   - Run tests:
     `node backend/tests/progressiveEvaluation.test.js`
     `node backend/tests/websocketInterview.test.js`
     `node backend/tests/interviewEvaluation.test.js`
     `node backend/tests/integration.test.js` (MUST PASS 62/62 with zero regressions)
   - Document commands, test results, and file paths in `handoff.md`.
   - Send completion message to parent when done.
