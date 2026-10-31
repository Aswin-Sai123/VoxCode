## 2026-10-30T13:51:05Z
You are Spec Miner 0.
Your working directory is: c:\Users\pratheek\OneDrive\Documents\VoxCode\.agents\teamwork\spec_miner_0
Your parent is: 466d2811-ee76-4144-ac75-8a35cade05a3

MANDATORY FIRST STEP:
Read c:\Users\pratheek\OneDrive\Documents\VoxCode\.agents\teamwork\ORIGINAL_REQUEST.md in full before starting work.
Also read C:\Users\pratheek\.gemini\antigravity\brain\b96f18cf-b1bf-4f4c-ba3a-6b8d0ad2e40a\REAL_INTERVIEW_UPGRADE_PLAN.md for the authoritative specifications.

Objective:
Perform a deep, exhaustive extraction of all specifications, requirements, empirical benchmarking guidelines, data models, protocols, algorithms, and acceptance criteria across the entire upgrade:
1. Requirements & Acceptance Criteria Breakdown: Break down each of R1 through R6 and all acceptance criteria into atomic, testable features and invariants.
2. WebSocket Protocol Specification: Detailed message schema for client -> server (`TEXT_MESSAGE`, `AUDIO_CHUNK`, `CODE_SNAPSHOT`, `INTERRUPT`) and server -> client (`SESSION_READY`, `AUDIO_CHUNK`, `TEXT_TOKEN`, `AI_INTERRUPTED`, `AI_CODE_COMMENT`, errors). Include audio encoding (PCM/MP3/Opus), base64 specs, sample rates, token stream semantics.
3. Neural Voice Engine & TTS Streaming: Edge Neural vs Gemini/Google Cloud Neural priority, sentence boundary chunking regex and algorithm, latency targets (<300ms first audio packet, total <800ms).
4. Persona Engine & Intelligence Scraping: Schemas for `personaCache`, per-company persona structures, `HUMAN_SPEECH_DIRECTIVES` rules, adaptive question difficulty rules, multi-source scraping query matrix across Reddit (r/cscareerquestions, r/leetcode, r/interviewbit, company subreddits), LeetCode, Glassdoor, Blind, and resume-aware question seed algorithm.
5. Empirical Benchmarking (Phase 2 & Phase 8): Guidelines on live ChatGPT/Gemini conversational cadence, conversational scaffolding, follow-up timing, and reaction styles to be codified into prompting and benchmarks.
6. Progressive Evaluation & Real-Time CRI Tracker: Micro-scoring prompt schema, return JSON schema, exponential moving average (alpha=0.4) formula for CRI tracking, multi-pass deep evaluation (5 parallel passes: topic, pattern, coding, comm, behavioral).
7. Collaborative IDE & Execution Sandbox: Live code observation debounce (8s), code observation prompt, adaptive problem difficulty selection, Docker execution with fallback to child_process.
8. Self-Improving Training Loop & Data Architecture: `trainingSignals` schema on `InterviewSession`, `questionBank.model.js`, `calibrationConfig.model.js`, calibration pass logic, question bank effectiveness analysis and retirement/improvement.
9. Simulation & Benchmark Harness: Specification for `simulateInterview.js` (50+ simulated runs, personas: strong_swe, average_swe, junior_swe, assertion rules), latency benchmark script `benchmarkLatency.js`.

Scope Boundaries:
- You are READ-ONLY. DO NOT modify any source code or test files.
- DO NOT implement code changes.

Output Requirements:
- Update your `progress.md` with progress and timestamps.
- Write a detailed specification document to `c:\Users\pratheek\OneDrive\Documents\VoxCode\.agents\teamwork\spec_miner_0\analysis.md`.
- Write your final handoff to `c:\Users\pratheek\OneDrive\Documents\VoxCode\.agents\teamwork\spec_miner_0\handoff.md` with structured tables of features, interfaces, data models, and verification criteria.
- Send a completion message to parent 466d2811-ee76-4144-ac75-8a35cade05a3 via send_message.
