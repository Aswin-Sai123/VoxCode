## 2026-10-30T15:23:43Z
You are worker_m3 (Milestone 3 Implementation Worker).
Your working directory is: c:\Users\pratheek\OneDrive\Documents\VoxCode\.agents\teamwork\worker_m3\

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Mandatory Reading:
1. c:\Users\pratheek\OneDrive\Documents\VoxCode\.agents\teamwork\ORIGINAL_REQUEST.md
2. c:\Users\pratheek\OneDrive\Documents\VoxCode\PROJECT.md
3. Explorer M3-1 Handoff: c:\Users\pratheek\OneDrive\Documents\VoxCode\.agents\teamwork\explorer_m3_1\handoff.md
4. Explorer M3-2 Handoff: c:\Users\pratheek\OneDrive\Documents\VoxCode\.agents\teamwork\explorer_m3_2\handoff.md
5. Spec Miner M3-3 Handoff: c:\Users\pratheek\OneDrive\Documents\VoxCode\.agents\teamwork\spec_miner_m3_3\handoff.md

Your exclusive write ownership:
- `backend/src/services/personaEngine.js` (NEW)
- `backend/src/services/companyScraper.service.js` (UPGRADE)
- `backend/src/services/tts.service.js` (REGEX PATCH)
- `backend/tests/personaEngine.test.js` (NEW TEST SUITE)
DO NOT touch `backend/src/app.js` under any circumstances (it preserves integration test isolation).

Implementation Tasks:

1. `backend/src/services/companyScraper.service.js`:
   Implement the complete production-ready blueprint from `explorer_m3_2/handoff.md §4.3`:
   - 3-tier scraping cascade:
     * Tier 1: Direct Reddit public JSON API (`fetchRedditDebriefs`) targeting `r/cscareerquestions`, `r/leetcode`, `r/interviewbit`, and company-specific subreddits (`r/google`, `r/meta`, etc.) with 4s timeout and descriptive User-Agent.
     * Tier 2: Live Google Search Grounding with Gemini (`scrapeWithGoogleGrounding`) across LeetCode Discuss, Glassdoor, and Blind.
     * Tier 3: Curated tech company profiles and dynamic fallback.
   - Tokenized question deduplication and noise sanitization (`normalizeQuestionTokens`, `extractAndDeduplicateQuestions`).
   - Database operations:
     * `populateQuestionBank`: uses `QuestionBank.bulkWrite` with `updateOne` (`$setOnInsert` and `$inc: { usageCount: 1 }`, `upsert: true`) - prevents `E11000 duplicate key error`.
     * `cachePersonaIntelligence`: uses `PersonaCache.findOneAndUpdate` with `{ upsert: true, new: true }` and `cachedAt: new Date()`.
     * `getCachedPersona`: checks `PersonaCache` with 7-day TTL filter (`cachedAt: { $gt: sevenDaysAgo }`).
   - Preserve 100% backward compatibility for `candidate.controller.js`: `getCuratedCompanyProfiles()`, `getScrapedCompanyIntelligence({ companyName, roleTitle, experienceLevel })`.
   - Export all functions: `scrapeCompanyInterviewIntel`, `scrapeSessionIntelligence`, `fetchRedditDebriefs`, `extractAndDeduplicateQuestions`, `populateQuestionBank`, `cachePersonaIntelligence`, `getCachedPersona`, `getCuratedCompanyProfiles`, `getScrapedCompanyIntelligence`.

2. `backend/src/services/personaEngine.js`:
   Implement the complete production-ready blueprint from `explorer_m3_1/handoff.md §4.1`:
   - `buildInterviewerPersona(companyName, roleTitle, experienceLevel)`:
     * Checks `PersonaCache` (7-day TTL check) first.
     * Maps company to `COMPANY_DIRECTIVES` (Google, Meta, Amazon, Apple, Netflix, Stripe, Generic) or enlists web scraper for uncurated companies.
     * Codifies `HUMAN_SPEECH_DIRECTIVES` (natural contractions, conversational acknowledgments, brevity < 3 sentences / < 45 words, zero robotic cheerleading, no markdown bullets in speech).
     * Embeds structured rubrics, focus areas, and authentic question bank.
     * Assembles `systemPrompt` via `buildPersonaPrompt`.
     * Persists to `PersonaCache` with 7-day TTL.
     * Gracefully handles MongoDB disconnected state (for tests).
   - `buildResumeAwareQuestionSeeds(candidateResume, companyIntel)`:
     * Extracts projects and technologies and builds candidate-tailored anchor questions.
   - `getAdaptiveFollowupDirective(performanceSignal)`:
     * Maps signals (`strong`, `adequate`, `weak`, `no_answer`) to adaptive follow-up actions and cognitive scaffolding guidance.
   - Dual named and default exports.

3. `backend/src/services/tts.service.js`:
   Apply the sentence-splitting regex patch verified by `spec_miner_m3_3/handoff.md`:
   Replace:
   `/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g`
   With:
   `/(?:[^.!?]|\.(?!\s|$)|(?<=\b(?:e\.g|i\.e|etc|vs|dr|mr|ms))\.)+(?:[.!?]+['"’”\)\]\}]*(?:\s+|$)|$)/gi`
   This prevents splitting on technical tokens like `Node.js`, `Vue.js`, `0.5s`, `v1.2`, and abbreviations like `e.g.`.

4. `backend/tests/personaEngine.test.js`:
   Create and execute a comprehensive test suite testing:
   - `buildInterviewerPersona` for Google, Meta, Amazon, Apple, Netflix, Stripe, and Generic.
   - 7-day TTL cache check and refresh logic.
   - `HUMAN_SPEECH_DIRECTIVES` contents and constraints.
   - `buildResumeAwareQuestionSeeds` project and tech extraction.
   - `getAdaptiveFollowupDirective` signal routing.
   - `extractAndDeduplicateQuestions` and `normalizeQuestionTokens` deduplication logic.
   - `tts.service.js` sentence chunking with `Node.js`, `0.5s`, `e.g.`, URLs.
   - Backward compatibility of `getCuratedCompanyProfiles` and `getScrapedCompanyIntelligence`.

5. Testing & Verification:
   Execute all test suites:
   - `node backend/tests/personaEngine.test.js`
   - `node backend/tests/websocketInterview.test.js`
   - `node backend/tests/models.test.js`
   - `node backend/tests/integration.test.js` (ALL 62 TESTS MUST PASS)


## 2026-10-30T15:34:09Z
**Context**: Milestone 3 Implementation
**Content**: Safety timer fired. Checking on the progress of test execution and handoff report creation for Milestone 3.
**Action**: Please report current status.
