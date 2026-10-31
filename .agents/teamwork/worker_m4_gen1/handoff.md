# Milestone 4 Handoff Report: Progressive Evaluation & Live Collaborative Coding

## 1. Observation
- **Candidate Profile Tracker (`backend/src/utils/candidateProfileTracker.js`)**:
  - Implemented `updateCandidateProfile(session, topicKey, microScore)` with Exponential Moving Average (EMA) $\alpha = 0.4$ on `topicScores[topicKey]`:
    `alpha * scoreVal + (1 - alpha) * previousTopicScore`
  - Implemented `rollingAvg(currentAvg, nextVal, count)` computing incremental average.
  - Implemented `calculateCandidateReadinessIndex(profile)` computing composite CRI (45% topic mastery, 35% technical depth, 20% communication) bounded in $[0, 10]$.
  - Implemented `overallSignal` determination: `'strong'` for average $\ge 7.5$, `'adequate'` for $\ge 5.0$, `'weak'` for $< 5.0$, and `'unknown'` on empty state.
  - Implemented `weakTopics` tracking for topics with score $< 6.0$.
  - Exported `estimateCandidateLevel(session)` for dynamic question/problem adaptation.

- **Coding Problem Engine (`backend/src/services/codingProblemEngine.js`)**:
  - Defined `CURATED_PROBLEM_CATALOG` with LeetCode-standard challenges across Easy (Two Sum, Valid Parentheses, Best Time to Buy and Sell Stock), Medium (LRU Cache, Longest Substring Without Repeating Characters, Number of Islands, Course Schedule), and Hard (Trapping Rain Water, Merge k Sorted Lists).
  - Each catalog item includes `description`, `functionDescription`, `inputFormat`, `outputFormat`, `constraints`, `starterCode` (multi-language Python and JavaScript), `sampleTestCases`, `testCases`, `timeComplexityTarget`, and `spaceComplexityTarget`.
  - Implemented `scrapeCompanyCodingProblems(options)` with scoring by topic overlap and company affiliation, falling back gracefully to difficulty-matched problems in offline/test environments.
  - Implemented `selectCodingProblem(candidateProfile, companyIntel)` mapping `overallSignal` to difficulty (`'strong'` $\to$ `'hard'`, `'adequate'` $\to$ `'medium'`, `'weak'` $\to$ `'easy'`) and matching topics against `candidateProfile.weakTopics` and `companyIntel.focusAreas`.

- **Progressive & Multi-Pass Evaluation (`backend/src/services/evaluation.service.js`)**:
  - Implemented `scoreSingleAnswer({ question, answer, topic, rubrics, sessionContext })`:
    - Handles short/empty answers ($< 10$ characters) as `{ score: 0, signal: 'no_answer', dimensions: { correctness: 0, depth: 0, communication: 0, practical_application: 0 }, keyInsight: 'Candidate provided no answer or insufficient response.' }`.
    - Handles technical responses by evaluating correctness, depth, communication, and practical application, with Gemini generation in production and deterministic rule-based analysis in test/offline fallback.
  - Implemented 5 parallel analysis passes:
    1. `analyzeByTopic(transcript, microScores, rubrics)`
    2. `analyzeCrossTopicPatterns(transcript, microScores)`
    3. `analyzeCodingQuality(codeSubmissions)`
    4. `analyzeCommunicationQuality(transcript)`
    5. `analyzeBehavioralSignals(transcript)`
  - Implemented `synthesizeFinalReport(...)` producing composite `overallScore`, `recommendation` (`'STRONG_HIRE'`, `'HIRE'`, `'LEANING_HIRE'`, `'LEANING_REJECT'`, `'REJECT'`), `verdict` (`'Strong Hire'`, `'Hire'`, `'Needs Improvement'`, `'Reject'`), `strengths`, `weaknesses`, `topicBreakdown`, `criTrajectory`, and `actionableFeedback`.
  - Implemented `generateDeepEvaluation(session)` orchestrating the 5 passes via `Promise.all`.
  - Preserved full backward compatibility for `evaluateInterviewSession(sessionId)`.
  - Added `deepEvaluation` field to `backend/src/models/evaluation.model.js`.

- **WebSocket Integration (`backend/src/ws/interviewSocket.js`)**:
  - Implemented `generateCodeObservation(code, language, session)` providing 1-2 sentence real-time peer observation commentary on code snapshots.
  - On candidate turn (`TEXT_MESSAGE` / `AUDIO_CHUNK` transcribed):
    - Computes `microScore` via `scoreSingleAnswer`.
    - Appends entry to `session.microScores`.
    - Updates `session.candidateProfile` via `updateCandidateProfile`.
    - Sends `{ type: 'CRI_UPDATE', cri: profile.candidateReadinessIndex || profile.cri, signal: profile.overallSignal }` over WebSocket.
  - On `CODE_SNAPSHOT`:
    - Updates `session.liveCode` and `session.codeSubmission`.
    - Manages debounced timer `state.codeCommentTimer` (8s default, configurable via `process.env.CODE_COMMENT_DEBOUNCE_MS`).
    - Dispatches `{ type: 'AI_CODE_COMMENT', text: comment }` when generated.
    - Cleans up timer on socket `close`.

- **Dual Sandbox Verification (`backend/src/services/sandbox.service.js`)**:
  - Verified `executeCode` cleanly attempts Docker execution first and falls back without throwing to isolated `child_process` sandbox execution.
  - Verified JavaScript execution, Python execution, and timeout termination on infinite loops.

- **Test Results**:
  - `node backend/tests/progressiveEvaluation.test.js`:
    `RESULTS: 47 passed, 0 failed, 47 total` (exit code 0)
  - `node backend/tests/websocketInterview.test.js`:
    `RESULTS: 28 passed, 0 failed, 28 total` (exit code 0)
  - `node backend/tests/interviewEvaluation.test.js`:
    `ALL INTERVIEW & EVALUATION PIPELINE TESTS PASSED (100%)` (exit code 0)
  - `node backend/tests/integration.test.js`:
    `RESULTS: 62 passed, 0 failed, 62 total` (exit code 0, zero regressions)

## 2. Logic Chain
1. From Observation 1, `updateCandidateProfile` uses $\alpha = 0.4$ on historical topic scores, smoothing single-turn variance while adapting to candidate performance. When a candidate answers poorly on a topic ($< 6.0$), it is added to `weakTopics`.
2. From Observation 2, `selectCodingProblem` checks `candidateProfile.overallSignal` to select an appropriately leveled challenge (hard for strong, medium for adequate, easy for weak) and matches candidate weak topics and company focus areas.
3. From Observation 3, `scoreSingleAnswer` and `generateDeepEvaluation` evaluate individual answers turn-by-turn and provide a comprehensive 5-pass final report. Existing evaluation tests in `interviewEvaluation.test.js` and `integration.test.js` continue to pass without changes because all legacy return structures are preserved.
4. From Observation 4, the WebSocket handler at `/ws/interview` now emits `CRI_UPDATE` on candidate turns and debounces `AI_CODE_COMMENT` on code snapshots, fulfilling real-time IDE and progressive evaluation requirements while passing all 28 existing WebSocket tests.
5. From Observation 5 & 6, dual sandbox fallback executes code in isolated child processes when Docker is not active, verified through automated test suites.

## 3. Caveats
- Real-time Gemini calls in `scoreSingleAnswer` and `generateCodeObservation` require an active `GEMINI_API_KEY` and non-test environment (`process.env.NODE_ENV !== 'test'`). In test/offline environments, deterministic rule-based evaluators run automatically.
- Code observation debounce defaults to 8000ms for natural human interviewer rhythm. In unit tests, `process.env.CODE_COMMENT_DEBOUNCE_MS = '60'` is used for fast test completion.

## 4. Conclusion
Milestone 4 (Progressive Evaluation & Live Collaborative Coding) is 100% complete, verified, and regression-free. All 62 existing integration tests, 28 WebSocket tests, evaluation unit tests, and 47 new progressive evaluation unit/integration tests pass cleanly.

## 5. Verification Method
Run the following commands in the workspace root:
```bash
node backend/tests/progressiveEvaluation.test.js
node backend/tests/websocketInterview.test.js
node backend/tests/interviewEvaluation.test.js
node backend/tests/integration.test.js
```
Expected output:
- `progressiveEvaluation.test.js`: 47 passed, 0 failed
- `websocketInterview.test.js`: 28 passed, 0 failed
- `interviewEvaluation.test.js`: ALL INTERVIEW & EVALUATION PIPELINE TESTS PASSED (100%)
- `integration.test.js`: 62 passed, 0 failed

