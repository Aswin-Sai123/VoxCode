# Milestone 1: Data Architecture & Mongoose Models — Architectural Analysis & Worker Implementation Plan

**Author**: Explorer 1  
**Target Milestone**: Milestone 1 (Data Architecture & Models)  
**Integrity Mode**: Development / Zero Regression  
**Date**: 2026-10-30  

---

## 1. Executive Summary

Milestone 1 establishes the foundational data architecture for VoxCode's Real Interview Experience Upgrade across the following deliverables:
1. Extending `backend/src/models/interviewSession.model.js` with `candidateProfile`, `microScores`, `trainingSignals`, `liveCode`, and `calibrated` without impacting any existing sessions, validation logic, or integration tests.
2. Creating `backend/src/models/personaCache.model.js` for caching scraped company interview personas with a compound index `{ company: 1, role: 1 }` and a 7-day TTL index (`expireAfterSeconds: 604800`).
3. Creating `backend/src/models/questionBank.model.js` with question effectiveness, discriminativeness, usage tracking, and replacement lifecycle metadata.
4. Creating `backend/src/models/calibrationConfig.model.js` for nightly scoring calibration weights and accuracy metrics.
5. Adding the `ws` package dependency to `backend/package.json` in preparation for Milestone 2.

All baseline tests currently pass:
- `backend/tests/integration.test.js`: **62 / 62 tests passing (100%)**
- `backend/tests/interviewEvaluation.test.js`: **100% passing**
- `backend/tests/blueprintParser.test.js`: **100% passing**

The extensions designed below are strictly backward-compatible and additive. No existing fields, types, or indexes are removed or modified.

---

## 2. Model & ES Module Conventions Analysis

### 2.1 Inspection of `backend/src/models/`
The existing backend codebase defines 7 models:
- `assessment.model.js`
- `candidate.model.js`
- `company.model.js`
- `evaluation.model.js`
- `interviewSession.model.js`
- `refreshToken.model.js`
- `role.model.js`

### 2.2 Module Syntax & Import/Export Patterns
- **Package Configuration**: `backend/package.json` specifies `"type": "module"`, enforcing native ECMAScript Modules (ESM).
- **Export Pattern**: All 7 existing models use named exports:
  ```javascript
  export const ModelName = mongoose.model('ModelName', schema);
  ```
- **Controller Imports**: Controllers uniformly import named exports, for example:
  ```javascript
  import { InterviewSession } from '../models/interviewSession.model.js';
  import { Assessment } from '../models/assessment.model.js';
  ```
- **Recommendation for Worker**:
  For all new models (`personaCache.model.js`, `questionBank.model.js`, `calibrationConfig.model.js`) as well as the updated `interviewSession.model.js`, provide **both** named and default exports:
  ```javascript
  export const ModelName = mongoose.model('ModelName', schema);
  export default ModelName;
  ```
  This guarantees 100% compatibility regardless of whether downstream code imports `{ ModelName }` or `ModelName`.

---

## 3. Model 1: `InterviewSession` Schema Extension

### 3.1 Existing Schema Structure
Currently `interviewSessionSchema` in `backend/src/models/interviewSession.model.js` (187 lines) contains:
- Primary references: `candidate` (ObjectId -> Candidate), `assessment` (ObjectId -> Assessment), `evaluation` (ObjectId -> Evaluation).
- State fields: `isPractice` (Boolean), `stage` ('CONCEPTUAL' | 'CODING' | 'COMPLETED'), `status` ('IN_PROGRESS' | 'COMPLETED' | 'TIMED_OUT').
- Conversation tracking: `topics` ([String]), `currentTopicIndex` (Number), `questionsInCurrentTopic` (Number), `stateMachine` (Mixed), `transcript` (Array of { role, text, timestamp, evaluation, topic }).
- Coding round: `codingChallenge` (Object), `codeSubmission` (Object).
- Metadata & proctoring: `durationMinutes`, `candidateResume`, `interviewFormat`, `startedAt`, `endedAt`, `proctoring` (Object).
- Unique partial index:
  ```javascript
  interviewSessionSchema.index(
      { candidate: 1, assessment: 1 },
      { 
          unique: true, 
          partialFilterExpression: { 
              status: 'IN_PROGRESS' 
          } 
      }
  );
  ```

### 3.2 Required Schema Extensions
Five specific fields must be integrated into `interviewSessionSchema`:

#### 1. `candidateProfile`
- **Purpose**: Tracks running Candidate Readiness Index (CRI) and multi-topic proficiency updated turn-by-turn by `updateCandidateProfile()` in `backend/src/utils/candidateProfileTracker.js`.
- **Critical Architectural Design Note on `topicScores`**:
  `REAL_INTERVIEW_UPGRADE_PLAN.md` §4.2 accesses `topicScores` using bracket notation and native object utilities:
  ```javascript
  profile.topicScores[topicKey] = alpha * microScore.score + (1 - alpha) * profile.topicScores[topicKey];
  const avgScore = Object.values(profile.topicScores).reduce((a, b) => a + b, 0) / Object.values(profile.topicScores).length;
  ```
  If `topicScores` is typed as a Mongoose `Map`, bracket access does not trigger Mongoose change tracking, and `Object.values(mapInstance)` does not return the map's values. Therefore, `topicScores` must be configured as `Schema.Types.Mixed` with default `() => ({})` (or a plain object).
- **Exact Schema Definition**:
  ```javascript
  candidateProfile: {
      topicScores: {
          type: Schema.Types.Mixed,
          default: () => ({})
      },
      overallSignal: {
          type: String,
          enum: ['strong', 'adequate', 'weak', 'unknown'],
          default: 'unknown'
      },
      communicationScore: {
          type: Number,
          default: 0,
          min: 0,
          max: 10
      },
      technicalDepth: {
          type: Number,
          default: 0,
          min: 0,
          max: 10
      },
      responseCount: {
          type: Number,
          default: 0,
          min: 0
      },
      weakTopics: [{
          type: String,
          trim: true
      }],
      cri: {
          type: Number,
          default: 0,
          min: 0,
          max: 10
      }
  }
  ```

#### 2. `microScores`
- **Purpose**: Stores turn-by-turn evaluations from `scoreSingleAnswer()`, passed to the 5-pass parallel deep evaluation (`analyzeByTopic(session.transcript, session.microScores, session.rubrics)`).
- **Exact Schema Definition**:
  ```javascript
  microScores: [{
      turn: {
          type: Number,
          default: 0
      },
      question: {
          type: String,
          default: ''
      },
      answer: {
          type: String,
          default: ''
      },
      topic: {
          type: String,
          default: ''
      },
      score: {
          type: Number,
          min: 0,
          max: 10,
          default: 0
      },
      signal: {
          type: String,
          enum: ['strong', 'adequate', 'weak', 'no_answer'],
          default: 'adequate'
      },
      dimensions: {
          correctness: { type: Number, min: 0, max: 10, default: 0 },
          depth: { type: Number, min: 0, max: 10, default: 0 },
          communication: { type: Number, min: 0, max: 10, default: 0 },
          practical_application: { type: Number, min: 0, max: 10, default: 0 }
      },
      keyInsight: {
          type: String,
          default: ''
      },
      timestamp: {
          type: Date,
          default: Date.now
      }
  }]
  ```

#### 3. `trainingSignals`
- **Purpose**: Captures per-session training telemetry for the nightly calibration cron (`calibrateEvaluation.js`) and question bank optimization (`optimizeQuestionBank.js`).
- **Exact Schema Definition**:
  ```javascript
  trainingSignals: {
      questionEffectiveness: [{
          question: {
              type: String,
              default: ''
          },
          candidateSignal: {
              type: String,
              enum: ['engaged', 'confused', 'deflected', 'strong_answer', 'adequate', 'weak'],
              default: 'engaged'
          },
          topicCoverage: {
              type: Number,
              min: 0,
              max: 1,
              default: 0
          },
          discriminativeness: {
              type: Number,
              min: 0,
              max: 1,
              default: 0
          }
      }],
      sessionOutcome: {
          hireable: {
              type: Boolean
          },
          candidateRating: {
              type: Number,
              min: 1,
              max: 5
          },
          evaluationAccuracy: {
              type: Number,
              min: 0,
              max: 1
          }
      }
  }
  ```

#### 4. `liveCode`
- **Purpose**: Stores the latest collaborative code snapshot synchronized over WebSocket (`CODE_SNAPSHOT` message), which feeds into the debounced AI code observation commentary.
- **Exact Schema Definition**:
  ```javascript
  liveCode: {
      type: String,
      default: ''
  }
  ```

#### 5. `calibrated`
- **Purpose**: Boolean flag indicating whether this session document has already been processed by the nightly evaluation calibration pipeline (`calibrateEvaluation.js`).
- **Exact Schema Definition**:
  ```javascript
  calibrated: {
      type: Boolean,
      default: false,
      index: true
  }
  ```

### 3.3 Indexes & Optimization
To support the nightly calibration pass query:
```javascript
InterviewSession.find({
    'trainingSignals.sessionOutcome.hireable': { $exists: true },
    calibrated: false
}).limit(100);
```
Add the following compound index to `interviewSessionSchema`:
```javascript
interviewSessionSchema.index({
    calibrated: 1,
    'trainingSignals.sessionOutcome.hireable': 1
});
```

### 3.4 Zero-Regression Verification Rationale
1. **Creation Safety**: In `interview.controller.js` line 241, `InterviewSession.create({...})` creates sessions without supplying these 5 new keys. Because all 5 new fields have default values or are optional subdocuments/arrays, Mongoose validation passes seamlessly.
2. **Query Safety**: All existing queries (`candidate`, `assessment`, `status`, `stage`, `_id`) continue to resolve without disturbance.
3. **Serialization Safety**: Serializing session documents to JSON via Express `res.json(...)` outputs the default structures cleanly without mutating existing properties expected by candidate or recruiter clients.

---

## 4. Model 2: `PersonaCache` Schema Design

**File**: `backend/src/models/personaCache.model.js`

### 4.1 Schema Specification
- `company`: String, required, trim, index
- `role`: String, required, trim, index
- `experienceLevel`: String, default 'Mid', trim
- `persona`: Embedded subdocument
  - `name`: String, required, default 'Rohan'
  - `title`: String, required, default 'Technical Interviewer'
  - `style`: String, default 'direct' (e.g. 'direct', 'Socratic', 'whiteboard-heavy')
  - `focusAreas`: `[{ type: String, trim: true }]`
  - `questionBank`: `[{ type: String, trim: true }]`
  - `evaluationCriteria`: `[Schema.Types.Mixed]`
  - `systemPrompt`: String, default ''
- `cachedAt`: Date, default: Date.now, required: true
- **Compound Index**: `{ company: 1, role: 1 }`
- **TTL Index**: `{ cachedAt: 1 }, { expireAfterSeconds: 604800 }` (automatically deletes documents 7 days after `cachedAt`)

### 4.2 Exact Implementation Code for Worker
```javascript
import mongoose, { Schema } from 'mongoose';

const personaCacheSchema = new Schema({
    company: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    role: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    experienceLevel: {
        type: String,
        default: 'Mid',
        trim: true
    },
    persona: {
        name: {
            type: String,
            required: true,
            default: 'Rohan'
        },
        title: {
            type: String,
            required: true,
            default: 'Technical Interviewer'
        },
        style: {
            type: String,
            default: 'direct'
        },
        focusAreas: [{
            type: String,
            trim: true
        }],
        questionBank: [{
            type: String,
            trim: true
        }],
        evaluationCriteria: [{
            dimension: { type: String, default: '' },
            description: { type: String, default: '' },
            weight: { type: Number, default: 1 }
        }],
        systemPrompt: {
            type: String,
            default: ''
        }
    },
    cachedAt: {
        type: Date,
        default: Date.now,
        required: true
    }
}, { timestamps: true });

// Compound index for cache lookup by company and role
personaCacheSchema.index({ company: 1, role: 1 });

// 7-day TTL index to automatically purge expired cache documents (604800 seconds = 7 days)
personaCacheSchema.index({ cachedAt: 1 }, { expireAfterSeconds: 604800 });

export const PersonaCache = mongoose.model('PersonaCache', personaCacheSchema);
export default PersonaCache;
```

---

## 5. Model 3: `QuestionBank` Schema Design

**File**: `backend/src/models/questionBank.model.js`

### 5.1 Schema Specification
- `text`: String, required, trim, unique, index (the interview question text)
- `company`: String, default '', trim, index
- `role`: String, default '', trim, index
- `topics`: `[{ type: String, trim: true }]`, index
- `difficulty`: String, enum: `['easy', 'medium', 'hard']`, default: `'medium'`, lowercase: true
- `status`: String, enum: `['active', 'retired', 'experimental', 'draft']`, default: `'active'`, index: true
- `discriminativeness`: Number, min: 0, max: 1, default: 0.5 (statistical ability of question to differentiate candidate skill)
- `usageCount`: Number, default: 0, min: 0
- `replacement`: String, default '', trim: true (improved prompt/question generated when question is retired)

### 5.2 Exact Implementation Code for Worker
```javascript
import mongoose, { Schema } from 'mongoose';

const questionBankSchema = new Schema({
    text: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        index: true
    },
    company: {
        type: String,
        default: '',
        trim: true,
        index: true
    },
    role: {
        type: String,
        default: '',
        trim: true,
        index: true
    },
    topics: [{
        type: String,
        trim: true
    }],
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium',
        lowercase: true
    },
    status: {
        type: String,
        enum: ['active', 'retired', 'experimental', 'draft'],
        default: 'active',
        index: true
    },
    discriminativeness: {
        type: Number,
        min: 0,
        max: 1,
        default: 0.5
    },
    usageCount: {
        type: Number,
        default: 0,
        min: 0
    },
    replacement: {
        type: String,
        default: '',
        trim: true
    }
}, { timestamps: true });

// Compound indexes for fast retrieval during adaptive question selection
questionBankSchema.index({ company: 1, role: 1, status: 1 });
questionBankSchema.index({ topics: 1, difficulty: 1, status: 1 });

export const QuestionBank = mongoose.model('QuestionBank', questionBankSchema);
export default QuestionBank;
```

---

## 6. Model 4: `CalibrationConfig` Schema Design

**File**: `backend/src/models/calibrationConfig.model.js`

### 6.1 Schema Specification
- `type`: String, required, unique, default: 'evaluation', index
- `adjustments`: `Schema.Types.Mixed`, default: `() => ({})`
- `accuracy`: Number, min: 0, max: 1, default: 0
- `updatedAt`: Date, default: Date.now
- Timestamps: `{ timestamps: true }`

### 6.2 Exact Implementation Code for Worker
```javascript
import mongoose, { Schema } from 'mongoose';

const calibrationConfigSchema = new Schema({
    type: {
        type: String,
        required: true,
        unique: true,
        index: true,
        default: 'evaluation'
    },
    adjustments: {
        type: Schema.Types.Mixed,
        default: () => ({})
    },
    accuracy: {
        type: Number,
        min: 0,
        max: 1,
        default: 0
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

export const CalibrationConfig = mongoose.model('CalibrationConfig', calibrationConfigSchema);
export default CalibrationConfig;
```

---

## 7. Package Dependency: `ws`

Milestone 2 requires `ws` to mount the WebSocket server on `/ws/interview`.  
`PROJECT.md` Feature 5 specifies installing `ws` during Milestone 1.

### Worker Action:
Run in `backend/`:
```bash
npm install ws
```
This updates `backend/package.json` to include `"ws": "^8.18.0"` (or latest 8.x) under `"dependencies"`.

---

## 8. Worker Step-by-Step Execution Plan

When the Worker executes Milestone 1, they should proceed in this exact sequence:

1. **Step 1: Install `ws` dependency**  
   Run `npm install ws` in `c:\Users\pratheek\OneDrive\Documents\VoxCode\backend`.
2. **Step 2: Create `backend/src/models/personaCache.model.js`**  
   Write the complete schema with `{ company: 1, role: 1 }` and 7-day TTL `{ cachedAt: 1 }, { expireAfterSeconds: 604800 }`.
3. **Step 3: Create `backend/src/models/questionBank.model.js`**  
   Write the complete schema with text uniqueness, status enum, discriminativeness, and compound indexes.
4. **Step 4: Create `backend/src/models/calibrationConfig.model.js`**  
   Write the calibration config schema with `type`, `adjustments` (Mixed), `accuracy`, and `updatedAt`.
5. **Step 5: Extend `backend/src/models/interviewSession.model.js`**  
   Add `candidateProfile`, `microScores`, `trainingSignals`, `liveCode`, and `calibrated` fields, compound index `{ calibrated: 1, 'trainingSignals.sessionOutcome.hireable': 1 }`, and `export default InterviewSession;`.
6. **Step 6: Run verification suite**  
   Run `cd backend && npm test` to verify all 62 integration tests continue passing without regression.  
   Run `cd backend && node tests/interviewEvaluation.test.js` to verify unit test stability.
