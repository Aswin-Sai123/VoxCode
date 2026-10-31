# Milestone 5 Handoff Report: Self-Improving Training Loop & Data Architecture

## 1. Observation
- Dispatch requirement: Implement Milestone 5 — Self-Improving Training Loop & Data Architecture.
- Files requested:
  - `backend/scripts/calibrateEvaluation.js`: Export `runCalibrationPass`, `computeCalibrationAdjustments`.
  - `backend/scripts/optimizeQuestionBank.js`: Export `analyzeQuestionEffectiveness`, `improveQuestion`.
  - `backend/src/ws/interviewSocket.js`: Record `trainingSignals.questionEffectiveness` (`question`, `candidateSignal`: `'strong_answer' | 'adequate' | 'confused' | 'deflected' | 'weak'`, `topicCoverage`: 0-1, `discriminativeness`: 0-1) on each turn.
  - `backend/src/services/evaluation.service.js` or `backend/src/controllers/interview.controller.js`: Allow capturing post-session outcomes (`hireable`, `candidateRating`, `evaluationAccuracy`) onto `session.trainingSignals.sessionOutcome`.
  - `backend/src/models/calibrationConfig.model.js`: Schema required `sampleCount` field alongside `adjustments`, `accuracy`, and `updatedAt`.
  - `backend/tests/trainingLoop.test.js`: Comprehensive test suite verifying calibration calculations, question effectiveness learning loop, question sharpener, and signal capture.
- Executed verification commands and outputs:
  - `node backend/tests/trainingLoop.test.js`
    ```
    RESULTS: 57 passed, 0 failed, 57 total
    ```
  - `node backend/tests/progressiveEvaluation.test.js`
    ```
    RESULTS: 47 passed, 0 failed, 47 total
    ```
  - `node backend/tests/websocketInterview.test.js`
    ```
    RESULTS: 28 passed, 0 failed, 28 total
    ```
  - `node backend/tests/integration.test.js`
    ```
    RESULTS: 62 passed, 0 failed, 62 total
    ```
  - `node backend/tests/models.test.js`
    ```
    RESULTS: 67 passed, 0 failed, 67 total
    ```
  - `node backend/tests/interviewEvaluation.test.js`
    ```
    ALL INTERVIEW & EVALUATION PIPELINE TESTS PASSED (100%)
    ```

## 2. Logic Chain
1. **Calibration Pipeline Design**:
   - `computeCalibrationAdjustments(recalibrations)` groups comparisons across score bands (`low: 0-59`, `mid: 60-79`, `high: 80-100`).
   - For each band, calculates delta between AI predicted score and human ground truth (`humanHire ? 80 : 45`). Dampens adjustment using a learning rate of 0.5 and clamps to $[-15, 15]$.
   - Dynamically tunes `recommendationThreshold` based on the balance of false positives vs. false negatives.
   - `runCalibrationPass` queries uncalibrated sessions with `trainingSignals.sessionOutcome.hireable` (or accepts `options.sessions`), runs calibration, marks `calibrated: true`, and upserts `CalibrationConfig` with adjustments, accuracy percentage, sample count, and timestamp.
2. **Question Bank Learning Loop**:
   - `analyzeQuestionEffectiveness(options)` aggregates `trainingSignals.questionEffectiveness` from MongoDB or passed sessions/mockData.
   - Calculates `avgDiscriminativeness`, `avgTopicCoverage`, and response volume (`count`).
   - Identifies underperforming questions (`avgDiscriminativeness < 0.35` and `count >= 5`).
   - Calls `improveQuestion` to generate sharper replacements with clear production constraints (TPS, memory bounds, Big-O) and probing questions.
   - Updates `QuestionBank`: marks weak questions as `status: 'retired'` with a replacement pointer, and registers replacement questions as `status: 'active'`. Updates metrics on healthy questions.
3. **Session Training Signal Telemetry**:
   - Implemented `calculateQuestionEffectivenessSignal(question, answer, microScore)` in `backend/src/ws/interviewSocket.js` and exported it.
   - Identifies candidate confusion (e.g., "don't know", "can you clarify", "no idea" or `no_answer` signal), deflection (e.g., "skip this", "different question"), strong answers ($\ge 7.5$), weak answers ($< 5.0$), and adequate responses.
   - Computes normalized `topicCoverage` ($0-1$) and `discriminativeness` ($0-1$).
   - Records to `session.trainingSignals.questionEffectiveness` on every WebSocket turn and also in REST `sendCandidateMessage`.
4. **Session Outcome Capture**:
   - Implemented `captureSessionOutcome(sessionOrId, outcome)` and `recordSessionOutcome` in `backend/src/services/evaluation.service.js`.
   - Supports passing session instance or ObjectId/string ID.
   - Implemented controller `recordSessionOutcomeController` in `backend/src/controllers/interview.controller.js` and mounted routes `/session/:sessionId/outcome` in `backend/src/routes/interview.routes.js`.
   - Integrated automatic outcome capture in `updateRecruiterDecision` in `backend/src/controllers/evaluation.controller.js` when companies shortlist or reject candidates.
5. **Non-Blocking Safety & Backward Compatibility**:
   - Handled cases where Mongoose is not connected to a live database (`readyState !== 1`) to ensure in-memory unit tests execute instantaneously without buffering timeouts.
   - Maintained complete backwards compatibility, confirmed by all 62 integration tests passing with 0 regressions.

## 3. Caveats
- Real Gemini LLM generation in `improveQuestion` activates when `process.env.GEMINI_API_KEY` is present and `NODE_ENV !== 'test'`. In test environments, a deterministic rule-based question sharpener executes to ensure tests remain completely reliable and fast without external network dependencies.
- No other caveats.

## 4. Conclusion
Milestone 5 is fully implemented, verified, and complete. All requested functions (`runCalibrationPass`, `computeCalibrationAdjustments`, `analyzeQuestionEffectiveness`, `improveQuestion`, `calculateQuestionEffectivenessSignal`, `captureSessionOutcome`, `recordSessionOutcome`) are genuine, tested, and operational. All existing test suites pass with zero regressions (62/62 integration tests, 47/47 progressive evaluation tests, 28/28 websocket interview tests, 67/67 models tests, 57/57 training loop tests).

## 5. Verification Method
To independently verify the implementation:
1. Run the training loop unit tests:
   ```bash
   node backend/tests/trainingLoop.test.js
   ```
   *Expected*: 57 passing tests covering calibration adjustments, calibration pass, question improvement, question effectiveness analysis, signal calculation, outcome capture, and live MongoDB integration.
2. Run progressive evaluation tests:
   ```bash
   node backend/tests/progressiveEvaluation.test.js
   ```
   *Expected*: 47 passing tests.
3. Run WebSocket interview tests:
   ```bash
   node backend/tests/websocketInterview.test.js
   ```
   *Expected*: 28 passing tests.
4. Run integration regression suite:
   ```bash
   node backend/tests/integration.test.js
   ```
   *Expected*: 62 passing tests with 0 failures.
5. Invalidation conditions:
   - Any test failure in `trainingLoop.test.js`.
   - Regressions in `integration.test.js` (< 62 passes).
   - `runCalibrationPass` or `computeCalibrationAdjustments` not exported from `backend/scripts/calibrateEvaluation.js`.
   - `analyzeQuestionEffectiveness` or `improveQuestion` not exported from `backend/scripts/optimizeQuestionBank.js`.
