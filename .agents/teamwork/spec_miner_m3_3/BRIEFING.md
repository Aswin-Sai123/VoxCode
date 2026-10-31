# BRIEFING — 2026-10-30T15:22:30Z

## Mission
Investigate and document the exact algorithmic specifications for resume-aware question seeding, adaptive next-step interview follow-up logic, conversational speech cadence patterns, and technical-token-safe sentence chunking regex for TTS.

## 🔒 My Identity
- Archetype: Specification Miner
- Roles: Milestone 3 Cadence Miner
- Working directory: c:\Users\pratheek\OneDrive\Documents\VoxCode\.agents\teamwork\spec_miner_m3_3\
- Original parent: 466d2811-ee76-4144-ac75-8a35cade05a3
- Milestone: Milestone 3 (Adaptive Interview Flow & Conversational Cadence)

## 🔒 Key Constraints
- Read-only: Do NOT modify any source code outside `.agents/teamwork/spec_miner_m3_3/`.
- Thoroughly probe all assigned feature groups and edge cases.
- Follow 5-component handoff format with Features Discovered and Edge Cases tables.
- Send message back to parent agent upon completion.

## Current Parent
- Conversation ID: 466d2811-ee76-4144-ac75-8a35cade05a3
- Updated: 2026-10-30T15:22:30Z

## Task Summary
- **What to build/document**:
  1. `buildResumeAwareQuestionSeeds(candidateProfile, companyPersona, roleTitle)`
  2. `generateAdaptiveNextStep(candidateAnswer, lastQuestion, currentCRI, signal)`
  3. Empirical Cadence & Human Speech Patterns
  4. Regex patch for `tts.service.js` (technical token sentence splitting)
- **Success criteria**: Comprehensive, verified, actionable specification with pseudo-code, prompt schemas, mathematical scoring / routing tables, and test cases.
- **Interface contracts**: PROJECT.md, REAL_INTERVIEW_UPGRADE_PLAN.md
- **Code layout**: Backend services in `backend/src/services/`

## Key Decisions Made
- Confirmed root cause of sentence splitting bug in `tts.service.js:61`: character class `[^.!?]+` terminates on internal dots in tokens (`Node.js`, `0.5s`, `v1.2`), discarding leading clauses.
- Formulated & verified replacement regex: `/(?:[^.!?]|\.(?!\s|$)|(?<=\b(?:e\.g|i\.e|etc|vs|dr|mr|ms))\.)+(?:[.!?]+['"’”\)\]\}]*(?:\s+|$)|$)/gi`.
- Designed 4-tier structured seed generation for `buildResumeAwareQuestionSeeds` connecting candidate projects, company stack, scale comparisons, and scraped question banks.
- Formulated 4-quadrant routing matrix and multi-tier scaffolding state machine (`scaffoldLevel` 0-3) for `generateAdaptiveNextStep`.
- Benchmarked empirical human speech parameters (1-3 sentences max, <45 words, 0-4s silence tolerance, verbal acknowledgment tokens).

## Artifact Index
- `DISPATCH.md` — Orchestrator instructions and message log
- `BRIEFING.md` — Persistent context & state
- `progress.md` — Liveness heartbeat & task progress
- `test_regex.js` — Empirical test harness verifying sentence chunking regex against 20+ edge cases
- `test_resume_seeds.js` — Prototype verifying resume-anchored question seed generator
- `refined_extractor.js` — Refined resume project & skill tokenizer
- `run_refined_test.js` — End-to-end runner for resume question seeds
- `test_adaptive_next_step.js` — Prototype verifying adaptive follow-up prompt builder and routing matrix
- `handoff.md` — Complete 5-component specification mining deliverable
