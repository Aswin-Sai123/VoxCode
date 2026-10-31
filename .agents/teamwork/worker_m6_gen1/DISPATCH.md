## 2026-10-30T18:55:55Z
You are worker_m6_gen1. Your working directory is:
c:\Users\pratheek\OneDrive\Documents\VoxCode\.agents\teamwork\worker_m6_gen1\

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY READING:
- c:\Users\pratheek\OneDrive\Documents\VoxCode\.agents\teamwork\ORIGINAL_REQUEST.md
- c:\Users\pratheek\OneDrive\Documents\VoxCode\PROJECT.md
- C:\Users\pratheek\.gemini\antigravity\brain\b96f18cf-b1bf-4f4c-ba3a-6b8d0ad2e40a\REAL_INTERVIEW_UPGRADE_PLAN.md (Phases 5, 6, 7)

TASK: Complete Milestone 6 — Frontend Hooks & Audio/Transcript Components:
1. `frontend/src/hooks/useInterviewSocket.js`:
   - Persistent WebSocket connection to `ws://<host>:<port>/ws/interview?token=<JWT>&sessionId=<ID>` (derives ws/wss host from window.location or environment).
   - Lifecycle management: `connecting`, `connected`, `disconnected`, `reconnecting` with exponential backoff.
   - Outbound message senders:
     - `sendTextMessage(text)` -> `{ type: 'TEXT_MESSAGE', text }`
     - `sendAudioChunk(base64Data, sampleRate)` -> `{ type: 'AUDIO_CHUNK', data: base64Data, sampleRate }`
     - `sendCodeSnapshot(code, language)` -> `{ type: 'CODE_SNAPSHOT', code, language }`
     - `sendInterrupt()` -> `{ type: 'INTERRUPT' }`
   - Inbound event handlers:
     - `TEXT_TOKEN`: streams AI response tokens
     - `AUDIO_CHUNK`: dispatches audio chunks to playback queue
     - `AI_INTERRUPTED`: triggers instantaneous queue flush
     - `AI_CODE_COMMENT`: receives live AI commentary on code
     - `CRI_UPDATE`: updates candidate readiness index & signal
     - `ERROR`: manages error states
   - Safe unmount cleanup.

2. `frontend/src/hooks/useVAD.js`:
   - Voice Activity Detection using Web Audio API (`AudioContext`, `AnalyserNode`).
   - Energy/RMS thresholding with configurable speech-start and speech-end debouncing.
   - Automatically detects user speech; when user speaks while AI audio is playing, invokes `onSpeechStart` callback (triggering `sendInterrupt()` and audio queue flush for natural barge-in).
   - Exports `{ isSpeaking, volume, startListening, stopListening, isListening }`.

3. `frontend/src/hooks/useAudioQueue.js`:
   - Web Audio playback queue with sample-accurate scheduling.
   - Decodes incoming audio chunks (base64 PCM / MP3 / WAV).
   - Sequential playback buffer management.
   - Instantaneous flush (`flushQueue`): cancels active `AudioBufferSourceNode` immediately and empties queue on interruption.
   - Exports `{ queueAudioChunk, flushQueue, isPlaying, currentChunkIndex, analyser }`.

4. `frontend/src/utils/audioCapture.js`:
   - Captures microphone audio stream via `navigator.mediaDevices.getUserMedia`.
   - Audio processing / downsampling to 16kHz PCM mono for backend STT compatibility.
   - Emits audio chunks as base64 strings to a callback.
   - Clean shutdown of audio streams and AudioContext.

5. `frontend/src/components/interview/LiveTranscript.jsx`:
   - Displays real-time streaming tokens and candidate interim speech.
   - Shows live token streaming for AI responses, candidate interim transcript, and visual status badges (e.g. CRI indicator, speaking badge).

6. `frontend/src/components/interview/AudioVisualizer.jsx`:
   - Dynamic canvas audio waveform visualizer.
   - Reads frequency or time-domain data from `AnalyserNode` and renders smooth animated waveform bars during audio playback or candidate speech.

7. Integration into `frontend/src/pages/candidate/InterviewRoom.jsx`:
   - Wire the WebSocket hook (`useInterviewSocket`), VAD (`useVAD`), audio queue (`useAudioQueue`), `LiveTranscript`, and `AudioVisualizer`.
   - Ensure clean fallback to existing REST APIs if WebSocket is unavailable or fails to connect.
   - Forward Monaco code changes to `sendCodeSnapshot`.

8. Verification:
   - Create unit/integration verification test for frontend hooks and components: `backend/tests/frontendHooks.test.js` or frontend test harness.
   - Run frontend build: `npm run build` in `frontend` directory to ensure zero syntax or import errors.
   - Run backend regression tests: `node backend/tests/integration.test.js` (MUST PASS 62/62 with zero regressions).
   - Document results, commands, and file paths in `handoff.md`.
   - Send completion message to parent when done.
