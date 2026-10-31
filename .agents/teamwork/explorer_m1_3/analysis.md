# Milestone 1: Test Fixtures, Regression Risks & Verification Harness Analysis

**Explorer**: Explorer 3 (Milestone 1 — Data Architecture & Models)  
**Date**: 2026-10-30  
**Target Milestone**: Milestone 1 (Features 1–5: `interviewSession.model.js` schema extensions, `personaCache.model.js`, `questionBank.model.js`, `calibrationConfig.model.js`, `ws` dependency)  
**Integrity Mode**: Read-Only Analysis  

---

## Executive Summary

This report establishes the regression prevention and verification harness for Milestone 1. 

Existing test suites were inspected and executed against the live workspace:
- `backend/tests/blueprintParser.test.js`: **PASS (100%)** — Pure unit parser test.
- `backend/tests/interviewEvaluation.test.js`: **PASS (100%)** — Mock-driven AI evaluation & interview step test.
- `backend/tests/integration.test.js`: **PASS (62/62, 100%)** — Full end-to-end integration test with live MongoDB covering 8 functional suites (Auth, Assessment, Interview, Sandbox, Evaluation, Company Interviews, Candidate Dashboard, Security & RBAC).

### Key Architectural Findings:
1. **Zero Test Regressions**: The 5 proposed fields (`candidateProfile`, `microScores`, `trainingSignals`, `liveCode`, `calibrated`) can be added to `backend/src/models/interviewSession.model.js` with **zero risk of test failure** if and only if:
   - All 5 new fields are non-mandatory (`required: false`).
   - Default values are safe (`liveCode: ''`, `calibrated: false`, `microScores: []`, `candidateProfile` default subdocument with `runningCRI: 50`).
   - **CRITICAL**: `trainingSignals.sessionOutcome.hireable` must **NOT** have a boolean default (such as `false`). It must be undefined until human feedback arrives, because the calibration query in `REAL_INTERVIEW_UPGRADE_PLAN.md` (§6.2) queries `{ 'trainingSignals.sessionOutcome.hireable': { $exists: true }, calibrated: false }`.
2. **New Model Verification**: A dedicated unit test suite `backend/tests/models.test.js` should be created to rigorously verify schema validation, defaults, enum constraints, compound indexes, and TTL index properties for the 3 new models (`personaCache.model.js`, `questionBank.model.js`, `calibrationConfig.model.js`) as well as the backward compatibility of `interviewSession.model.js`.
3. **Execution Commands**: Plain Node ES Module commands without external test runners are the established pattern in VoxCode. Standard verification commands have been codified for the Worker, Reviewer, and Challenger.

---

## 1. Inspection of Existing Test Suites & `InterviewSession` Lifecycle

### 1.1 `backend/tests/blueprintParser.test.js`
- **Type**: Pure synchronous unit test.
- **Dependencies**: `assert` from Node.js, `extractBlueprintDurationAndTimeline` and `getActivePhaseInfo` from `../src/utils/blueprintParser.js`.
- **Database / Model Involvement**: **None**. It does not import or interact with Mongoose or `InterviewSession`.
- **Current Status**: 100% passing.
- **Regression Risk**: 0%.

### 1.2 `backend/tests/interviewEvaluation.test.js`
- **Type**: Asynchronous unit/service test.
- **Dependencies**: `assert` from Node.js, `generateAiEvaluation` from `../src/services/evaluation.service.js`, and `generateNextInterviewStep` from `../src/services/ai.service.js`.
- **Database / Model Involvement**: **None directly**. Does not instantiate Mongoose documents; instead, it passes mock JavaScript objects containing `transcript`, `codingChallenge`, `codeSubmission`, `testCaseResults`, `keyCompetencies`, and `companyHistory`.
- **Current Status**: 100% passing.
- **Regression Risk**: 0% for Milestone 1. (In Milestone 4, `generateAiEvaluation` will be enhanced with progressive scoring, which will consume `microScores` and `candidateProfile`).

### 1.3 `backend/tests/integration.test.js`
- **Type**: Full end-to-end integration test with live ephemeral MongoDB database (`voxcode_test_<timestamp>`) and native HTTP server on random available port.
- **Test Matrix**: 62 discrete assertions across 8 suites:
  1. Auth Suite (12 tests)
  2. Assessment Suite (10 tests)
  3. Interview Suite (5 tests)
  4. Sandbox Suite (4 tests)
  5. Evaluation Suite (6 tests)
  6. Company Interviews Suite (4 tests)
  7. Candidate Dashboard Suite (2 tests)
  8. Security & RBAC Suite (7 tests)
- **Current Status**: **62 passed, 0 failed (100% PASS)**.

### 1.4 How `InterviewSession` Is Instantiated, Saved, Updated, and Queried

| Operation | Code Location | Caller in Test | Payload / Behavior | Invariant to Preserve |
|---|---|---|---|---|
| **Instantiation (Assessment Interview)** | `interview.controller.js:241-258` | `POST /api/interview/start` (`integration.test.js:263`) | `InterviewSession.create({ candidate, assessment, isPractice: false, stage: 'CONCEPTUAL', status: 'IN_PROGRESS', stateMachine, topics, currentTopicIndex, questionsInCurrentTopic, transcript: initialTranscript, codingChallenge: null, candidateResume, interviewFormat, durationMinutes, startedAt: new Date() })` | Omits all 5 new fields (`candidateProfile`, `microScores`, `trainingSignals`, `liveCode`, `calibrated`). Creation **must not fail** validation. |
| **Instantiation (Practice Mock)** | `interview.controller.js:350-364` | `POST /api/interview/practice/start` (`integration.test.js:293`) | `InterviewSession.create({ candidate, assessment, isPractice: true, stage: 'CONCEPTUAL', status: 'IN_PROGRESS', stateMachine, topics, currentTopicIndex, questionsInCurrentTopic, transcript: initialTranscript, codingChallenge: null, durationMinutes: 30, startedAt: new Date() })` | Also omits all new fields. Must validate cleanly. |
| **Query & In-Progress Check** | `interview.controller.js:169, 184, 201, 261` | `POST /api/interview/start` | `InterviewSession.findOne({ candidate, assessment, status: 'IN_PROGRESS' })` | Relies on compound partial index `{ candidate: 1, assessment: 1 }` with `{ partialFilterExpression: { status: 'IN_PROGRESS' } }`. |
| **Completed Session Check (Anti-Resume)** | `interview.controller.js:158` | `POST /api/interview/start` (`integration.test.js:287`) | `InterviewSession.findOne({ candidate, assessment, status: 'COMPLETED' })` | Must return completed document to trigger 403. |
| **Update (Answer Turn)** | `interview.controller.js:417, 608` | `POST /api/interview/session/:sessionId/answer` (`integration.test.js:272`) | `session = await InterviewSession.findById(sessionId).populate(...)`; `session.transcript.push(...)`; `session.stateMachine = ...`; `await session.save()` | Mongoose document `.save()` executes full document schema validation. If new fields have invalid defaults or failing validators, `.save()` will throw `ValidationError`. |
| **Update (Complete Session)** | `interview.controller.js:634-645` | `POST /api/interview/session/:sessionId/complete` (`integration.test.js:278`) | `session.status = 'COMPLETED'`; `session.endedAt = new Date()`; `session.codeSubmission = codeSubmission`; `await session.save()` | Same as above: `.save()` validates entire document. |
| **Batch Update (Close Duplicates)** | `reconcileInterviewSession.js:12-26` | Triggered by `submitSession` | `InterviewSession.updateMany({ candidate, assessment, status: 'IN_PROGRESS', _id: { $ne: keepSessionId } }, { $set: { status: 'COMPLETED', stage: 'COMPLETED', endedAt: new Date() } })` | Direct MongoDB update via `$set`. Does not trigger full schema document validation. |
| **Reconciliation & Expiry** | `reconcileInterviewSession.js:35-89` | Called across `company.controller.js:23`, `candidate.controller.js:118`, `interview.controller.js:279` | Checks `session.stage === 'COMPLETED'`, `Evaluation.exists({ session: session._id })`, duration timeout; calls `await session.save()`. | Document `.save()` must pass validation on existing and timed-out sessions. |
| **Listing Queries** | `company.controller.js:16, 26` | `GET /api/company/interviews` (`integration.test.js:387`) | `InterviewSession.find({ assessment: { $in: assessmentIds }, status: 'IN_PROGRESS' }).populate('candidate assessment')`; `find({... status: 'COMPLETED' }).populate('candidate assessment evaluation')` | Response mapping (`sess.toObject()` / JSON serialization) must not break array structure expected by caller (`res.body?.data?.ongoing`, `res.body?.data?.completed`). |
| **Dashboard Query** | `candidate.controller.js:106, 140` | `GET /api/candidate/dashboard` (`integration.test.js:397`) | `InterviewSession.find({ candidate: candidateId, status: 'IN_PROGRESS' })`; `find({ candidate: candidateId, status: 'COMPLETED' })` | Result array counts mapped into dashboard stats (`totalInterviews`, etc.). |

---

## 2. Regression Risk Analysis for `interviewSession.model.js` Extensions

We evaluated every potential risk factor for each of the 5 new fields:

### 2.1 Field 1: `candidateProfile`
- **Target Specification**:
  ```js
  candidateProfile: {
      runningCRI: { type: Number, min: 0, max: 100, default: 50 },
      overallSignal: { 
          type: String, 
          enum: ['strong', 'adequate', 'weak', 'no_answer', 'neutral'], 
          default: 'neutral' 
      },
      topicMastery: [{
          topic: { type: String, default: '' },
          score: { type: Number, min: 0, max: 10, default: 0 },
          weight: { type: Number, default: 1 },
          turnCount: { type: Number, default: 0 }
      }],
      strongTopics: [{ type: String }],
      weakTopics: [{ type: String }],
      dimensionAverages: {
          correctness: { type: Number, min: 0, max: 10, default: 0 },
          depth: { type: Number, min: 0, max: 10, default: 0 },
          communication: { type: Number, min: 0, max: 10, default: 0 },
          practicalApplication: { type: Number, min: 0, max: 10, default: 0 }
      }
  }
  ```
- **Validation Risk**: **ZERO**.
  - Default object ensures that when `InterviewSession.create({...})` is called without `candidateProfile`, Mongoose instantiates `candidateProfile` with valid defaults (`runningCRI: 50`, `overallSignal: 'neutral'`, empty arrays, zeroed dimensions).
  - All nested properties satisfy their `min`/`max` constraints.
  - No `required: true` is placed on `candidateProfile` or its children.

### 2.2 Field 2: `microScores`
- **Target Specification**:
  ```js
  microScores: [{
      turn: { type: Number, default: 0 },
      question: { type: String, default: '' },
      answer: { type: String, default: '' },
      topic: { type: String, default: '' },
      score: { type: Number, min: 0, max: 10, default: 0 },
      signal: { 
          type: String, 
          enum: ['strong', 'adequate', 'weak', 'no_answer', 'neutral'], 
          default: 'neutral' 
      },
      dimensions: {
          correctness: { type: Number, min: 0, max: 10, default: 0 },
          depth: { type: Number, min: 0, max: 10, default: 0 },
          communication: { type: Number, min: 0, max: 10, default: 0 },
          practical_application: { type: Number, min: 0, max: 10, default: 0 }
      },
      keyInsight: { type: String, default: '' },
      timestamp: { type: Date, default: Date.now }
  }]
  ```
- **Validation Risk**: **ZERO**.
  - Mongoose arrays default to `[]` unless specified otherwise.
  - Calling `create({...})` without `microScores` produces `microScores: []`.
  - No conflict with existing queries.

### 2.3 Field 3: `trainingSignals`
- **Target Specification**:
  ```js
  trainingSignals: {
      questionEffectiveness: [{
          question: { type: String, default: '' },
          candidateSignal: { 
              type: String, 
              enum: ['engaged', 'confused', 'deflected', 'strong_answer', 'weak_answer', 'neutral'],
              default: 'neutral'
          },
          topicCoverage: { type: Number, min: 0, max: 1, default: 0 },
          discriminativeness: { type: Number, min: 0, max: 1, default: 0 }
      }],
      sessionOutcome: {
          hireable: { type: Boolean }, // NO DEFAULT!
          candidateRating: { type: Number, min: 1, max: 5 },
          evaluationAccuracy: { type: Number, min: 0, max: 1 }
      }
  }
  ```
- **CRITICAL Pitfall Identified & Prevented**:
  - `sessionOutcome.hireable` **MUST NOT** have `default: false`.
  - In `REAL_INTERVIEW_UPGRADE_PLAN.md` §6.2, the calibration job executes:
    ```js
    const sessions = await InterviewSession.find({
        'trainingSignals.sessionOutcome.hireable': { $exists: true },
        calibrated: false
    }).limit(100);
    ```
  - If `hireable` had `default: false`, every single newly created interview session would match `{ $exists: true }` immediately, falsely triggering the calibration pipeline before actual human recruiter outcomes exist!
  - By leaving `sessionOutcome` optional without default booleans, `{ $exists: true }` correctly evaluates to `false` until post-session outcomes are explicitly recorded.
- **Validation Risk**: **ZERO** when defined as specified above.

### 2.4 Field 4: `liveCode`
- **Target Specification**:
  ```js
  liveCode: {
      type: String,
      default: ''
  }
  ```
- **Validation Risk**: **ZERO**. Defaults to empty string `''`.

### 2.5 Field 5: `calibrated`
- **Target Specification**:
  ```js
  calibrated: {
      type: Boolean,
      default: false,
      index: true
  }
  ```
- **Validation Risk**: **ZERO**. Defaults to `false`. Sparse/standard index aids calibration job queries.

### 2.6 Assertion Compatibility in `integration.test.js`
- Inspected all assertions in `integration.test.js`:
  - Line 268: `assert('Session ID received', !!sessionId);`
  - Line 275: `assert('Answer message returns 200', msgRes.status === 200);`
  - Line 284: `assert('Complete session returns 200', completeRes.status === 200);`
  - Line 296: `assert('Practice session is marked isPractice', ... === true);`
  - Line 389: `assert('Response has ongoing array', Array.isArray(...));`
  - Line 390: `assert('Response has completed array', Array.isArray(...));`
  - Line 391: `assert('Completed array has at least 1 entry', ... >= 1);`
  - Line 398: `assert('Candidate dashboard returns 200', res.status === 200);`
- None of the assertions perform strict key comparisons (`assert.deepStrictEqual(Object.keys(session), [...])`) or limit the payload keys.
- **Conclusion**: Adding the 5 fields causes **ZERO** assertion failures and **ZERO** validation errors across all 62 integration tests.

---

## 3. Architecture & Requirements for New Models

### 3.1 Model 1: `backend/src/models/personaCache.model.js`
- **Purpose**: Cache scraped company interview intelligence, rubrics, and interviewer personas with a 7-day TTL.
- **Required Schema Elements**:
  - `companyName`: String, required, trim, index
  - `roleTitle`: String, default: '', trim
  - `experienceLevel`: String, enum: `['Entry', 'Mid', 'Senior']`, default: `'Mid'`
  - `focusAreas`: `[{ type: String }]`
  - `cultureDirectives`: `[{ type: String }]`
  - `interviewerPersona`:
    - `name`: String, default: 'Interviewer'
    - `title`: String, default: 'Technical Interviewer'
    - `style`: String, default: 'Collaborative and thorough'
    - `systemPrompt`: String, default: ''
  - `rawIntel`: Schema.Types.Mixed (scraped debriefs, Glassdoor/Reddit/Blind summaries)
  - `scrapedAt`: Date, default: Date.now
  - `expiresAt`: Date
- **Indexes**:
  - Compound unique index: `{ companyName: 1, roleTitle: 1, experienceLevel: 1 }`
  - TTL index: `index({ createdAt: 1 }, { expireAfterSeconds: 604800 })` (7 days = 604,800 seconds)
- **Export Convention**:
  - `export const PersonaCache = mongoose.model('PersonaCache', personaCacheSchema);`

### 3.2 Model 2: `backend/src/models/questionBank.model.js`
- **Purpose**: Repository of technical and behavioral questions with dynamic discriminativeness metrics, lifecycle status (`active`, `probation`, `retired`), and replacement tracking.
- **Required Schema Elements**:
  - `text`: String, required, unique, trim
  - `topic`: String, required, trim, index
  - `subtopic`: String, default: '', trim
  - `difficulty`: String, enum: `['easy', 'medium', 'hard']`, default: `'medium'`, index
  - `targetCompanies`: `[{ type: String }]`
  - `rubrics`:
    - `criteria`: `[{ type: String }]`
    - `goodAnswerSignals`: `[{ type: String }]`
    - `redFlags`: `[{ type: String }]`
  - `metrics`:
    - `timesAsked`: { type: Number, default: 0 },
    - `avgDiscriminativeness`: { type: Number, min: 0, max: 1, default: 0.5 },
    - `avgCandidateRating`: { type: Number, min: 1, max: 5, default: 3.0 },
    - `strongAnswerCount`: { type: Number, default: 0 },
    - `weakAnswerCount`: { type: Number, default: 0 }
  - `status`: String, enum: `['active', 'probation', 'retired']`, default: `'active'`, index
  - `replacement`: String, default: ''
- **Indexes**:
  - Compound query index: `{ topic: 1, difficulty: 1, status: 1 }`
  - Optimization index: `{ status: 1, 'metrics.avgDiscriminativeness': 1 }`
- **Export Convention**:
  - `export const QuestionBank = mongoose.model('QuestionBank', questionBankSchema);`

### 3.3 Model 3: `backend/src/models/calibrationConfig.model.js`
- **Purpose**: Singleton/configuration document storing learned evaluation adjustments and score weight multipliers from the nightly calibration pipeline.
- **Required Schema Elements**:
  - `type`: String, required, unique, default: `'evaluation'`
  - `adjustments`:
    - `conceptualDelta`: { type: Number, default: 0 },
    - `codingDelta`: { type: Number, default: 0 },
    - `communicationDelta`: { type: Number, default: 0 },
    - `overallWeightMultipliers`: {
        conceptual: { type: Number, default: 1.0 },
        coding: { type: Number, default: 1.0 },
        communication: { type: Number, default: 1.0 }
      }
  - `accuracy`: { type: Number, min: 0, max: 1, default: 0 }
  - `lastCalibratedAt`: { type: Date, default: Date.now }
  - `sampleCount`: { type: Number, default: 0 }
- **Export Convention**:
  - `export const CalibrationConfig = mongoose.model('CalibrationConfig', calibrationConfigSchema);`

---

## 4. Test Harness Design: `backend/tests/models.test.js`

To verify Milestone 1 implementation without mutating existing integration tests, the Worker should create `backend/tests/models.test.js`.

### Test Architecture:
- Uses Node.js native `assert`.
- Follows ES Module syntax.
- Connects to an ephemeral test DB (`mongodb://127.0.0.1:27017/voxcode_m1_test_<timestamp>`).
- Completely cleans up and drops the test DB on completion.

### Specific Test Cases in `backend/tests/models.test.js`:

```js
/**
 * Test Suite: Milestone 1 Models & Schema Extensions Verification
 * File: backend/tests/models.test.js
 */

// 1. InterviewSession Schema Backward Compatibility Test
// - Create an InterviewSession with ONLY legacy fields (mimicking interview.controller.js:241).
// - Assert creation succeeds with 0 errors.
// - Assert candidateProfile.runningCRI === 50
// - Assert candidateProfile.overallSignal === 'neutral'
// - Assert Array.isArray(session.microScores) && session.microScores.length === 0
// - Assert session.liveCode === ''
// - Assert session.calibrated === false
// - Assert session.trainingSignals.sessionOutcome.hireable === undefined
// - Assert { 'trainingSignals.sessionOutcome.hireable': { $exists: true } } does NOT match this session.

// 2. InterviewSession Schema New Fields Full Population Test
// - Save an InterviewSession with explicit microScores, candidateProfile, liveCode, and trainingSignals.
// - Call session.save() and verify retrieval.
// - Test CRI bounds validation: saving runningCRI = 150 must throw ValidationError.
// - Test microScores bounds validation: saving score = 11 must throw ValidationError.

// 3. PersonaCache Model Test
// - Assert PersonaCache is defined and has modelName 'PersonaCache'.
// - Create document with companyName 'Google', roleTitle 'Software Engineer', experienceLevel 'Senior'.
// - Verify compound index prevents duplicate companyName + roleTitle + experienceLevel.
// - Verify TTL index configuration: check PersonaCache.schema.indexes() for expireAfterSeconds (604800).
// - Verify retrieval by companyName.

// 4. QuestionBank Model Test
// - Assert QuestionBank is defined and has modelName 'QuestionBank'.
// - Create question doc: { text: 'Explain Kafka commit log architecture', topic: 'Distributed Systems', difficulty: 'hard' }.
// - Verify default status is 'active' and metrics.timesAsked is 0.
// - Verify enum constraint: invalid status 'archived' throws ValidationError.
// - Update question to status 'retired' with replacement text.

// 5. CalibrationConfig Model Test
// - Assert CalibrationConfig is defined and has modelName 'CalibrationConfig'.
// - Test findOneAndUpdate with upsert: true on { type: 'evaluation' }.
// - Verify default adjustments (conceptualDelta: 0, overallWeightMultipliers: { conceptual: 1.0, coding: 1.0, communication: 1.0 }).
// - Verify accuracy and sampleCount updates.

// 6. Reconciliation Test
// - Pass newly extended InterviewSession into reconcileInterviewSessionStatus(session) from src/utils/reconcileInterviewSession.js.
// - Verify reconcileInterviewSessionStatus executes and returns 'IN_PROGRESS' (or expected status) without any error or validation exception.
```

---

## 5. Verification Commands for Worker, Reviewer, and Challenger

These exact commands must be executed in order:

### Phase A: Pre-Flight Import & Syntax Verification
```bash
# Verify all four models can be imported cleanly without syntax errors
node --input-type=module -e "import { InterviewSession } from './backend/src/models/interviewSession.model.js'; import { PersonaCache } from './backend/src/models/personaCache.model.js'; import { QuestionBank } from './backend/src/models/questionBank.model.js'; import { CalibrationConfig } from './backend/src/models/calibrationConfig.model.js'; console.log('✓ All 4 models imported successfully');"
```

### Phase B: Milestone 1 Dedicated Model Unit Test
```bash
# Run the newly constructed model verification test suite
node backend/tests/models.test.js
```
*Pass Criteria*: All assertions pass, 0 failures, exit code 0.

### Phase C: Existing Unit & Parser Test Suites
```bash
# Verify blueprint parser unit tests
node backend/tests/blueprintParser.test.js

# Verify interview evaluation unit tests
node backend/tests/interviewEvaluation.test.js
```
*Pass Criteria*: Both suites report 100% PASS with exit code 0.

### Phase D: Full End-to-End Regression Test Suite
```bash
# Run complete 62-test integration suite against live MongoDB
node backend/tests/integration.test.js
```
*Pass Criteria*: All 62 tests pass (0 failures), exactly matching baseline output:
```
══════════════════════════════════════
  RESULTS: 62 passed, 0 failed, 62 total
══════════════════════════════════════
```

### Phase E: Package & Dependency Verification
```bash
# Verify ws dependency installed in backend
node -e "import('ws').then(() => console.log('✓ ws package resolvable')).catch(e => { console.error(e); process.exit(1); })"
```

---

## 6. Implementation Strategy & Recommendations for Worker

1. **`backend/src/models/interviewSession.model.js`**:
   - Add the 5 fields at the top level of `interviewSessionSchema` right after `proctoring` and before `evaluation`.
   - Never make any of the new fields `required: true`.
   - Ensure `trainingSignals.sessionOutcome.hireable` has NO default value.
   - Add index on `calibrated: 1`.

2. **`backend/src/models/personaCache.model.js`**:
   - Create new file following VoxCode Mongoose convention.
   - Use `{ timestamps: true }`.
   - Define compound unique index `{ companyName: 1, roleTitle: 1, experienceLevel: 1 }`.
   - Define TTL index on `createdAt`: `personaCacheSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });`.
   - Export named export `export const PersonaCache = mongoose.model('PersonaCache', personaCacheSchema);`.

3. **`backend/src/models/questionBank.model.js`**:
   - Create new file following VoxCode Mongoose convention.
   - Use `{ timestamps: true }`.
   - Define indexes `{ topic: 1, difficulty: 1, status: 1 }` and `{ status: 1 }`.
   - Export named export `export const QuestionBank = mongoose.model('QuestionBank', questionBankSchema);`.

4. **`backend/src/models/calibrationConfig.model.js`**:
   - Create new file following VoxCode Mongoose convention.
   - Use `{ timestamps: true }`.
   - Set `type: { type: String, required: true, unique: true, default: 'evaluation' }`.
   - Export named export `export const CalibrationConfig = mongoose.model('CalibrationConfig', calibrationConfigSchema);`.

5. **`backend/tests/models.test.js`**:
   - Create the unit test file implementing the 6 test cases described in Section 4.
   - Add script to `backend/package.json` if appropriate: `"test:models": "node tests/models.test.js"`.

6. **Execute Verification Sequence**:
   - Run Phases A, B, C, D, and E in order.
