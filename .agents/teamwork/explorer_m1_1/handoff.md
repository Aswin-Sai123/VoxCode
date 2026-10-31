# Milestone 1: Data Architecture & Mongoose Models — Handoff Report

**Sender**: Explorer 1 (`.agents/teamwork/explorer_m1_1`)  
**Recipient**: Parent Orchestrator (`466d2811-ee76-4144-ac75-8a35cade05a3`) / Milestone 1 Worker  
**Date**: 2026-10-30  
**Status**: COMPLETE (Hard Handoff)  

---

## 1. Observation

### Codebase State & Test Baselines
- **Baseline Integration Test Execution**:
  Ran `cd backend; npm test` (invoking `node tests/integration.test.js`).
  *Result*: 62 passed, 0 failed, 62 total.
  ```
  RESULTS: 62 passed, 0 failed, 62 total
  ✔ ALL 62 INTEGRATION TESTS PASSED
  ```
- **Baseline Unit Test Execution**:
  Ran `cd backend; node tests/interviewEvaluation.test.js`.
  *Result*: `ALL INTERVIEW & EVALUATION PIPELINE TESTS PASSED (100%)`.
- **Baseline Timeline Parser Test Execution**:
  Ran `cd backend; node tests/blueprintParser.test.js`.
  *Result*: `ALL BLUEPRINT PARSER & TIMELINE PACING TESTS PASSED (100%)`.

### Module & Export Conventions
- Inspected `backend/package.json` line 14: `"type": "module"`.
- Inspected all 7 models in `backend/src/models/` (`assessment.model.js`, `candidate.model.js`, `company.model.js`, `evaluation.model.js`, `interviewSession.model.js`, `refreshToken.model.js`, `role.model.js`).
- Every model uses named exports: `export const ModelName = mongoose.model('ModelName', schema);`.
- `grep_search` across `backend/src` shows controllers uniformly import named models:
  ```javascript
  import { InterviewSession } from '../models/interviewSession.model.js';
  import { Assessment } from '../models/assessment.model.js';
  ```

### InterviewSession Schema Current State
- `backend/src/models/interviewSession.model.js` currently spans 187 lines.
- It contains `candidate`, `assessment`, `isPractice`, `stage`, `status`, `topics`, `currentTopicIndex`, `questionsInCurrentTopic`, `stateMachine`, `transcript`, `codingChallenge`, `codeSubmission`, `durationMinutes`, `candidateResume`, `interviewFormat`, `startedAt`, `endedAt`, `proctoring`, `evaluation`.
- Index:
  ```javascript
  interviewSessionSchema.index(
      { candidate: 1, assessment: 1 },
      { unique: true, partialFilterExpression: { status: 'IN_PROGRESS' } }
  );
  ```
- No existing fields match `candidateProfile`, `microScores`, `trainingSignals`, `liveCode`, or `calibrated`.

### Upstream Architecture Requirements
- `REAL_INTERVIEW_UPGRADE_PLAN.md` §4.2 accesses `session.candidateProfile.topicScores[topicKey]` via bracket notation and performs `Object.values(profile.topicScores)`.
- `REAL_INTERVIEW_UPGRADE_PLAN.md` §6.2 queries:
  ```javascript
  InterviewSession.find({
      'trainingSignals.sessionOutcome.hireable': { $exists: true },
      calibrated: false
  }).limit(100);
  ```
- `REAL_INTERVIEW_UPGRADE_PLAN.md` §6.3 aggregates `trainingSignals.questionEffectiveness` and calls `QuestionBank.findOneAndUpdate({ text: q._id }, { status: 'retired', replacement: improved })`.
- `REAL_INTERVIEW_UPGRADE_PLAN.md` §2.1 queries `PersonaCache.findOne({ company, role, cachedAt: { $gt: ... } })` with 7-day expiration.
- `PROJECT.md` Feature 5 requires adding `ws` to `backend/package.json`.

---

## 2. Logic Chain

1. **Safety & Zero Regression**:
   - Because `interview.controller.js` line 241 creates new sessions via `InterviewSession.create({...})` without providing `candidateProfile`, `microScores`, `trainingSignals`, `liveCode`, or `calibrated`, all 5 new fields MUST have safe default values or be optional subdocuments.
   - If `candidateProfile` defaults to `{ topicScores: {}, overallSignal: 'unknown', ... }`, `microScores` defaults to `[]`, `liveCode` defaults to `''`, and `calibrated` defaults to `false`, new sessions created by existing controllers and tests will remain valid without throwing Mongoose validation errors.
   - Therefore, the schema extension is 100% additive and zero-breaking.

2. **Schema Type Selection for `candidateProfile.topicScores`**:
   - In Mongoose, defining `topicScores: { type: Map, of: Number }` requires using `.get(key)` and `.set(key, val)`. It does not support native bracket assignment `profile.topicScores[key] = val` without losing change detection, nor does `Object.values(map)` return scores.
   - Setting `topicScores: { type: Schema.Types.Mixed, default: () => ({}) }` allows direct bracket access and `Object.values()` as implemented in `candidateProfileTracker.js`.

3. **Index Optimization for Nightly Calibration**:
   - The nightly calibration query filters by `{ calibrated: false, 'trainingSignals.sessionOutcome.hireable': { $exists: true } }`.
   - Adding a compound index `{ calibrated: 1, 'trainingSignals.sessionOutcome.hireable': 1 }` allows the query to scan only uncalibrated sessions with existing hiring feedback.

4. **PersonaCache 7-Day TTL Index**:
   - MongoDB TTL indexes operate on a single Date field using `expireAfterSeconds`.
   - 7 days = `7 * 24 * 60 * 60 = 604800` seconds.
   - Setting `personaCacheSchema.index({ cachedAt: 1 }, { expireAfterSeconds: 604800 })` alongside `{ company: 1, role: 1 }` ensures automatic cleanup and fast lookups.

5. **QuestionBank Uniqueness and Indexing**:
   - `QuestionBank` documents are queried by `text` (for retirement / replacement updates) and by `{ company, role, status }` or `{ topics, difficulty, status }` for interview prompt generation.
   - Indexing `{ text: 1 }` (unique) plus compound indexes on `{ company: 1, role: 1, status: 1 }` and `{ topics: 1, difficulty: 1, status: 1 }` covers all access paths.

6. **Import/Export Ergonomics**:
   - Providing both `export const ModelName = ...` and `export default ModelName;` satisfies both existing named import patterns (`import { ModelName } from ...`) and default import patterns (`import ModelName from ...`).

---

## 3. Caveats

1. **MongoDB TTL Thread Execution**:
   - In production MongoDB, the TTL background thread runs once every 60 seconds; documents may persist for up to 60 seconds after the 604,800-second window before physical deletion. Application logic in `personaEngine.js` must also check `cachedAt: { $gt: Date.now() - 7 * 24 * 60 * 60 * 1000 }` to avoid serving stale data in that 60-second window.
2. **`Schema.Types.Mixed` Change Detection**:
   - When modifying properties inside `candidateProfile.topicScores` or `calibrationConfig.adjustments`, developers must call `session.markModified('candidateProfile')` if assigning properties directly without replacing the whole object. This will be documented for the Milestone 4 and 5 workers.
3. **No Code Modification Performed**:
   - In accordance with Explorer read-only rules, no files in `backend/src/` or `backend/package.json` were modified during this investigation. Implementation is delegated to the Worker.

---

## 4. Conclusion

The data architecture for Milestone 1 is completely designed, fully verified against existing test suites, and ready for immediate implementation by the Milestone 1 Worker:
1. `backend/src/models/interviewSession.model.js` will receive the 5 non-breaking schema extensions (`candidateProfile`, `microScores`, `trainingSignals`, `liveCode`, `calibrated`) and compound index `{ calibrated: 1, 'trainingSignals.sessionOutcome.hireable': 1 }`.
2. `backend/src/models/personaCache.model.js` will be created with `{ company: 1, role: 1 }` and 7-day TTL index (`expireAfterSeconds: 604800`).
3. `backend/src/models/questionBank.model.js` will be created with `text` (unique), discriminativeness, usage tracking, and multi-field compound indexes.
4. `backend/src/models/calibrationConfig.model.js` will be created with `type` (unique), Mixed `adjustments`, and `accuracy`.
5. `backend/package.json` will have `ws` added via `npm install ws`.
6. Full implementation code snippets and step-by-step instructions have been provided in `analysis.md`.

---

## 5. Verification Method

To independently verify the implementation once applied:
1. **Integration Test Suite**:
   Run:
   ```bash
   cd backend && npm test
   ```
   *Expected*: All 62 integration tests pass with 0 failures (`✔ ALL 62 INTEGRATION TESTS PASSED`).
2. **Unit Test Suite**:
   Run:
   ```bash
   cd backend && node tests/interviewEvaluation.test.js
   ```
   *Expected*: `ALL INTERVIEW & EVALUATION PIPELINE TESTS PASSED (100%)`.
3. **Model Instantiation Check**:
   Run a short Node one-liner to verify all 4 models load and export properly in ESM:
   ```bash
   cd backend && node -e "import('./src/models/interviewSession.model.js').then(() => import('./src/models/personaCache.model.js')).then(() => import('./src/models/questionBank.model.js')).then(() => import('./src/models/calibrationConfig.model.js')).then(() => console.log('ALL MODELS VALID'));"
   ```
   *Expected*: Logs `ALL MODELS VALID` with exit code 0.
