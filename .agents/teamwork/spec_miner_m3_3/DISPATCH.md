## 2026-10-30T15:12:56Z

You are spec_miner_m3_3 (Milestone 3 Cadence Miner).
Your working directory is: c:\Users\pratheek\OneDrive\Documents\VoxCode\.agents\teamwork\spec_miner_m3_3\

Mandatory Reading:
1. c:\Users\pratheek\OneDrive\Documents\VoxCode\.agents\teamwork\ORIGINAL_REQUEST.md
2. c:\Users\pratheek\OneDrive\Documents\VoxCode\PROJECT.md
3. C:\Users\pratheek\.gemini\antigravity\brain\b96f18cf-b1bf-4f4c-ba3a-6b8d0ad2e40a\REAL_INTERVIEW_UPGRADE_PLAN.md (Phases 2 & 3)
4. Existing `backend/src/services/tts.service.js` (review the sentence splitting regex issue for technical tokens like `Node.js`)

Task:
Investigate and document the exact algorithmic specifications for:
1. `buildResumeAwareQuestionSeeds(candidateProfile, companyPersona, roleTitle)`:
   - How candidate projects, skills, past companies, and experience level are parsed and matched against company tech stack and focus areas to generate organic, resume-anchored opening questions.
2. `generateAdaptiveNextStep(candidateAnswer, lastQuestion, currentCRI, signal)`:
   - Exact logic and prompt templates for adapting question difficulty and follow-up style based on candidate signal (`strong`, `adequate`, `weak`, `no_answer`).
   - Scaffolding behavior: providing incremental hints without answering, probing trade-offs on strong answers, graceful pivoting on no_answer.
3. Empirical Cadence & Human Speech Patterns:
   - Exact benchmarked patterns from ChatGPT and Gemini interviewer prompting (conversational pacing, back-and-forth rhythm, silence handling, acknowledgment prefixes).
4. Regex patch for `tts.service.js`:
   - Verify the exact regex to prevent splitting on technical tokens like `Node.js`, `Vue.js`, `0.5s`, `v1.2` while cleanly chunking at sentence boundaries.

Deliverables:
- Write your comprehensive findings and specifications into `c:\Users\pratheek\OneDrive\Documents\VoxCode\.agents\teamwork\spec_miner_m3_3\handoff.md`.
- Send a message back to orchestrator when finished.
Do NOT modify any source code. You are read-only.


## 2026-10-30T15:21:35Z
**Context**: Milestone 3 Exploration
**Content**: Checking on the status of your specification mining deliverable for `buildResumeAwareQuestionSeeds`, `generateAdaptiveNextStep`, empirical cadence, and the TTS regex patch.
**Action**: Please report current status and progress.
