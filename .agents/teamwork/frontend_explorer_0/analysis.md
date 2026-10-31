# VoxCode Frontend Architecture & Upgrade Analysis

**Agent:** Frontend Explorer 0  
**Target:** Real Interview Experience Upgrade Plan  
**Working Directory:** `c:\Users\pratheek\OneDrive\Documents\VoxCode\frontend\`  
**Timestamp:** 2026-10-30T13:58:00Z  

---

## Executive Summary

VoxCode's frontend is a modern, high-performance React application built with **React 19.2.8**, **Vite 8.3.4**, and **Tailwind CSS 3.4.19**. It features rich interactive interview workflows, including a pre-interview lobby with hardware diagnostics, an interview room with an adaptive voice discussion studio and split-pane Monaco code editor, and post-interview rubric evaluation reports.

However, the current interview experience operates over **sequential, request-response REST HTTP round-trips**:
1. Candidate speaks $\rightarrow$ browser `webkitSpeechRecognition` runs locally $\rightarrow$ candidate stops $\rightarrow$ full text posted via `POST /api/interview/message`.
2. Backend invokes Gemini LLM in a single blocking turn (2-4s) $\rightarrow$ returns full text.
3. Frontend issues a separate `POST /api/tts/synthesize` $\rightarrow$ backend synthesizes full MP3 buffer (1-2s) $\rightarrow$ returns base64 audio.
4. Frontend loads entire base64 audio into an HTML `Audio` element $\rightarrow$ begins playback ~4-6 seconds after candidate finishes speaking.

This investigation provides a comprehensive mapping of the current frontend implementation and establishes the exact design for integrating **Phase 1 (WebSocket, VAD, sentence-streaming TTS, sample-accurate audio queue)** and **Phase 5 (collaborative IDE live streaming)** via non-breaking modular hooks and components with automatic REST fallback.

---

## 1. Architecture & Framework Mapping

### 1.1 Core Stack & Dependencies
From `frontend/package.json`:
- **React Core:** `react: ^19.2.8`, `react-dom: ^19.2.8`
- **Build Tool:** `vite: ^8.3.0` (`@vitejs/plugin-react: ^6.1.1`)
- **Routing:** `react-router-dom: ^7.18.4`
- **Styling:** `tailwindcss: ^3.4.19`, `postcss: ^8.5.29`, `autoprefixer: ^10.6.1`
- **Code Editor:** `@monaco-editor/react: ^4.7.0`
- **Icons & UI:** `lucide-react: ^1.53.0`, `sonner: ^2.0.8` (toast notifications), `canvas-confetti: ^1.9.4`
- **HTTP Client:** `axios: ^1.20.0`
- **File Parsing:** `read-excel-file: ^9.3.14`
- **Linter:** `oxlint: ^1.81.0` (runs in ~340ms across 33 files with zero errors)

### 1.2 Build & Dev Server Configuration
- `vite.config.js`:
  ```javascript
  import react from '@vitejs/plugin-react'
  import { defineConfig } from 'vite'

  export default defineConfig({
    plugins: [react()],
  })
  ```
  *Note:* Currently, no proxy configuration exists in `vite.config.js`. API calls rely on `import.meta.env.VITE_API_URL` (defaulting to `http://localhost:5000/api`).

### 1.3 Routing Structure (`src/App.jsx`)
The application routes are protected by role-based guards:
- **Public Routes:**
  - `/login`: Candidate & Company authentication
  - `/register`: Registration flow
  - `/`: Redirects to `/login`
- **Company Routes (`allowedRole="COMPANY"`):**
  - `/company/dashboard`: Assessment listing, candidate status
  - `/company/create-assessment`: Blueprint generation & criteria
  - `/company/assessment/:id/results`: Recruiter scores & breakdowns
- **Candidate Routes (`allowedRole="CANDIDATE"`):**
  - `/candidate/dashboard`: Active/past assessments, CRI overview, practice session launcher
  - `/candidate/reports`: Assessment report archive
  - `/candidate/reports/:sessionId`: Deep evaluation breakdown
  - `/candidate/assessment/:code`: Assessment Lobby (hardware checks, resume upload, voice selection)
  - `/candidate/interview/:code`: Live Interview Room (fullscreen workspace, navbar suppressed)
- **Catch-all:** `*` $\rightarrow$ `NotFound`

### 1.4 State Management
- **React Context Hierarchy:**
  `ErrorBoundary` $\rightarrow$ `ThemeProvider` $\rightarrow$ `AuthProvider` $\rightarrow$ `Router` $\rightarrow$ `AppContent`
  - `AuthContext`: Tracks authenticated user profile (`user`), auth token persistence in `localStorage` (`accessToken`, `refreshToken`, `userRole`), token refresh interceptor via Axios (`api.js`), and login/logout methods.
  - `ThemeContext`: Handles dark mode (`bg-[#0A0A0B]`) and light mode (`bg-[#F8FAFC]`) toggling and persistence.
- **Local & Component State:**
  - No Redux or Zustand is installed. State is managed locally via React hooks (`useState`, `useRef`, `useMemo`, `useEffect`).
  - This architecture makes modular custom hooks (`useInterviewSocket`, `useVAD`, `useAudioQueue`) the ideal pattern for managing real-time interview state without bloating global context.

---

## 2. Existing Interview Experience Deep Dive

### 2.1 The Assessment Lobby (`src/pages/candidate/AssessmentLobby.jsx`)
1. **Verification & Context Retrieval:**
   - On load, calls `GET /api/assessments/join/:code` to verify validity, format (`FULL_INTERVIEW` vs `PROJECT_AND_TECHNICAL_ONLY`), duration, and company details.
   - Calls `GET /api/candidate/resume` to auto-populate saved profile resume and project extracts.
2. **Resume Upload & Parsing:**
   - Accepts `.pdf`, `.docx`, `.doc`, `.txt` up to 20MB.
   - Encodes to base64 and posts to `POST /api/candidate/resume/upload`.
   - Backend extracts projects, tech stacks, and profile summary; lobby displays parsed project pills.
3. **Hardware Readiness Checks:**
   - **Microphone:** Calls `navigator.mediaDevices.getUserMedia({ audio: true })`. Creates Web Audio API `AudioContext` + `createAnalyser()` with 64 FFT size. Renders dynamic volume meter for 5 seconds to confirm audio levels.
   - **Speaker:** Tests selected voice model by calling `POST /api/tts/synthesize` or falling back to `window.speechSynthesis`.
   - **Camera:** Visual readiness indicator.
4. **Voice Model Selector (`VoiceModelSelectorModal.jsx`):**
   - Supports 4 models:
     - `edge-neural-neerja` (Microsoft Edge Neural — Neerja, Female Indian English, Default)
     - `edge-neural-prabhat` (Microsoft Edge Neural — Prabhat, Male Indian English)
     - `browser-speech` (Local Web Speech API fallback)
     - `google-cloud-neural` (Google Cloud Neural2 / WaveNet)
   - Preference saved in `localStorage.setItem('voxcode_preferred_voice_model')` and `sessionStorage`.
5. **Interview Entry:**
   - Validates that resume is present and scheduled opening time has arrived.
   - Navigates to `/candidate/interview/:code` passing resume text and selected voice model.

### 2.2 Live Interview Room (`src/pages/candidate/InterviewRoom.jsx`)
The interview room is an expansive 2,110-line component managing three distinct stages:

#### A. Initialization
- Calls `POST /api/interview/start/:code` with `{ resumeText }`.
- Receives `{ session, assessment }`:
  - `session.stage` ('CONCEPTUAL' | 'CODING' | 'COMPLETED')
  - `session.transcript` (array of turns `{ role: 'ai' | 'candidate', text, timestamp }`)
  - Server-authoritative timer: calculates remaining seconds from `startedAt` and `durationMinutes`.
  - Speaks initial AI greeting message via `speakAiMessage(firstMsg)`.

#### B. Stage 1: `CONCEPTUAL` (Voice Discussion Studio)
- **Interviewer Visual:** `VoiceVisualizerOrb.jsx` (physics-damped canvas oscilloscope + multi-band audio spectrum with dBFS telemetry).
- **Caption Display:** `LiveCaptionsText` provides a word-by-word karaoke ticker highlighting spoken words.
- **Candidate Input:**
  - Speech: `toggleSpeechRecognition()` activates browser `SpeechRecognition` / `webkitSpeechRecognition` (`continuous = true`, `interimResults = true`).
  - Push-to-Talk: Spacebar hold-to-speak listener.
  - Text Drawer: Option to type answers.
- **Sending Message:**
  - `handleSendMessage()` collects transcribed text.
  - Issues `POST /api/interview/message` with `{ sessionId, code, message, currentCode, executionOutput }`.
  - Backend runs `generateNextInterviewStep`, returns `{ aiMessage, stage, codingChallenge, transcript, currentTopic, ... }`.
  - If stage transitions to `CODING`, sets banner and initializes Monaco challenge.
  - Calls `speakAiMessage(aiMessage)`.

#### C. Stage 2: `CODING` (HackerRank-style Collaborative Workspace)
- **Layout:** Resizable split panels:
  - **Left Panel:** Tabs for "Problem" (description, constraints, testcases) and "Discussion" (interviewer chat history + continuous mic button).
  - **Right Panel:** Monaco Editor + IDE Pro Bar (Language selector, themes `vs-dark`/`vs`/`hc-black`, font size, code formatting) + Resizable execution terminal drawer ("Test Cases" and "Execution Output").
- **Code Execution:**
  - "Run Code" button calls `POST /api/interview/run-code` with `{ language, code, customInput }`.
  - Sandboxed execution runs on backend via child process isolation (`executeCodeSandbox` in `sandbox.service.js`).
  - Execution output, error status, and execution time display in the terminal.

#### D. Stage 3: `COMPLETED`
- Triggered by `handleSubmitInterview()` (`POST /api/interview/submit`), auto-submit on countdown expiry, or backend topic conclusion.
- Triggers confetti and renders completion summary card. For practice interviews, links to `/candidate/reports/:sessionId`.

---

## 3. Audio & Voice Implementation: Root Cause Analysis

### 3.1 Current Candidate Voice Input Architecture
- **Implementation:**
  ```javascript
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  ```
- **Limitations:**
  1. **Zero Server Audio Transmission:** No raw audio PCM chunks are sent to the backend. The server cannot perform speech analytics, accent adaptation, or server-side STT.
  2. **Browser Dependency:** `webkitSpeechRecognition` is proprietary to Google Chromium. In Firefox, Safari, or constrained environments, voice input completely fails and forces text mode.
  3. **High Turn Latency:** The candidate must finish their sentence, wait for the browser recognition event to finalize, and then trigger an HTTP POST request.

### 3.2 Current AI Voice Output Architecture
- **Implementation:**
  ```javascript
  const res = await api.post('/tts/synthesize', { text: cleanText, voiceModel: voiceModelToUse });
  const audio = new Audio(res.data.data.audioBase64);
  await audio.play();
  ```
- **Limitations:**
  1. **Sequential Latency Stacking:**
     - Turn request (`POST /api/interview/message`): 2,000ms – 3,500ms
     - Complete text synthesis request (`POST /api/tts/synthesize`): 1,200ms – 2,000ms
     - Network download of full base64 audio payload (100KB – 300KB): 300ms – 500ms
     - Audio element buffer decoding and initialization: 100ms
     - **Total Latency: ~3.5s – 6.0s** before the user hears a single word.
  2. **Artificial Karaoke Word-Ticker:**
     `startWordTicker` estimates word timestamps using a crude heuristic (`estDuration = words.length * 280ms`). Words frequently desynchronize from actual spoken syllables.
  3. **No Stream Interruption (Barge-In):**
     If the candidate speaks while the AI is talking, `InterviewRoom.jsx` pauses the local `Audio` element, but the backend is completely unaware of the interruption. Any in-flight LLM generation continues to burn tokens, and the conversation context is not updated with natural interruption markers.

### 3.3 Target Real-Time Voice Model (ChatGPT Voice / Gemini Live Equivalence)
To achieve sub-300ms perceived response latency:
1. **Sentence-Boundary Streaming TTS:**
   Instead of waiting for the full LLM response, synthesize and stream the **first sentence immediately**. The candidate hears the first words in <800ms while sentences 2 and 3 synthesize in parallel.
2. **WebSocket Full-Duplex Connection (`/ws/interview`):**
   Eliminates HTTP handshake overhead. Bidirectional streaming of audio chunks and text tokens.
3. **Web Audio API Sample-Accurate Audio Queue:**
   Queue audio buffers seamlessly using `AudioContext.decodeAudioData` and schedule buffer playback with zero clicks or gaps.
4. **Real-Time Voice Activity Detection (VAD) & Barge-In:**
   Detect candidate speech onset immediately ($\sim 100\text{ms}$), send `INTERRUPT` over WebSocket, and flush the audio queue instantly.

---

## 4. Code Editor Integration Analysis

### 4.1 Monaco Integration
- Implemented via `@monaco-editor/react` (v4.7.0).
- Languages supported: `javascript`, `python`, `cpp`, `java`.
- Editor options:
  - Font: JetBrains Mono / Consolas monospace
  - Auto-layout: enabled
  - Minimap: disabled for screen space optimization
  - Format: Prettier document formatting (`Shift + Alt + F`)
  - Multi-theme support: `vs-dark`, `vs`, `hc-black`

### 4.2 Code Execution Pipeline
- Candidate clicks "Run Code".
- Calls `POST /api/interview/run-code` with `{ language, code, customInput }`.
- Backend runs isolated child process in `temp/voxcode_sandboxes/` with timeout (8000ms) and buffer limit (512KB).
- Results stream back and display in test case / execution tabs.

### 4.3 Missing Collaborative IDE Synchronization (Phase 5)
- **Current Behavior:** The AI interviewer is blind to candidate code until the candidate explicitly clicks "Run Code" or types/sends a chat message.
- **Target Behavior:**
  - Monaco `onChange` event triggers a debounced (500ms – 1000ms) `CODE_SNAPSHOT` message over WebSocket.
  - Backend inspects the code asynchronously without blocking the user.
  - If candidate hesitates or writes a notable pattern, backend emits `AI_CODE_COMMENT`.
  - Frontend displays unobtrusive AI observation bubble or gentle audio prompt: *"I see you're using a two-pointer approach — how will that handle duplicate elements?"*

---

## 5. Planned Additions: Implementation Blueprint

The following modular files must be created in `frontend/src/` per Phase 7 of the upgrade plan:

```
frontend/src/
├── hooks/
│   ├── useInterviewSocket.js     ← WebSocket client & message multiplexer
│   ├── useVAD.js                 ← Client-side Voice Activity Detection
│   └── useAudioQueue.js          ← Gapless sentence audio queue
├── utils/
│   └── audioCapture.js           ← PCM mic capture & downsampling
└── components/interview/
    ├── LiveTranscript.jsx        ← Real-time dual-speaker streaming transcript
    └── AudioVisualizer.jsx       ← Hardware-synced audio waveform/spectrum
```

### 5.1 `frontend/src/hooks/useInterviewSocket.js`
- **Purpose:** Manages the persistent WebSocket connection to `/ws/interview`.
- **Interface:**
  ```javascript
  const {
      isConnected,
      connectionStatus, // 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'FALLBACK_REST'
      sendTextMessage,
      sendAudioChunk,
      sendCodeSnapshot,
      sendInterrupt,
      incomingTokens,     // streaming LLM tokens
      incomingAudioChunk, // { audioBase64, sentenceIndex, isFinal }
      aiCodeComment,      // commentary on code
      runningCRI          // real-time micro-scoring profile
  } = useInterviewSocket({
      sessionId,
      token,
      onSessionReady,
      onAiInterrupted,
      onStageChange
  });
  ```
- **Resilience:**
  - Automatic reconnection with exponential backoff (up to 3 retries).
  - If WebSocket connection fails (e.g., WS blocked by firewall), smoothly switches `connectionStatus` to `'FALLBACK_REST'`, allowing `InterviewRoom.jsx` to transparently fall back to standard `POST /api/interview/message`.

### 5.2 `frontend/src/utils/audioCapture.js`
- **Purpose:** Captures raw microphone audio and downsamples to 16kHz 16-bit Mono Linear PCM for server STT streaming.
- **Key Methods:**
  - `startCapture({ onPcmChunk, onAudioLevel })`:
    - Requests `getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })`.
    - Creates `AudioContext` and an `AudioWorkletNode` (with fallback to `ScriptProcessorNode`).
    - Downsamples native sample rate (44.1kHz/48kHz) to 16,000 Hz.
    - Emits base64-encoded PCM chunks every 100ms.
  - `stopCapture()`: Releases media tracks and closes context.

### 5.3 `frontend/src/hooks/useVAD.js`
- **Purpose:** Real-time client-side Voice Activity Detection to power automatic hands-free conversation and instant barge-in.
- **Logic:**
  - Evaluates short-term energy (RMS) and zero-crossing rate from the microphone stream.
  - Speech thresholding with calibrated hangover (~450ms) to distinguish continuous speech from pauses.
  - **Barge-in hook:** When speech is detected while `isAiSpeaking === true`, immediately invokes `onBargeIn()`, which:
    1. Stops AI audio queue (`useAudioQueue.flush()`).
    2. Sends `{ type: 'INTERRUPT' }` over WebSocket.
    3. Resets visualizer state.

### 5.4 `frontend/src/hooks/useAudioQueue.js`
- **Purpose:** Sample-accurate, gapless playback of incoming sentence-chunked TTS audio.
- **Logic:**
  - Maintains an internal queue of `base64Audio` buffers.
  - Decodes base64 $\rightarrow$ `ArrayBuffer` $\rightarrow$ `AudioContext.decodeAudioData()`.
  - Automatically chains and schedules buffer source nodes (`source.start(nextScheduledTime)`).
  - Emits `onSentenceStart(sentenceIndex)` and `onSentenceEnd(sentenceIndex)` for exact caption highlighting.
  - `flush()` method instantly disconnects and stops any currently playing audio node, clearing the buffer queue in <10ms upon interruption.

### 5.5 `frontend/src/components/interview/LiveTranscript.jsx`
- **Purpose:** Clean, modern transcript UI replacing the simulated karaoke ticker.
- **Features:**
  - Dual-column or chat-flow layout: Candidate vs Interviewer.
  - Live interim stream: As candidate speaks or server STT streams text, words appear with live typing indicator.
  - Streaming AI tokens: As `TEXT_TOKEN` events arrive over WebSocket, text streams smoothly word-by-word.
  - Sentence-level audio sync highlighting.

### 5.6 `frontend/src/components/interview/AudioVisualizer.jsx`
- **Purpose:** Reusable audio visualization component that can connect to both input (candidate mic) and output (AI audio queue) `AudioContext` analyser nodes.
- **Features:**
  - Oscilloscope ribbon and frequency bars.
  - Smooth animation frame loops with spring physics.
  - Low CPU/memory overhead.

### 5.7 Collaborative IDE Synchronization in `InterviewRoom.jsx`
- **Integration without breaking existing functionality:**
  - Inside `InterviewRoom.jsx`, attach a debounced listener to Monaco's `onChange`:
    ```javascript
    const debouncedCodeSync = useMemo(
        () => debounce((code, lang) => {
            if (socketRef.current?.isConnected) {
                socketRef.current.sendCodeSnapshot(code, lang);
            }
        }, 800),
        []
    );
    ```
  - When Monaco code changes, `debouncedCodeSync(value, selectedLanguage)` sends a lightweight snapshot.
  - Incoming `AI_CODE_COMMENT` displays as an unobtrusive notification banner or chat message in the "Discussion" tab.
  - The existing "Run Code" (`handleRunCode`), language switcher, and theme settings remain 100% operational and unchanged.

---

## 6. Regression Prevention & Verification Plan

| Component / Flow | Verification Method | Expected Outcome |
| :--- | :--- | :--- |
| **Vite Production Build** | `npm --prefix frontend run build` | Compiles with 0 errors (`dist/` generated in <4s) |
| **Oxlint Static Check** | `npm --prefix frontend run lint` | 0 errors across all frontend files |
| **Assessment Lobby** | Join `/candidate/assessment/:code` | Hardware tests, resume upload, voice modal operate normally |
| **Interview Room REST Fallback** | Test with WS disabled | All existing REST endpoints (`/start`, `/message`, `/run-code`, `/submit`) function normally |
| **WebSocket Connection** | Connect to `/ws/interview` | Authenticates via JWT, sends `SESSION_READY` |
| **Interruption / Barge-in** | Speak while AI audio plays | Audio stops in <100ms, queue flushes, backend receives `INTERRUPT` |
| **Code Runner** | Click "Run Code" in Monaco | Executes in sandbox and renders output in terminal drawer |
| **Post-Interview Reports** | Navigate to `/candidate/reports/:sessionId` | Full rubric scores, CRI, and breakdowns render without error |

---

## Conclusion

The VoxCode frontend architecture is well-structured, modern, and perfectly suited for the Real Interview Experience Upgrade. By implementing modular hooks (`useInterviewSocket`, `useVAD`, `useAudioQueue`), lightweight streaming components, and a robust REST fallback, the frontend can achieve sub-300ms perceived response latency, natural conversational interruptions, and live collaborative IDE intelligence without disrupting any existing user flows or causing regressions.
