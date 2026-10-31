## 2026-10-30T19:16:45Z
You are worker_phase8_gen1. Your working directory is:
c:\Users\pratheek\OneDrive\Documents\VoxCode\.agents\teamwork\worker_phase8_gen1\

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY READING:
- c:\Users\pratheek\OneDrive\Documents\VoxCode\.agents\teamwork\ORIGINAL_REQUEST.md
- c:\Users\pratheek\OneDrive\Documents\VoxCode\PROJECT.md
- C:\Users\pratheek\.gemini\antigravity\brain\b96f18cf-b1bf-4f4c-ba3a-6b8d0ad2e40a\REAL_INTERVIEW_UPGRADE_PLAN.md (Phases 2, 8)

TASK: Complete Phase 8 — Simulation Suite, Latency Benchmarking & Full Battery Verification:
1. Automated Interview Simulation Suite (`backend/scripts/simulateInterview.js`):
   - Implement `runSimulatedInterview({ candidatePersona, company, role, experienceLevel })` and `runSimulationBatch(count = 50)`:
     - Cohorts: 'strong_swe', 'average_swe', 'junior_swe'.
     - Provide authentic technical & behavioral answer sets covering algorithm design, system scalability, database indexing, edge cases, and architectural tradeoffs.
     - Simulates multi-turn dialogue: question generation, micro-scoring via `scoreSingleAnswer`, candidate profile & CRI tracking via `updateCandidateProfile`, and final 5-pass deep evaluation via `generateDeepEvaluation`.
     - Validates persona evaluation criteria:
       - 'strong_swe' achieves overallScore >= 7.0 and HIRE/STRONG_HIRE recommendation.
       - 'junior_swe' achieves overallScore < 6.0 and appropriate coaching recommendations.
       - 'average_swe' scores between 5.0 and 8.0.
     - Runs 50+ iterations across various companies (Google, Amazon, Meta, Microsoft, Stripe) and roles without unhandled crashes.
     - Aggregates and prints comprehensive statistics (cohort mean scores, pass rates, standard deviations, execution stability).
     - Exports `runSimulatedInterview`, `runSimulationBatch`.

2. Voice Latency Benchmark Suite (`backend/scripts/benchmarkLatency.js`):
   - Implement `benchmarkVoiceLatency(options = {})`:
     - Tests representative candidate responses across technical topics.
     - Measures turn generation time, first sentence boundary detection, first audio chunk synthesis latency, and total response time.
     - Tests `streamTTSChunks` sentence streaming to verify that the first audio packet is yielded in <300ms.
     - Generates structured statistical report with min, median (p50), p90, p95, and max latencies.
     - Exits with code 0 upon verifying latency targets.
     - Exports `benchmarkVoiceLatency`.

3. Execute Full Verification Battery:
   Run the following commands and record outputs:
   - `node backend/scripts/simulateInterview.js` (50+ simulated runs)
   - `node backend/scripts/benchmarkLatency.js`
   - `node backend/tests/integration.test.js` (MUST pass 62/62 with zero regressions)
   - `node backend/tests/progressiveEvaluation.test.js`
   - `node backend/tests/trainingLoop.test.js`
   - `node backend/tests/websocketInterview.test.js`
   - `node backend/tests/frontendHooks.test.js`
   - `node backend/tests/models.test.js`
   - `node backend/tests/interviewEvaluation.test.js`
   - Run `npm run build` in `frontend` directory

4. Deliverables:
   - Document all test outcomes, metrics tables, and execution logs in `handoff.md`.
   - Send completion message to parent when finished.
