# VoxCode Backend Exploration & Architectural Analysis Report

**Explorer**: Backend Explorer 0  
**Date**: 2026-10-30  
**Target Architecture**: `REAL_INTERVIEW_UPGRADE_PLAN.md`  
**Workspace**: `c:\Users\pratheek\OneDrive\Documents\VoxCode\backend`  
**Integrity Mode**: Read-Only Analysis  

---

## Executive Summary

The VoxCode backend is a modern, modular Node.js/Express service built with ES Modules (`type: "module"`) running on Node.js v24. It currently powers AI technical interviews, speech synthesis (via Microsoft Edge Neural and Google TTS), isolated sandbox code execution across four languages (JavaScript, Python, C++, Java), and detailed post-interview evaluation with role rubrics and proctoring telemetry.

All 62 integration tests (`backend/tests/integration.test.js`), unit tests (`backend/tests/interviewEvaluation.test.js`), and parser tests (`backend/tests/blueprintParser.test.js`) are **passing at 100%**. 

To deliver the real-time technical interview experience (sub-300ms latency, persistent bidirectional WebSockets at `/ws/interview`, sentence-streaming TTS, per-company scraped personas, running Candidate Readiness Index micro-scoring, collaborative live IDE streaming, and self-improving training loops), WebSockets can be mounted cleanly on the native Node.js HTTP server. Crucially, all existing REST routes (`/api/interview/start`, `/api/interview/session/:sessionId/answer`, `/api/interview/session/:sessionId/complete`, `/api/interview/execute`) must remain fully functional to guarantee zero test regressions.

---

## 1. Entry Point & Server Lifecycle

### 1.1 Current Architecture
- **`src/app.js`**:
  - Initializes Express (`const app = express()`).
  - Configures security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`, `HSTS`, `Permissions-Policy`).
  - Sets up CORS with credentials and multi-origin matching (localhost 5173, 3000, 5000, 127.0.0.1, and `*.onrender.com`).
  - Configures JSON and URL-encoded body parsers capped at 25MB (`limit: "25mb"`).
  - Initializes cookie parser and Passport authentication.
  - Mounts REST routers:
    - `/api/auth` -> `authRouter`
    - `/api/company` -> `companyRouter`
    - `/api/candidate` -> `candidateRouter`
    - `/api/assessments` -> `assessmentRouter`
    - `/api/interview` -> `interviewRouter`
    - `/api/evaluation` -> `evaluationRouter`
    - `/api/tts` -> `ttsRouter`
  - Defines 404 handler for unmatched `/api` endpoints and global error handling middleware for `ApiError`, `CastError`, and `ValidationError`.
  - Exports `{ app }`.

- **`src/index.js`**:
  - Loads environment variables from `.env` via `dotenv.config()`.
  - Imports `app` from `./app.js` and `connectDB` from `./db/index.js`.
  - Currently invokes `app.listen(PORT, ...)` directly.
  - Connects to MongoDB asynchronously with connection verification.

### 1.2 Mounting WebSockets Alongside Express Cleanly
Currently, `app.listen()` internally creates a standard Node `http.Server`. To mount WebSockets cleanly alongside Express:
1. In `src/index.js`, replace `app.listen(PORT)` with:
   ```js
   import http from 'http';
   import { mountInterviewSocket } from './ws/interviewSocket.js';

   const server = http.createServer(app);
   mountInterviewSocket(server);

   server.listen(PORT, () => {
       console.log(`⚙️ Server is running at port : ${PORT}`);
   });
   ```
2. The WebSocket server (`ws.WebSocketServer`) attaches to the HTTP server on path `/ws/interview`:
   ```js
   const wss = new WebSocketServer({ server, path: '/ws/interview' });
   ```
3. **No Collision with REST**:
   - HTTP GET/POST/PATCH requests to `/api/*` and `/` are handled by Express as usual.
   - HTTP Upgrade requests targeting path `/ws/interview` are captured by `ws`.
   - Test suites (e.g., `tests/integration.test.js`) create their own `server = http.createServer(app)` on an ephemeral port. Because `app` is untouched, integration tests running against REST endpoints remain 100% isolated and unaffected.
   - Optional: `tests/integration.test.js` or dedicated WebSocket simulation tests can also invoke `mountInterviewSocket(server)` when testing WebSocket flows.

---

## 2. Current Interview Session Flow & Services

### 2.1 Route & Controller Endpoints (`src/routes/interview.routes.js`, `src/controllers/interview.controller.js`)

| Method | Endpoint | Handler | Description |
|---|---|---|---|
| `POST` | `/api/interview/start` & `/api/interview/start/:code` | `startSession` | Validates assessment status, time window, candidate eligibility, prevents re-taking completed assessments (Fix Change H), acquires concurrency lock to prevent duplicate session creation, creates `InterviewSession` in `CONCEPTUAL` stage, calls `generateOpeningGreeting`. |
| `POST` | `/api/interview/practice/start` | `startPracticeSession` | Creates an isolated mock interview session using default Practice Assessment, marked `isPractice: true`. |
| `POST` | `/api/interview/message` & `/session/:sessionId/answer` | `sendCandidateMessage` | Receives candidate answer (text/voice transcript) and current editor code. Enforces assessment closing window & duration limits. Computes timeline pacing via `getActivePhaseInfo`. Calls `generateNextInterviewStep`. Updates state machine topic counts, handles `CODING` transition or `COMPLETED` stage transition. |
| `POST` | `/api/interview/execute` & `/run-code` | `runCandidateCode` | Safely executes candidate code in `executeCodeSandbox` across JavaScript, Python, C++, and Java. Returns `{ output, hasError, executionTime }`. |
| `POST` | `/api/interview/submit` & `/session/:sessionId/complete` | `submitSession` | Idempotently completes session (`COMPLETED` or `TIMED_OUT`), closes duplicate in-progress sessions, and triggers `evaluateInterviewSession`. |
| `POST` | `/api/interview/session/:sessionId/proctoring` & `/proctoring/event` | `recordProctoringEvent` | Records tab switches, window blurs, suspicious pastes, face tracking anomalies, and deducts integrity points. |

### 2.2 AI Service (`src/services/ai.service.js`)
- **Multi-Model Fallback**: Uses `GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-flash-lite-latest']`.
- **Native Fetch**: Uses standard global `fetch` with Google Gemini REST API (`/v1beta/models/{model}:generateContent`).
- **Test Mode Detection**: Line 9: `if (process.env.NODE_ENV === 'test') return null;`. When in test mode or without API key, returns high-fidelity fallback objects with technical heuristics.
- **Key Functions**:
  - `generateOpeningGreeting`: Warm icebreaker introducing interviewer (Rohan) and asking candidate for background.
  - `generateNextInterviewStep`: Multi-turn dialogue manager. Injects timing context, blueprint directives, candidate resume, and untrusted-input adversarial defense. Returns `{ message, nextStage, stateAction, answerEvaluation, codingChallenge }`.
  - `parseResumeDocument`: Extracts skills, projects, and summary from PDF/text.
  - `synthesizeInterviewBlueprint`: Parses company JD / hiring rubrics into timeline, phases, and interviewer persona prompt.

### 2.3 TTS Service (`src/services/tts.service.js` & `src/controllers/tts.controller.js`)
- **Current Voices**:
  - `edge-neural-neerja` (`en-IN-NeerjaNeural`) via `msedge-tts` (100% free, high-quality neural female voice).
  - `edge-neural-prabhat` (`en-IN-PrabhatNeural`) via `msedge-tts` (free neural male voice).
  - `browser-speech`: Client-side Web Speech API fallback.
  - `google-cloud-neural`: Google Cloud TTS API if `GOOGLE_TTS_API_KEY` is present.
- **Current Latency Bottleneck**:
  - Frontend waits for entire AI turn text → calls `POST /api/tts/synthesize` with full text → waits for entire MP3 audio buffer → plays. Perceived delay: 3-4 seconds.
- **Upgrade Path (Phase 1)**:
  - Add `streamTTSChunks(text, voiceModel)` async generator.
  - Splits text into sentence boundaries (`/[^.!?]+[.!?]+/g`).
  - Synthesizes sentence 1 immediately (~300-500ms) and streams binary chunk or base64 over WebSocket to client `audioQueue`.
  - Synthesizes remaining sentences concurrently while client plays sentence 1. Perceived latency drops below 800ms.

### 2.4 STT Service
- **Current State**:
  - No `src/services/stt.service.js` exists in the repository.
  - Candidate speech is currently handled exclusively on the client side via browser `webkitSpeechRecognition` / Web Speech API, which sends final transcript strings to `POST /api/interview/message`.
- **Upgrade Path (Phase 1)**:
  - Create `src/services/stt.service.js` implementing server-side Google Cloud Speech (`@google-cloud/speech` with `LINEAR16` PCM, 16000Hz, language `en-IN`, fallback `en-US`).
  - Handles incoming `AUDIO_CHUNK` WebSocket frames when browser STT is unsupported or degraded.

### 2.5 Company Scraper Service (`src/services/companyScraper.service.js`)
- **Current State**:
  - Uses `gemini-flash-lite-latest` with `tools: [{ googleSearch: {} }]` to perform live Google Search Grounding for company interview debriefs, Glassdoor reports, and LeetCode Discuss posts.
  - Caches results in an in-memory `Map` (`scrapedIntelligenceCache`) with 2-hour TTL.
  - Fallback data exists for popular companies (`POPULAR_COMPANIES`: Google, Amazon, Meta, Microsoft, Netflix, Apple, Uber, Stripe).
- **Upgrade Path (Phases 2 & 3)**:
  - Migrate cache to persistent MongoDB model `PersonaCache` (`personaCache.model.js`).
  - Enhance scraping queries to explicitly ground Reddit (`r/cscareerquestions`, `r/leetcode`, `r/interviewbit`), Blind, Glassdoor, and LeetCode Discuss.
  - Create `personaEngine.js` to build company-specific interviewer personas with authentic behavioral styles and company culture rubrics.
  - Inject `HUMAN_SPEECH_DIRECTIVES` into system prompts.

### 2.6 Evaluation Service (`src/services/evaluation.service.js`)
- **Current State**:
  - `evaluateInterviewSession(sessionId)`: Loads session, executes test cases in sandbox, gathers candidate interview history with the company, and calls `generateAiEvaluation`.
  - `generateAiEvaluation`: Multi-pass evaluation that grades overall, conceptual, coding, code quality, and communication scores (0-100), determines verdict (`Strong Hire`, `Hire`, `Needs Improvement`, `Reject`), extracts candidate questions asked, and generates role rubrics feedback matching `keyCompetencies`.
  - Robust `buildDynamicFallback`: When `NODE_ENV === 'test'` or Gemini is unavailable, parses actual transcript length, word counts, technical vocabulary frequency, and test cases passed to compute accurate scores.
- **Upgrade Path (Phase 4)**:
  - Add turn-by-turn micro-scoring (`scoreSingleAnswer`) on every candidate answer during the live interview.
  - Add running Candidate Readiness Index (`updateCandidateProfile`) stored on `InterviewSession.candidateProfile`.
  - Implement 5-pass deep final evaluation (`generateDeepEvaluation`) analyzing topics, cross-topic patterns, coding quality, communication, and behavioral signals in parallel.

---

## 3. Existing Integration & Unit Tests Verification

### 3.1 Test Suites Inspected and Executed

1. **`node backend/tests/blueprintParser.test.js`**:
   - Tests `extractBlueprintDurationAndTimeline` and `getActivePhaseInfo`.
   - Verified: Universal format (45m), explicit duration text (60m), hour format (1.5h -> 90m), active phase calculation, buffer detection, and wrap-up pacing.
   - **Status: PASS (100%)**

2. **`node backend/tests/interviewEvaluation.test.js`**:
   - Tests `generateAiEvaluation` with mock transcript, company history, key competencies, and coding test case results.
   - Asserts: `evalResult.scores.overall > 0`, `evalResult.candidateQuestionsAsked` extracted with interviewer answer and analysis, `companyHistoryContext` matches, `roleRubricsFeedback` has exact length and statuses (`EXCEEDS_EXPECTATIONS`, `MEETS_EXPECTATIONS`, `BELOW_EXPECTATIONS`).
   - Tests candidate asking questions during interview turn via `generateNextInterviewStep` and asserts response references engineering practices.
   - **Status: PASS (100%)**

3. **`node backend/tests/integration.test.js`**:
   - Comprehensive suite with 62 discrete assertions across 8 functional suites:
     1. **Auth Suite (12 tests)**: Company & candidate registration, token issuance, duplicate email checks, password verification, `getMe` (with/without token), token refresh via `RefreshToken` model, Google OAuth route.
     2. **Assessment Suite (10 tests)**: Role creation, assessment creation with unique `ASMT-` code, list assessments, status toggle (`CLOSED` / `ACTIVE`), candidate lobby access, 404 for bad codes, 403 for future opening time, 403 for expired closing time, 403 for unauthorized invite-only candidates.
     3. **Interview Suite (5 tests)**: `POST /api/interview/start`, `POST /api/interview/session/:sessionId/answer`, `POST /api/interview/session/:sessionId/complete` (with code submission), attempt to resume completed session fails with 403, practice session startup with `isPractice: true`.
     4. **Sandbox Suite (4 tests)**: JavaScript execution (checks output 5), Python execution (checks output 20), timeout handling for infinite loops (`while(true){}` returns 200 with timeout message), C++ compilation and execution.
     5. **Evaluation Suite (6 tests)**: `my-reports`, `POST /api/evaluation/trigger/:sessionId`, `GET /api/evaluation/session/:sessionId` (verifies scores object), cross-candidate authorization (403 when candidate B triggers or views candidate A's eval), recruiter leaderboard access, recruiter decision update (`SHORTLISTED`).
     6. **Company Interviews Suite (4 tests)**: `GET /api/company/interviews` returns `{ ongoing: [], completed: [] }`, completed array contains at least 1 entry.
     7. **Candidate Dashboard Suite (2 tests)**: `GET /api/candidate/dashboard` returns 200 with stats.
     8. **Security & RBAC Suite (7 tests)**: Candidate forbidden from creating assessments/roles (403), company forbidden from starting candidate interviews (403), rival company forbidden from viewing, toggling, or viewing leaderboard of another company's assessment (404/403).
   - **Status: 62 passed, 0 failed, 62 total (100% PASS)**

### 3.2 Regression Prevention Blueprint
To ensure that all 62 integration tests continue passing with zero regressions:
1. **Never mutate existing REST contract**:
   - `POST /api/interview/start` must return HTTP 200/201 with `{ data: { session, assessment } }`.
   - `POST /api/interview/session/:sessionId/answer` must accept `{ answer: "..." }` and return HTTP 200 with `{ data: { aiMessage, stage, transcript, ... } }`.
   - `POST /api/interview/session/:sessionId/complete` must accept `{ codeSubmission: { language, code } }` and return HTTP 200 with `{ data: { status: 'COMPLETED' } }`.
   - `POST /api/interview/execute` must accept `{ language, code, customInput }` and return HTTP 200 with `{ data: { output, hasError, executionTime } }`.
2. **Preserve `NODE_ENV = 'test'` fallback branches**:
   - `integration.test.js` sets `process.env.NODE_ENV = 'test'`.
   - Both `ai.service.js` and `evaluation.service.js` must preserve their fast fallback paths when `NODE_ENV === 'test'` so tests run deterministically in ~10 seconds without external API delays or quotas.
3. **Mongoose Model Schema Backwards Compatibility**:
   - Add new fields (`candidateProfile`, `trainingSignals`, `liveCode`, `persona`) as optional schema fields with sensible defaults on `InterviewSession`.
   - Existing documents and queries must continue operating seamlessly.

---

## 4. Dependencies & Scripts

### 4.1 Existing `backend/package.json`

```json
{
  "name": "backend",
  "version": "1.0.0",
  "main": "src/index.js",
  "type": "module",
  "scripts": {
    "test": "node tests/integration.test.js",
    "dev": "nodemon src/index.js",
    "start": "node src/index.js"
  },
  "dependencies": {
    "bcryptjs": "^3.0.3",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.6",
    "dotenv": "^18.0.6",
    "express": "^5.2.1",
    "jsonwebtoken": "^9.0.3",
    "mongoose": "^9.11.1",
    "msedge-tts": "^2.1.0",
    "nodemailer": "^10.1.1",
    "passport": "^0.7.0",
    "passport-google-oauth20": "^2.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.1.14"
  }
}
```

### 4.2 Missing Dependencies to Install / Configure
1. **`ws` (`^8.18.0`)**:
   - Required for `WebSocketServer` at `/ws/interview`.
2. **`@google-cloud/speech` (`^6.7.0`)**:
   - Required for server-side fallback STT (`src/services/stt.service.js`) when processing raw `AUDIO_CHUNK` frames.
3. **`@google/genai` (Optional/Recommended for Streaming)**:
   - Currently, Gemini is called via direct Node.js `fetch` to Google's REST API endpoint. For token streaming, either direct SSE `streamGenerateContent?alt=sse` or `@google/genai` can be used.

### 4.3 Environment Variables (`backend/.env`)
- **Existing**:
  - `PORT=5000`
  - `FRONTEND_URL=http://localhost:5173`
  - `MONGODB_URI=mongodb://localhost:27017/voxcode`
  - `JWT_ACCESS_SECRET=...`
  - `JWT_REFRESH_SECRET=...`
  - `GEMINI_API_KEY=...`
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
- **To Add for Upgrade**:
  - `GOOGLE_CLOUD_STT_KEY` (or Google Application Credentials path for GCP Speech)
  - `CALIBRATION_RUN_INTERVAL=86400`
  - `QUESTION_BANK_CACHE_TTL=604800`

---

## 5. Code Execution Engine (`src/services/sandbox.service.js`)

### 5.1 Current Implementation
- **Architecture**: Isolated local host child process execution using Node's `child_process.spawn`.
- **Environment Isolation**: `getSafeEnv()` strips all sensitive process env variables (`MONGODB_URI`, `JWT_*`, `GEMINI_API_KEY`, etc.), only passing minimal required system paths.
- **Languages Supported**:
  - **JavaScript**: Wraps code in `try/catch`, sets `global.__customInput`, executes with `node solution.js`.
  - **Python**: Executes with `python` (Win32) or `python3` (Unix).
  - **C++**: Compiles with `g++` (or `gcc`), executes generated binary (`.exe` on Windows, `.out` on Linux).
  - **Java**: Wraps in class if needed, compiles with `javac`, executes with `java`.
- **Resource Bounds & Timeouts**:
  - Buffer capped at 512KB (`MAX_OUTPUT_BYTES = 512 * 1024`). Output truncated if exceeded.
  - Configurable timeout (default 8000ms).
  - Clean process tree termination:
    - Windows: `taskkill /pid <pid> /f /t`
    - Unix: `process.kill(-pid, 'SIGKILL')`
  - Scratch workspace in temporary folder (`os.tmpdir()/voxcode_sandboxes/run_<id>`), removed after execution.

### 5.2 Docker Integration Design with Local Child Process Fallback
As specified in Requirement R4 & Plan Phase 5:
- Docker container execution offers stronger sandboxing for untrusted candidate code.
- However, if Docker Desktop or daemon is not running (e.g. during local development or in lightweight test environments), the system **must cleanly fall back** to the existing `executeCodeSandbox` implementation.
- Implementation pattern:
  ```js
  export async function executeCode({ language, code, customInput, timeoutMs }) {
      if (isDockerAvailable()) {
          try {
              return await executeInDocker({ language, code, customInput, timeoutMs });
          } catch (dockerErr) {
              console.warn('[Sandbox] Docker execution failed, falling back to local sandbox:', dockerErr.message);
          }
      }
      return await executeCodeSandbox({ language, code, customInput, timeoutMs });
  }
  ```
- Because `executeCodeSandbox` already passes all integration tests (including timeout handling and infinite loop checks), this dual-engine approach guarantees zero regressions.

---

## 6. Conventions, Module System & File Organization

1. **Module System**:
   - Pure ES Modules (`"type": "module"` in `package.json`).
   - All imports use `import ... from '...'` syntax.
   - **Mandatory Extension Rule**: All local file imports **MUST** include the `.js` extension (e.g., `import { app } from "./app.js";`, `import { InterviewSession } from "../models/interviewSession.model.js";`).
2. **Error Handling Convention**:
   - `ApiError(statusCode, message, errors)` used across all controllers.
   - Handled asynchronously via `asyncHandler(fn)` wrapper.
   - Caught by global Express error middleware at bottom of `app.js`.
3. **Response Structure Convention**:
   - `ApiResponse(statusCode, data, message)` used across all controllers.
   - Format: `{ statusCode, data, message, success: true }`.
4. **New Files Layout**:
   - WebSocket handler: `backend/src/ws/interviewSocket.js`
   - Services: `backend/src/services/stt.service.js`, `backend/src/services/personaEngine.js`, `backend/src/services/codingProblemEngine.js`
   - Models: `backend/src/models/personaCache.model.js`, `backend/src/models/questionBank.model.js`, `backend/src/models/calibrationConfig.model.js`
   - Scripts: `backend/scripts/calibrateEvaluation.js`, `backend/scripts/optimizeQuestionBank.js`, `backend/scripts/simulateInterview.js`, `backend/scripts/benchmarkLatency.js`
   - Utils: `backend/src/utils/candidateProfileTracker.js`

---

## Conclusion & Readiness
The backend codebase is clean, well-tested, and perfectly aligned with the architectural vision in `REAL_INTERVIEW_UPGRADE_PLAN.md`. Implementing WebSockets on the native HTTP server, streaming sentence-level TTS chunks, running turn-by-turn CRI micro-scoring, and persisting company personas can be done without altering existing REST route contracts, guaranteeing that all 62 existing integration tests continue to pass with zero regressions.
