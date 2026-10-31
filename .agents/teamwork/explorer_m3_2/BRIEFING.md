# BRIEFING — 2026-10-30T15:13:00Z

## Mission
Investigate and design the implementation blueprint for `backend/src/services/companyScraper.service.js` covering multi-source scraping/synthesis (Reddit, LeetCode, Glassdoor, Blind), search grounding, question sanitization/deduplication, DB population (`QuestionBank`, `PersonaCache`), and resilient offline/fallback handling.

## 🔒 My Identity
- Archetype: explorer
- Roles: Milestone 3 Scraper Explorer
- Working directory: c:\Users\pratheek\OneDrive\Documents\VoxCode\.agents\teamwork\explorer_m3_2\
- Original parent: 466d2811-ee76-4144-ac75-8a35cade05a3
- Milestone: Milestone 3 (Real Interview Upgrades - Scraping & Persona Expansion)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Do NOT modify any source code
- Files for content delivery, messages for coordination
- Deliver handoff.md following 5-component format

## Current Parent
- Conversation ID: 466d2811-ee76-4144-ac75-8a35cade05a3
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `backend/src/services/companyScraper.service.js` (existing baseline implementation using Google Search Grounding)
  - `backend/src/models/personaCache.model.js` (compound index `{ company: 1, role: 1 }`, 7-day TTL index on `cachedAt`)
  - `backend/src/models/questionBank.model.js` (unique index on `text`, compound indexes, enum constraints for difficulty/status)
  - `backend/src/controllers/candidate.controller.js` (`createMockAssessment` and `getCuratedCompanyProfiles` usage)
  - `backend/src/services/ai.service.js` (resilient Gemini caller with fallback across models)
  - `backend/package.json` (verified native ESM `fetch`, no Axios/Puppeteer needed)
  - `backend/tests/integration.test.js` & `backend/tests/models.test.js` (verified 62 integration tests + 67 model tests pass 100%)
- **Key findings**:
  - Reddit public JSON API (`/r/cscareerquestions+leetcode+interviewbit/search.json`) provides real candidate debriefs without API keys if given a custom User-Agent.
  - Glassdoor and Blind anti-bot protections make direct HTML scraping brittle; Google Search Grounding via Gemini with targeted site queries seamlessly retrieves indexed interview debriefs from LeetCode Discuss, Glassdoor, and Blind without IP bans.
  - QuestionBank schema requires `text` (unique), `difficulty` ('easy'|'medium'|'hard'), `topics` (array of strings), and `usageCount`. Bulk upsert with `$setOnInsert` and `$inc: { usageCount: 1 }` prevents duplicate key errors.
  - PersonaCache stores persona objects with a 7-day TTL index on `cachedAt: Date`.
  - Offline/fallback mode is critical for tests: must short-circuit when `NODE_ENV === 'test'` or no API keys/network, returning deterministic curated company intel.
- **Unexplored areas**: None. All components specified in prompt are investigated and designed.

## Key Decisions Made
- Design a 3-tier scraping cascade: Tier 1 (Direct Reddit JSON API), Tier 2 (Google Search Grounding over LeetCode/Glassdoor/Blind via Gemini), Tier 3 (Offline curated company profiles & procedural company generator).
- Maintain 100% backward compatibility with `getCuratedCompanyProfiles` and `getScrapedCompanyIntelligence` for existing controllers.
- Add `scrapeCompanyInterviewIntel` for `personaEngine.js` and `scrapeSessionIntelligence` for per-session fresh intelligence.
- Implement token-overlap and fuzzy key deduplication for real questions to avoid duplicate prompts.
- Use safe bulk upsert (`bulkWrite` with `updateOne` + `upsert: true`) for `QuestionBank` to ensure idempotency.

## Artifact Index
- DISPATCH.md — Incoming task dispatch record
- BRIEFING.md — Situational awareness and state
- progress.md — Liveness heartbeat and milestone tracking
- handoff.md — Comprehensive findings and blueprint

