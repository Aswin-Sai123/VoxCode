# Original User Request

## Initial Request — 2026-10-30T13:47:18Z

Implement the complete VoxCode Real Interview Experience Upgrade across all 8 phases as detailed in REAL_INTERVIEW_UPGRADE_PLAN.md, delivering a production-ready real-time technical interview platform while preserving all existing core logic.

Working directory: c:\Users\pratheek\OneDrive\Documents\VoxCode
Integrity mode: development

Reference: C:\Users\pratheek\.gemini\antigravity\brain\b96f18cf-b1bf-4f4c-ba3a-6b8d0ad2e40a\REAL_INTERVIEW_UPGRADE_PLAN.md

## Requirements

### R1. Real-Time Voice Conversation Engine (Phase 1)
Implement a persistent WebSocket session at `/ws/interview` supporting bidirectional streaming audio chunks and text messages, sentence-boundary chunking TTS with sample-accurate Web Audio playback, browser and server STT integration, and interruption handling. High-fidelity neural TTS models (Edge Neural and Gemini/Google Cloud Neural) must be prioritized for audio streaming; browser TTS is deprioritized and avoided in favor of neural streaming voices.

### R2. Hyper-Realistic AI Interviewer Persona & Intelligence Scraping (Phases 2 & 3)
Implement per-company persona generation with realistic interviewer behavioral directives, adaptive question generation, and fresh per-session multi-source scraping and search grounding across Reddit (r/cscareerquestions, r/leetcode, r/interviewbit, and company-specific subreddits), LeetCode, Glassdoor, and Blind for authentic candidate interview debriefs and question leaks, combined with resume-aware question seeds.

### R3. Empirical Benchmarking for Realism & Dialogue Design (Phase 2 & Phase 8)
Perform direct empirical benchmarking against ChatGPT and Gemini interviewer prompting (testing live browser/API interview sessions across target roles and companies) to extract conversational cadence, tone, follow-up timing, conversational scaffolding, and human-like reactions. Inject these empirical response patterns directly into prompt engineering, dialogue turn management, and simulation benchmarks to maximize realism.

### R4. Real-Time Progressive Evaluation & Coding Round Upgrade (Phases 4 & 5)
Implement turn-by-turn micro-scoring, running Candidate Readiness Index (CRI), multi-pass deep final evaluation, and a live collaborative IDE streaming code snapshots with natural AI commentary and adaptive problem difficulty. Support Docker execution with fallback to local isolated child process execution if Docker is unavailable.

### R5. Self-Improving Training Loop & Data Architecture (Phases 6 & 7)
Implement session training signal capture, nightly evaluation calibration job, question bank learning loop, Mongoose models (`personaCache`, `questionBank`, `calibrationConfig`), and frontend hooks and components (`useInterviewSocket`, `useVAD`, `useAudioQueue`, `LiveTranscript`).

### R6. Verification and Simulation Test Harness (Phase 8)
Implement automated interview simulation suites (10+ runs), latency benchmarking tests (<300ms first audio packet target), and evaluation accuracy test suites.

## Verification Resources
- Existing integration test suite: `node backend/tests/integration.test.js` (62 passing integration tests)
- Existing unit test suite: `backend/tests/interviewEvaluation.test.js`
- Detailed architecture and upgrade plan: `C:\Users\pratheek\.gemini\antigravity\brain\b96f18cf-b1bf-4f4c-ba3a-6b8d0ad2e40a\REAL_INTERVIEW_UPGRADE_PLAN.md`

## Acceptance Criteria

### Regression Prevention
- [ ] All 62 existing integration tests (`node backend/tests/integration.test.js`) and existing unit tests (`backend/tests/interviewEvaluation.test.js`) pass with zero regressions.

### Real-Time Voice and Engine Features
- [ ] WebSocket endpoint `/ws/interview` connects, authenticates sessions via JWT, and handles message types `TEXT_MESSAGE`, `AUDIO_CHUNK`, `CODE_SNAPSHOT`, and `INTERRUPT`.
- [ ] Sentence-streaming TTS breaks synthesized audio into sentence-level chunks and streams them back over WebSocket using high-fidelity neural voices (Edge Neural / Gemini Neural), avoiding browser TTS fallback.
- [ ] Frontend audio queue correctly plays queued audio chunks and clears queue immediately on candidate interruption.

### Persona, Intelligence Scraping & Empirical Cadence
- [ ] Company personas reflect company-specific interview style directives and adapt follow-up questions dynamically based on candidate responses.
- [ ] Multi-source intelligence layer scrapes and grounds interview context from Reddit (career and technical subreddits), LeetCode, Glassdoor, and Blind, seeding resume-conditioned questions.
- [ ] Conversational cadence, follow-up timing, and scaffolding align with empirical benchmark findings from live ChatGPT/Gemini interviewer testing.

### Progressive Evaluation & Collaborative IDE
- [ ] Turn-by-turn micro-scoring updates running Candidate Readiness Index (CRI) throughout the session.
- [ ] Monaco editor synchronizes code snapshots to the backend and handles AI commentary without blocking user editing.
- [ ] Code runner executes code in Docker or falls back cleanly to local isolated child process execution.

### Self-Improving Loop & Models
- [ ] Mongoose models for `personaCache`, `questionBank`, and `calibrationConfig` are registered and persist session data.
- [ ] Calibration job and transcript signal capture execute and update question metrics.

### Automated Simulation & Benchmark Suite
- [ ] Automated interview simulation harness executes 10+ simulated interview iterations without unhandled crashes.
- [ ] Latency benchmark suite runs and verifies first audio packet latency under 300ms.


## Follow-up — 2026-10-30T15:45:41Z

Directive from user: "no need to test every milestone we can test at last". 

Please streamline execution by skipping the heavy intermediate adversarial gate reviews between each milestone. Proceed directly with implementing Milestones 4, 5, 6, and 7 (Progressive Evaluation & Live Coding, Self-Improving Loop, Frontend hooks/components), and execute the full test battery, latency benchmarks, and 50+ simulation runs together at the final Phase 8 testing stage.


## Follow-up — 2026-10-30T18:13:10Z

USER DIRECTIVE:
Resume execution immediately across Milestone 4 (Progressive Evaluation & Live Collaborative Coding), Milestone 5 (Self-Improving Training Loop & Data Architecture), and Milestone 6 (Frontend Hooks & UI Components).
IMPORTANT TOKEN / LIMIT PRESERVATION RULE:
Do NOT spawn intermediate Reviewers, Challengers, or Forensic Auditors per milestone. Skip all intermediate panel reviews and testing.
Implement the features directly and cleanly first. The comprehensive testing, simulation suite, and challenge battery MUST be executed exclusively at the very end (Milestone 8) to preserve tokens and rate limits.
