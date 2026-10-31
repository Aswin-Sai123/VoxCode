# BRIEFING — 2026-10-31T00:46:00Z

## Mission
Complete Milestone 6: Frontend Hooks & Audio/Transcript Components for real-time AI interview streaming, voice activity detection, barge-in interruption, audio visualizer, live transcript, and InterviewRoom integration.

## 🔒 My Identity
- Archetype: implementer
- Roles: implementer, qa
- Working directory: c:\Users\pratheek\OneDrive\Documents\VoxCode\.agents\teamwork\worker_m6_gen1\
- Original parent: 85ce2c80-d245-4bba-96ba-f74fe55e219a
- Milestone: Milestone 6 (Frontend Hooks & Audio/Transcript Components)

## 🔒 Key Constraints
- Persistent WebSocket connection to `/ws/interview?token=<JWT>&sessionId=<ID>` with exponential backoff reconnect.
- Real-time VAD barge-in: cancel audio queue and send INTERRUPT immediately on speech start when AI audio is active.
- Audio queue sample-accurate scheduling with instantaneous flush.
- 16kHz PCM mono audio capture downsampling utility.
- LiveTranscript streaming tokens and candidate interim speech.
- AudioVisualizer dynamic waveform on Canvas.
- Clean fallback to REST APIs in InterviewRoom.jsx if WS disconnected.
- Forward Monaco code changes with debounce to `sendCodeSnapshot`.
- Verification: frontend build (`npm run build`), backend regression tests (`node backend/tests/integration.test.js` passing 62/62), unit test for frontend hooks/utils.
- Zero cheating / facades / dummy logic. Real state and genuine behavior.

## Current Parent
- Conversation ID: 85ce2c80-d245-4bba-96ba-f74fe55e219a
- Updated: 2026-10-31T00:46:00Z

## Task Summary
- **What to build**:
  1. `frontend/src/utils/audioCapture.js`: 16kHz downsampling, 16-bit PCM conversion, base64 encoder/decoder, AudioCapture class.
  2. `frontend/src/hooks/useAudioQueue.js`: Sample-accurate Web Audio playback queue, MP3/WAV/PCM base64 decoding, AnalyserNode integration, instantaneous flush.
  3. `frontend/src/hooks/useVAD.js`: Web Audio RMS energy thresholding, debounced speech detection, barge-in callback invocation.
  4. `frontend/src/hooks/useInterviewSocket.js`: WebSocket lifecycle manager with exponential backoff, inbound event router, outbound frame senders (`TEXT_MESSAGE`, `AUDIO_CHUNK`, `CODE_SNAPSHOT`, `INTERRUPT`).
  5. `frontend/src/components/interview/LiveTranscript.jsx`: Real-time streaming token feed, candidate interim text, CRI badge indicator, connection status.
  6. `frontend/src/components/interview/AudioVisualizer.jsx`: Animated HTML5 Canvas waveform with Web Audio AnalyserNode frequency bins and organic fallback.
  7. `frontend/src/pages/candidate/InterviewRoom.jsx`: Integrated hooks and components with REST API fallback and Monaco code forwarding.
- **Success criteria**:
  - `npm run build` passes with 0 errors: VERIFIED (Vite v8.3.4 client production bundle generated cleanly)
  - `node backend/tests/frontendHooks.test.js` passes 16/16: VERIFIED
  - `node backend/tests/integration.test.js` passes 62/62: VERIFIED (zero regressions)
  - `node backend/tests/interviewEvaluation.test.js` passes 100%: VERIFIED
- **Interface contracts**: `PROJECT.md`, `backend/src/ws/interviewSocket.js`, `REAL_INTERVIEW_UPGRADE_PLAN.md`
- **Code layout**: `frontend/src/hooks`, `frontend/src/utils`, `frontend/src/components/interview`, `frontend/src/pages/candidate`

## Key Decisions Made
- Resampling algorithm: Used weighted averaging linear interpolation in `downsampleBuffer` to downsample browser audio context sample rates (44.1kHz/48kHz) down to 16kHz PCM mono.
- Dual audio decoding: In `useAudioQueue.js`, native `decodeAudioData` is tried first for MP3/WAV/AAC payloads from Edge Neural TTS, with a custom 16-bit PCM buffer decoder fallback.
- Instantaneous flush: Immediately cancels all active `AudioBufferSourceNode`s via `stop(0)` and `disconnect()`, empties pending queues, and resets playback timeline upon barge-in or interruption.
- Clean backward compatibility: Maintained 100% fallback to REST endpoints (`/interview/message`, `/tts/synthesize`) in `InterviewRoom.jsx` if WebSocket disconnects or fails.

## Artifact Index
- `frontend/src/utils/audioCapture.js` — Microphone stream capture and 16kHz PCM encoding
- `frontend/src/hooks/useAudioQueue.js` — Streaming audio playback queue and instant flush
- `frontend/src/hooks/useVAD.js` — Voice activity detection and barge-in hook
- `frontend/src/hooks/useInterviewSocket.js` — WebSocket connection and event dispatch hook
- `frontend/src/components/interview/LiveTranscript.jsx` — Real-time transcript display component
- `frontend/src/components/interview/AudioVisualizer.jsx` — Dynamic waveform visualizer component
- `frontend/src/pages/candidate/InterviewRoom.jsx` — Integrated interview room page
- `backend/tests/frontendHooks.test.js` — Comprehensive verification test suite for M6

## Change Tracker
- **Files modified**:
  - `frontend/src/utils/audioCapture.js` (created)
  - `frontend/src/hooks/useAudioQueue.js` (created)
  - `frontend/src/hooks/useVAD.js` (created)
  - `frontend/src/hooks/useInterviewSocket.js` (created)
  - `frontend/src/components/interview/LiveTranscript.jsx` (created)
  - `frontend/src/components/interview/AudioVisualizer.jsx` (created)
  - `frontend/src/pages/candidate/InterviewRoom.jsx` (updated with full integration)
  - `backend/tests/frontendHooks.test.js` (created)
- **Build status**: `npm run build` PASSED (0 errors); `node backend/tests/frontendHooks.test.js` PASSED (16/16); `node backend/tests/integration.test.js` PASSED (62/62)
- **Pending issues**: None

## Quality Status
- **Build/test result**: All passing (16/16 frontend hooks tests, 62/62 integration tests, 100% evaluation tests)
- **Lint status**: Clean (0 errors, 44 warnings across existing codebase)
- **Tests added/modified**: `backend/tests/frontendHooks.test.js` (16 test cases)
