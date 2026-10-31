## 2026-10-30T14:44:05Z
You are Worker for Milestone 2: Real-Time Voice Conversation Engine & WebSocket Server.
Your working directory is: c:\Users\pratheek\OneDrive\Documents\VoxCode\.agents\teamwork\worker_m2
Your parent is: 466d2811-ee76-4144-ac75-8a35cade05a3

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY FIRST STEP:
Read c:\Users\pratheek\OneDrive\Documents\VoxCode\.agents\teamwork\ORIGINAL_REQUEST.md in full before starting work.
Also read c:\Users\pratheek\OneDrive\Documents\VoxCode\PROJECT.md.
Review Explorer reports:
- c:\Users\pratheek\OneDrive\Documents\VoxCode\.agents\teamwork\explorer_m2_1\analysis.md
- c:\Users\pratheek\OneDrive\Documents\VoxCode\.agents\teamwork\explorer_m2_2\analysis.md
- c:\Users\pratheek\OneDrive\Documents\VoxCode\.agents\teamwork\explorer_m2_3\analysis.md

Exclusive Write Ownership:
You exclusively own and may create or edit:
- backend/src/index.js
- backend/src/ws/interviewSocket.js
- backend/src/services/tts.service.js
- backend/src/services/stt.service.js
- backend/tests/websocketInterview.test.js
Do NOT modify any other project files. Note: `backend/src/app.js` must remain untouched to preserve integration test isolation.

Implementation Tasks:
1. `backend/src/index.js`:
   - Wrap `app` with `http.createServer(app)`.
   - Mount WebSocket server via `mountInterviewSocket(server)`.
   - Start listening with `server.listen(PORT, ...)`.
2. `backend/src/ws/interviewSocket.js`:
   - Export `mountInterviewSocket(server)`.
   - Create `const wss = new WebSocketServer({ server, path: '/ws/interview' })`.
   - Parse `token` and `sessionId` from `req.url`.
   - JWT Auth: `jwt.verify(token, process.env.JWT_ACCESS_SECRET)`. Close with code `4001` ('Unauthorized') if missing/invalid.
   - Session Validation: Load session with `InterviewSession.findById(sessionId)`. Check candidate ownership (`session.candidate.toString() === decoded.id`). Close with `4003` ('Session not found') if mismatch. Check if `session.status === 'COMPLETED' || session.status === 'TIMED_OUT'`. Close with `4004` ('Session already completed') if done.
   - Send `{ type: 'SESSION_READY', sessionId }` immediately upon handshake completion.
   - Message routing:
     - `TEXT_MESSAGE`: `{ type: 'TEXT_MESSAGE', text }` -> stream response tokens (`TEXT_TOKEN`) and sentence audio chunks (`AUDIO_CHUNK`).
     - `AUDIO_CHUNK`: `{ type: 'AUDIO_CHUNK', data, sampleRate }` -> transcribe PCM using `stt.service.js`, then process transcript.
     - `CODE_SNAPSHOT`: `{ type: 'CODE_SNAPSHOT', code, language }` -> update `session.liveCode`.
     - `INTERRUPT`: `{ type: 'INTERRUPT' }` -> abort in-flight LLM call via AbortController, destroy active TTS stream, send `{ type: 'AI_INTERRUPTED' }`, set interruption flag so next turn acknowledges candidate naturally.
3. `backend/src/services/tts.service.js`:
   - Export `streamTTSChunks(text, voiceModel = 'edge-neural-neerja', options = {})`.
   - Split clean text into sentences using `/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g`.
   - Async generator yielding `{ text: sentence, audioBase64: buffer.audioBase64 }`.
   - Check `options.signal?.aborted` before and during synthesis to break immediately on interruption.
   - Preserve existing `synthesizeEdgeSpeech` and `synthesizeGoogleSpeech` without regressions.
4. `backend/src/services/stt.service.js`:
   - Export `transcribeAudioBuffer(pcmBuffer, sampleRate = 16000)`.
   - Handle base64 PCM buffer, call `@google-cloud/speech` SpeechClient (`LINEAR16`, `sampleRateHertz`, `en-IN`/`en-US`).
   - If GCP credentials missing or in test environment, return decoded text or test mock without crashing.
5. `backend/tests/websocketInterview.test.js`:
   - Create comprehensive automated test suite with `ws` client:
     - Handshake with valid JWT and active session -> receive `SESSION_READY`.
     - Handshake with invalid JWT -> close `4001`.
     - Handshake with mismatched candidate -> close `4003`.
     - Handshake with completed session -> close `4004`.
     - Send `TEXT_MESSAGE` -> stream `TEXT_TOKEN` and `AUDIO_CHUNK`.
     - Send `INTERRUPT` -> stream halted, receive `AI_INTERRUPTED`.
     - Send `CODE_SNAPSHOT` -> session updated.
     - Verify sentence streaming TTS chunking and interruption abort.
6. Verification Test Suites:
   - `node backend/tests/websocketInterview.test.js`
   - `node backend/tests/models.test.js` (67/67 pass)
   - `node backend/tests/blueprintParser.test.js` (100% pass)
   - `node backend/tests/interviewEvaluation.test.js` (100% pass)
   - `node backend/tests/integration.test.js` (ALL 62 integration tests MUST PASS with ZERO regressions)

