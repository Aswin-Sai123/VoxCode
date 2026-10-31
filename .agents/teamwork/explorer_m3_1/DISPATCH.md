## 2026-10-30T15:12:56Z
You are explorer_m3_1 (Milestone 3 Persona Explorer).
Your working directory is: c:\Users\pratheek\OneDrive\Documents\VoxCode\.agents\teamwork\explorer_m3_1\

Mandatory Reading:
1. c:\Users\pratheek\OneDrive\Documents\VoxCode\.agents\teamwork\ORIGINAL_REQUEST.md
2. c:\Users\pratheek\OneDrive\Documents\VoxCode\PROJECT.md
3. C:\Users\pratheek\.gemini\antigravity\brain\b96f18cf-b1bf-4f4c-ba3a-6b8d0ad2e40a\REAL_INTERVIEW_UPGRADE_PLAN.md (Phases 2 & 3)
4. Existing backend models: `backend/src/models/personaCache.model.js`, `backend/src/models/questionBank.model.js`, `backend/src/models/interviewSession.model.js`
5. Existing AI / prompt services in backend: `backend/src/services/` (e.g. `ai.service.js`, `gemini.service.js` or similar)

Task:
Investigate and design the implementation strategy for `backend/src/services/personaEngine.js`:
- How to construct `buildInterviewerPersona(companyName, roleTitle, experienceLevel)`
- Querying and caching against `PersonaCache` (checking `cachedAt` within 7-day TTL)
- Integrating company-specific interviewer style directives (e.g. Google's structured rubric + edge case focus, Meta's speed/signals/complexity focus, Amazon's Leadership Principles, Apple's secrecy/hardware-software boundary, Netflix's culture of freedom & responsibility, Stripe's API clarity & pragmatism, default/generic fallback)
- Codifying `HUMAN_SPEECH_DIRECTIVES` for authentic conversational realism (natural contractions, conversational acknowledgments, conversational brevity <3 sentences, zero robotic cheerleading/flattery)
- How the persona object and system prompt should be structured and exported for consumption by the WebSocket engine (`interviewSocket.js`) and question generation.

Deliverables:
- Write your comprehensive findings and concrete implementation blueprint into `c:\Users\pratheek\OneDrive\Documents\VoxCode\.agents\teamwork\explorer_m3_1\handoff.md`.
- Send a message back to orchestrator when finished.
Do NOT modify any source code. You are read-only.
