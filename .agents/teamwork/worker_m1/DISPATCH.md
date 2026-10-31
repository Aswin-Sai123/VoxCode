## 2026-10-30T14:11:47Z

You are Worker for Milestone 1: Data Architecture & Models.
Your working directory is: c:\Users\pratheek\OneDrive\Documents\VoxCode\.agents\teamwork\worker_m1
Your parent is: 466d2811-ee76-4144-ac75-8a35cade05a3

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY FIRST STEP:
Read c:\Users\pratheek\OneDrive\Documents\VoxCode\.agents\teamwork\ORIGINAL_REQUEST.md in full before starting work.
Also read c:\Users\pratheek\OneDrive\Documents\VoxCode\PROJECT.md.
Review Explorer reports:
- c:\Users\pratheek\OneDrive\Documents\VoxCode\.agents\teamwork\explorer_m1_1\analysis.md
- c:\Users\pratheek\OneDrive\Documents\VoxCode\.agents\teamwork\explorer_m1_2\analysis.md
- c:\Users\pratheek\OneDrive\Documents\VoxCode\.agents\teamwork\explorer_m1_3\analysis.md

Exclusive Write Ownership:
You exclusively own and may edit or create these files:
- backend/package.json
- backend/src/models/interviewSession.model.js
- backend/src/models/personaCache.model.js
- backend/src/models/questionBank.model.js
- backend/src/models/calibrationConfig.model.js
- backend/tests/models.test.js
Do NOT modify any other project files.

Implementation Tasks:
1. Update `backend/package.json` to add `"ws": "^8.18.0"` and `"@google-cloud/speech": "^6.7.0"` under dependencies. Run `npm install ws@^8.18.0 @google-cloud/speech@^6.7.0 --prefix backend` and verify clean installation.
2. Extend `backend/src/models/interviewSession.model.js` with:
   - `candidateProfile`:
     ```js
     candidateProfile: {
       topicScores: { type: Schema.Types.Mixed, default: () => ({}) },
       overallSignal: { type: String, enum: ['strong', 'adequate', 'weak', 'unknown'], default: 'unknown' },
       communicationScore: { type: Number, default: 0 },
       technicalDepth: { type: Number, default: 0 },
       responseCount: { type: Number, default: 0 },
       weakTopics: { type: [String], default: [] }
     }
     ```
   - `microScores`:
     ```js
     microScores: [{
       question: String,
       answer: String,
       topic: String,
       score: Number,
       signal: String,
       dimensions: {
         correctness: Number,
         depth: Number,
         communication: Number,
         practical_application: Number
       },
       keyInsight: String,
       timestamp: { type: Date, default: Date.now }
     }]
     ```
   - `trainingSignals`:
     ```js
     trainingSignals: {
       questionEffectiveness: [{
         question: String,
         candidateSignal: String,
         topicCoverage: Number,
         discriminativeness: Number
       }],
       sessionOutcome: {
         hireable: { type: Boolean, required: false },
         candidateRating: Number,
         evaluationAccuracy: Number
       }
     }
     ```
     (CRITICAL: `hireable` must NOT have a default value so MongoDB `{ 'trainingSignals.sessionOutcome.hireable': { $exists: true } }` only matches completed sessions with human ratings).
   - `liveCode`: `{ type: String, default: '' }`
   - `calibrated`: `{ type: Boolean, default: false }`
   - Add index: `interviewSessionSchema.index({ calibrated: 1, 'trainingSignals.sessionOutcome.hireable': 1 });`
3. Create `backend/src/models/personaCache.model.js`:
   - Schema: `company` (String, required, trim), `role` (String, required, trim), `experienceLevel` (String, default: ''), `persona` (Schema.Types.Mixed, required), `cachedAt` (Date, default Date.now).
   - Indexes: `{ cachedAt: 1 }, { expireAfterSeconds: 604800 }` (7-day TTL), and `{ company: 1, role: 1 }`.
   - Exports: named export `export const PersonaCache = mongoose.model('PersonaCache', personaCacheSchema);` and default export `export default PersonaCache;`.
4. Create `backend/src/models/questionBank.model.js`:
   - Schema: `text` (String, required, unique, trim), `company` (String, default: ''), `role` (String, default: ''), `topics` ([String], default: []), `difficulty` (String, enum: ['easy', 'medium', 'hard'], default: 'medium'), `status` (String, enum: ['active', 'retired', 'experimental'], default: 'active'), `discriminativeness` (Number, default: 0.5), `usageCount` (Number, default: 0), `replacement` (String, default: '').
   - Indexes: `{ company: 1, role: 1, status: 1 }`, `{ topics: 1, difficulty: 1, status: 1 }`.
   - Exports: named `QuestionBank` and default.
5. Create `backend/src/models/calibrationConfig.model.js`:
   - Schema: `type` (String, required, unique, default: 'evaluation'), `adjustments` (Schema.Types.Mixed, default: () => ({})), `accuracy` (Number, default: 0), `updatedAt` (Date, default: Date.now).
   - Exports: named `CalibrationConfig` and default.
6. Create comprehensive unit test suite in `backend/tests/models.test.js`:
   - Test instantiation, default values, schema validations, enum constraints, and index definitions for all 4 models.
   - Test ESM imports: `import WebSocket, { WebSocketServer } from 'ws'`.
7. Run all verification test suites:
   - `node backend/tests/models.test.js`
   - `node backend/tests/blueprintParser.test.js`
   - `node backend/tests/interviewEvaluation.test.js`
   - `node backend/tests/integration.test.js` (ALL 62 integration tests MUST PASS)

Deliverables:
- Update your `progress.md` after each step.
- Document all implemented changes, files, commands executed, and exact test results in `c:\Users\pratheek\OneDrive\Documents\VoxCode\.agents\teamwork\worker_m1\handoff.md`.
- Send completion message to parent via send_message.

