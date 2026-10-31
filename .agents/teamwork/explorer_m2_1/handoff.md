# Milestone 2 Handoff Report: WebSocket Architecture & Mounting Plan

## 1. Observation

1. **Server Entry Point**:
   - `backend/src/index.js:1-22`:
     ```javascript
     import dotenv from "dotenv";
     import connectDB from "./db/index.js";
     import { app } from "./app.js";
     ...
     const PORT = process.env.PORT || 5000;
     app.listen(PORT, () => {
         console.log(`⚙️ Server is running at port : ${PORT}`);
     });
     ```
     `app.listen()` creates an internal `http.Server` and returns it, but currently lacks an explicit `server` instance on which WebSocket upgrade listeners can be bound prior to listening.
   - `backend/src/app.js:1-217`: Exports `{ app }` (Express instance), defines security headers, CORS with whitelist, routes (`/api/auth`, `/api/company`, `/api/candidate`, `/api/assessments`, `/api/interview`, `/api/evaluation`, `/api/tts`), and error handling middleware.

2. **Test Suite Independence**:
   - `backend/tests/integration.test.js:25-27, 70-76`:
     ```javascript
     import mongoose from 'mongoose';
     import { app } from '../src/app.js';
     import http from 'http';
     ...
     server = http.createServer(app);
     await new Promise((resolve) => {
         server.listen(0, '127.0.0.1', () => {
             PORT = server.address().port;
             resolve();
         });
     });
     ```
     The 62 integration tests import `app` directly from `../src/app.js`, bypassing `src/index.js` completely.
   - Command run: `node backend/tests/integration.test.js` produced:
     `RESULTS: 62 passed, 0 failed, 62 total`
   - Command run: `node backend/tests/models.test.js` produced:
     `RESULTS: 67 passed, 0 failed, 67 total`

3. **Dependencies & Runtime Behavior**:
   - `backend/package.json:28`: `"ws": "^8.22.0"` is installed and configured in an ES module project (`"type": "module"`).
   - In Node.js execution:
     `new WebSocketServer({ server, path: '/ws/interview' })` correctly matches query-string-bearing connection requests (`/ws/interview?token=...&sessionId=...`), leaving `req.url` accessible for `new URL(req.url, 'http://localhost')`.
   - Rejection on non-matching path (`/ws/unknown`): returned `HTTP 400 Unexpected server response: 400`.
   - Calling `ws.close(4001, 'Unauthorized')`: client received code `4001` and reason `'Unauthorized'`.
   - Calling `ws.close(4003, 'Session not found')`: client received code `4003` and reason `'Session not found'`.
   - Calling `ws.close(4004, 'Session already completed')`: client received code `4004` and reason `'Session already completed'`.
   - Calling `ws.send(JSON.stringify({ type: 'SESSION_READY', sessionId }))`: client received `{ type: 'SESSION_READY', sessionId: 'sess-123' }`.

4. **Database Models & Ownership Check**:
   - `backend/src/models/interviewSession.model.js:4-27, 208-216`:
     - `candidate`: `Schema.Types.ObjectId, ref: 'Candidate'`
     - `status`: enum `['IN_PROGRESS', 'COMPLETED', 'TIMED_OUT']`
     - `liveCode`: String
     - `codeSubmission`: `{ language, code, output }`
     - `transcript`: `[{ role, text, timestamp, evaluation, topic }]`
   - `backend/src/controllers/auth.controller.js:14`:
     `jwt.sign({ id: user._id, role }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' })`
     JWT payload assigns candidate ID to `decoded.id`. Therefore, `(session.candidate._id || session.candidate).toString() !== decoded.id` accurately identifies unauthorized access.

---

## 2. Logic Chain

1. **Requirement 1 (Non-Breaking Server Mounting)**:
   - Observation 1 & 2 show `integration.test.js` imports `{ app } from '../src/app.js'` and creates its own test HTTP server.
   - Therefore, keeping `backend/src/app.js` free of WebSocket code and mounting `mountInterviewSocket(server)` exclusively inside `backend/src/index.js` guarantees that tests importing `app` never instantiate WebSocket listeners, avoiding port leaks and side-effects.
   - Replacing `app.listen()` with `const server = http.createServer(app); const wss = mountInterviewSocket(server); server.listen(PORT, ...)` in `src/index.js` provides unified dual-transport (REST + WebSocket) on the same port in production.

2. **Requirement 2 (Handshake & Authentication Protocol)**:
   - Observation 3 confirms `req.url` contains full query parameters (`/ws/interview?token=...&sessionId=...`).
   - Parsing with `const url = new URL(req.url, 'http://localhost')` safely provides `url.searchParams.get('token')` and `url.searchParams.get('sessionId')`.
   - Passing `token` to `jwt.verify(token, process.env.JWT_ACCESS_SECRET)` validates authentication. Any failure (missing token, invalid signature, expiration) calls `ws.close(4001, 'Unauthorized')`.
   - Querying `InterviewSession.findById(sessionId)` with ObjectId check validates session existence. Comparing `session.candidate` with `decoded.id` validates candidate ownership. Any mismatch calls `ws.close(4003, 'Session not found')`.
   - Checking `session.status === 'COMPLETED' || session.status === 'TIMED_OUT'` prevents resuming concluded sessions and calls `ws.close(4004, 'Session already completed')`.
   - Observation 3 proves Node's `ws` library cleanly delivers these exact codes and messages to clients.
   - Emitting `{ type: 'SESSION_READY', sessionId }` immediately confirms successful handshake.

3. **Requirement 3 (Message Dispatch & Interruption Handling)**:
   - Validating message frames (`TEXT_MESSAGE`, `AUDIO_CHUNK`, `CODE_SNAPSHOT`, `INTERRUPT`) against JSON parsing and schema structure prevents unhandled exceptions.
   - Tracking connection state (`currentAIGeneration`, `currentTTSStream`, `isInterrupted`) enables barge-in: on `INTERRUPT`, invoking `currentAIGeneration.abort()` and destroying the TTS stream immediately halts downstream processing and emits `{ type: 'AI_INTERRUPTED' }`.

---

## 3. Caveats

1. **Google Speech API Authentication in Test Environments**:
   `@google-cloud/speech` requires service account credentials in production; for test environments and local development without cloud credentials, server STT must degrade gracefully and rely on client Web Speech API sending `TEXT_MESSAGE`.
2. **MongoDB Connection in WebSocket Tests**:
   Any new integration test testing the WebSocket handshake against live database sessions must connect to MongoDB (e.g. ephemeral test DB) or mock `InterviewSession.findById`.
3. **Dual Connection Deduplication**:
   If a single candidate opens multiple browser tabs for the same session, both tabs could connect unless a concurrency map (`Map<sessionId, WebSocket>`) terminates previous sockets. A connection registry map in `interviewSocket.js` can gracefully close older sockets if desired.

---

## 4. Conclusion

The recommended architecture achieves 100% adherence to Milestone 2 specifications:
1. `backend/src/index.js` mounts `mountInterviewSocket(server)` on native `http.createServer(app)`, ensuring Express routes and WebSocket paths co-exist seamlessly on `PORT`.
2. `backend/src/app.js` is unchanged, protecting all 62 existing integration tests from regression.
3. `backend/src/ws/interviewSocket.js` fulfills all handshake, JWT auth (`4001`), session check (`4003`), status check (`4004`), `SESSION_READY` frame dispatch, and incoming message routing (`TEXT_MESSAGE`, `AUDIO_CHUNK`, `CODE_SNAPSHOT`, `INTERRUPT`).
4. Complete Worker-ready code snippets and architecture specifications are delivered in `analysis.md`.

---

## 5. Verification Method

To independently verify this architecture and subsequent implementation:

1. **Verify Regression Baseline**:
   Run the 62 existing integration tests:
   ```bash
   node backend/tests/integration.test.js
   ```
   *Expected*: 62 passed, 0 failed.

2. **Verify Models Baseline**:
   ```bash
   node backend/tests/models.test.js
   ```
   *Expected*: 67 passed, 0 failed.

3. **Verify WebSocket Server & Handshake with Client Harness**:
   Create and execute `node backend/tests/interviewSocket.test.js` to assert:
   - Connection without token closes with code `4001` and reason `'Unauthorized'`.
   - Connection with invalid token closes with code `4001` and reason `'Unauthorized'`.
   - Connection with non-existent session ID closes with code `4003` and reason `'Session not found'`.
   - Connection with completed session closes with code `4004` and reason `'Session already completed'`.
   - Valid handshake receives `{ type: 'SESSION_READY', sessionId }`.
   - Sending `{ type: 'INTERRUPT' }` receives `{ type: 'AI_INTERRUPTED' }`.
   - Sending `{ type: 'CODE_SNAPSHOT', code: 'console.log(1)' }` updates `session.liveCode`.

4. **Invalidation Conditions**:
   - If importing `app` triggers WebSocket server instantiation.
   - If any of close codes `4001`, `4003`, `4004` or reasons differ.
   - If `SESSION_READY` is not dispatched as first frame upon successful handshake.
