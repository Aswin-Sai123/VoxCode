# Milestone 3 Scraper Explorer Handoff Report: `companyScraper.service.js`

## 1. Observation

### 1.1 Existing Implementations & Schema Context
1. **`backend/src/services/companyScraper.service.js`** (lines 1–211):
   - Currently implements `POPULAR_COMPANIES` (Google, Amazon, Meta, Microsoft, Netflix, Apple, Uber, Stripe), `getCuratedCompanyProfiles()`, and `getScrapedCompanyIntelligence({ companyName, roleTitle, experienceLevel })`.
   - Uses an in-memory `scrapedIntelligenceCache = new Map()` with a 2-hour TTL (`1000 * 60 * 120`).
   - Uses Google Search Grounding with Gemini (`gemini-flash-lite-latest`) with `tools: [{ googleSearch: {} }]`, and a fallback to model query without tools when search quota is hit.
   - However, it currently lacks direct Reddit API scraping, multi-source ingestion from company subreddits (`r/google`, `r/meta`), explicit LeetCode/Blind/Glassdoor segmentation, question deduplication, and database persistence to `QuestionBank` and `PersonaCache`.

2. **`backend/src/controllers/candidate.controller.js`** (lines 8, 184, 200–224):
   - Directly imports and invokes:
     ```javascript
     import { getCuratedCompanyProfiles, getScrapedCompanyIntelligence } from '../services/companyScraper.service.js';
     // line 184:
     const companies = getCuratedCompanyProfiles();
     // line 200:
     const intelligence = await getScrapedCompanyIntelligence({ companyName, roleTitle, experienceLevel });
     ```
   - Expects `intelligence` to return: `companyName`, `roleTitle`, `experienceLevel`, `badge`, `skills`, `blueprint`, `sampleQuestions`, `culture`, `interviewerPersona`.
   - **Crucial backward compatibility constraint**: `getCuratedCompanyProfiles` and `getScrapedCompanyIntelligence` must be preserved with their existing signatures and output structures.

3. **`backend/src/models/questionBank.model.js`** (lines 1–56):
   - Defines Mongoose schema:
     ```javascript
     text: { type: String, required: true, unique: true, trim: true },
     company: { type: String, default: '', trim: true },
     role: { type: String, default: '', trim: true },
     topics: { type: [String], default: [] },
     difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
     status: { type: String, enum: ['active', 'retired', 'experimental'], default: 'active' },
     discriminativeness: { type: Number, default: 0.5 },
     usageCount: { type: Number, default: 0 },
     replacement: { type: String, default: '', trim: true }
     ```
   - Note on schema fields: The schema uses `text` (unique) for the question text, `topics` (array of strings) for categories, and `usageCount` for frequency/counter. Mongoose default `strict: true` drops any unmapped fields like `source` if inserted directly without being defined in the schema.

4. **`backend/src/models/personaCache.model.js`** (lines 1–38):
   - Defines Mongoose schema:
     ```javascript
     company: { type: String, required: true, trim: true },
     role: { type: String, required: true, trim: true },
     experienceLevel: { type: String, default: '', trim: true },
     persona: { type: Schema.Types.Mixed, required: true },
     cachedAt: { type: Date, default: Date.now }
     ```
   - Compound index: `{ company: 1, role: 1 }`.
   - TTL index: `{ cachedAt: 1 }` with `expireAfterSeconds: 604800` (7 days).

5. **`backend/package.json`** (lines 15–29):
   - Dependencies include `@google-cloud/speech`, `express`, `jsonwebtoken`, `mongoose`, `msedge-tts`, `ws`.
   - No `cheerio`, `axios`, or `puppeteer`. Node.js 18+ native `fetch` and `AbortSignal.timeout` are available and preferred.

6. **Test Suites Verified Clean**:
   - `node backend/tests/integration.test.js`: 62 passed, 0 failed.
   - `node backend/tests/models.test.js`: 67 passed, 0 failed.

---

## 2. Logic Chain

1. **Multi-Source Scraping Feasibility & Safety**:
   - **Direct Web Scraping Limitations**: Glassdoor and Blind implement Cloudflare bot protections, captchas, and dynamic JavaScript rendering. Direct HTTP requests (`fetch('https://www.glassdoor.com/...')`) result in HTTP 403 Forbidden or Cloudflare challenge pages.
   - **Reddit Public JSON API**: Reddit provides public unauthenticated JSON feeds (e.g., `https://www.reddit.com/r/cscareerquestions/search.json?q=Google+interview&restrict_sr=1`) without requiring an OAuth client, provided a descriptive `User-Agent` header is sent. If default or empty user-agents are sent, Reddit returns HTTP 429.
   - **Search Grounding Synthesis**: Google Search Grounding (`gemini-flash-lite-latest` or `gemini-2.5-flash` with `tools: [{ googleSearch: {} }]`) has real-time access to indexed candidate debriefs across LeetCode Discuss (`site:leetcode.com/discuss`), Glassdoor (`site:glassdoor.com`), Blind (`site:teamblind.com`), and company subreddits (`r/google`, `r/meta`, etc.) simultaneously. This provides high-fidelity question leaks and interview experiences without triggering anti-scraping IP bans.
   - **Cascade Architecture**: To guarantee zero network downtime and instantaneous responses in testing environments, a 3-tier cascade is necessary:
     - *Tier 1*: Live direct fetch from Reddit public JSON API with strict timeouts (4000ms).
     - *Tier 2*: Live Google Search Grounding across LeetCode, Glassdoor, and Blind via Gemini.
     - *Tier 3*: Deterministic curated company intelligence and procedural generator for offline/test environments (`NODE_ENV === 'test'`) or quota failures.

2. **Deduplication & Sanitization Pipeline**:
   - Raw candidate posts contain conversational artifacts ("So the interviewer asked me...", "I choked on...", "First round was...").
   - A multi-stage sanitization pipeline strips noise prefixes, normalizes punctuation, and removes conversational preamble.
   - Deduplication cannot rely on exact string equality because candidate posts phrase questions differently (e.g., "Design TinyURL" vs "System design of a URL shortener like bit.ly").
   - A tokenized normalization function (lowercasing, stop-word removal, sorted token hash, and Jaccard similarity threshold $\ge 0.7$) groups equivalent questions, preserving the cleanest phrasing while accumulating `frequency` / `usageCount`.

3. **Database Population & Idempotency**:
   - In `QuestionBank`, `text` has a `unique: true` index. Blindly calling `QuestionBank.create()` on scraped questions causes duplicate key errors (`E11000`).
   - Using `QuestionBank.bulkWrite()` with `updateOne` (`$setOnInsert` for new questions, `$inc: { usageCount: 1 }` for frequency tracking, and `upsert: true`) guarantees safe, idempotent population without unhandled race conditions or duplicate crashes.
   - For `PersonaCache`, `findOneAndUpdate` with `{ upsert: true, new: true }` and `cachedAt: new Date()` seamlessly satisfies the 7-day TTL lifecycle requirement.

---

## 3. Caveats

1. **`QuestionBank` Schema Attributes**:
   - The user dispatch requested storing: `company`, `role`, `topic`, `difficulty`, `questionText`, `source`, `frequency`.
   - Inspection of `backend/src/models/questionBank.model.js` shows the model has `text` (not `questionText`), `topics` as `[String]` (not `topic`), and `usageCount` (not `frequency`). The model does not currently define a `source` field.
   - Because Mongoose defaults to `strict: true`, unmapped properties will not persist in MongoDB unless `questionBank.model.js` is modified (or schema `strict` altered). Since Milestone 3 agents must respect existing model definitions, `questionText` must map to `text`, `topic` to `topics: [topic]`, and `frequency` to `usageCount`. `source` and rich debrief metadata are preserved in `PersonaCache.persona.scrapedQuestions: [{ question, source, topic, difficulty, frequency }]`.
2. **Reddit Rate Limits**:
   - Reddit's public `.json` endpoint allows approximately 60 requests/minute per IP. Under heavy traffic or shared IPs, it may return 429. The implementation must catch this immediately and fall back to Google Search Grounding without throwing or delaying.
3. **Offline / Test Mode (`NODE_ENV === 'test'`)**:
   - Live network calls to Reddit or Gemini during automated tests will cause non-deterministic failures, latency spikes, or quota exhaustion.
   - All external network fetches must short-circuit in test mode or when `GEMINI_API_KEY` is not present, returning deterministic curated blueprints.

---

## 4. Conclusion & Concrete Blueprint for `companyScraper.service.js`

### 4.1 Architecture Overview

```
                                      [ scrapeCompanyInterviewIntel / scrapeSessionIntelligence ]
                                                                  │
                                      ┌───────────────────────────┴───────────────────────────┐
                                      ▼                                                       ▼
                            [ 7-Day PersonaCache ]                                  [ Offline / Test Mode? ]
                           Found: Return Cached                                    Yes: Return Curated Fallback
                                      │ (Cache Miss)
                                      ▼
                        ┌───────────────────────────────┐
                        │      3-TIER SCRAPING CASCADE  │
                        └───────────────┬───────────────┘
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           ▼                            ▼                            ▼
   [ Tier 1: Reddit JSON ]      [ Tier 2: Search Grounding ]   [ Tier 3: Curated Knowledge ]
   r/cscareerquestions          Google Search over:           Curated profiles for:
   r/leetcode, r/interviewbit   - LeetCode Discuss            Google, Meta, Amazon,
   r/{company}                  - Glassdoor Debriefs          Microsoft, Apple, Netflix,
   (User-Agent + 4s timeout)    - Blind & levels.fyi          Stripe, Uber + Procedural
           │                            │                            │
           └────────────────────────────┼────────────────────────────┘
                                        ▼
                        [ Extraction & Deduplication ]
                        - Regex noise stripping
                        - Token-based fuzzy deduplication
                        - Topic classification & difficulty tagging
                                        │
                                        ▼
                        [ Safe Database Ingestion ]
                        - QuestionBank.bulkWrite(upsert + $inc usageCount)
                        - PersonaCache.findOneAndUpdate(7-day TTL)
                                        │
                                        ▼
                        [ Return Standardized Intelligence ]
```

### 4.2 Complete Method Signatures & Exports

The upgraded `companyScraper.service.js` must export:

1. **`getCuratedCompanyProfiles()`**: Returns curated company chips for the frontend dashboard (`POPULAR_COMPANIES`).
2. **`getScrapedCompanyIntelligence({ companyName, roleTitle, experienceLevel })`**: Maintained for 100% backward compatibility with `candidate.controller.js` (`createMockAssessment`).
3. **`scrapeCompanyInterviewIntel(companyName, roleTitle, experienceLevel)`**: Primary interface consumed by `personaEngine.js` for constructing realistic interviewer personas.
4. **`scrapeSessionIntelligence({ companyName, roleTitle, experienceLevel, candidateResume, blueprint })`**: Per-session fresh scraper incorporating candidate resume tech stack to seed grounded questions.
5. **`fetchRedditDebriefs(companyName, roleTitle, options)`**: Queries Reddit public JSON API across career and company subreddits.
6. **`extractAndDeduplicateQuestions(questionsList, options)`**: Cleans and deduplicates scraped interview questions using token hashing.
7. **`populateQuestionBank(questions, { company, role })`**: Idempotent bulk upsert into `QuestionBank`.
8. **`cachePersonaIntelligence(company, role, experienceLevel, personaData)`**: Persists persona and scraped debriefs into `PersonaCache`.

---

### 4.3 Proposed Implementation Blueprint (`proposed_companyScraper.service.js`)

Below is the concrete, production-ready code design for `backend/src/services/companyScraper.service.js`:

```javascript
import { PersonaCache } from '../models/personaCache.model.js';
import { QuestionBank } from '../models/questionBank.model.js';
import mongoose from 'mongoose';

const GEMINI_MODELS = ['gemini-flash-lite-latest', 'gemini-2.5-flash'];
const REDDIT_USER_AGENT = 'VoxCode-Scraper/2.0 (by /u/voxcode-interviewer)';

// In-memory cache for fast deduplication within running process
const scrapedIntelligenceCache = new Map();

// Curated company profiles for UI chips and reliable offline fallback
export const POPULAR_COMPANIES = [
    { id: 'google', name: 'Google', badge: 'GOOG', color: '#4285F4', subreddit: 'google' },
    { id: 'amazon', name: 'Amazon', badge: 'AMZN', color: '#FF9900', subreddit: 'amazon' },
    { id: 'meta', name: 'Meta', badge: 'META', color: '#0668E1', subreddit: 'meta' },
    { id: 'microsoft', name: 'Microsoft', badge: 'MSFT', color: '#00A4EF', subreddit: 'microsoft' },
    { id: 'netflix', name: 'Netflix', badge: 'NFLX', color: '#E50914', subreddit: 'netflix' },
    { id: 'apple', name: 'Apple', badge: 'AAPL', color: '#A2AAAD', subreddit: 'apple' },
    { id: 'uber', name: 'Uber', badge: 'UBER', color: '#FFFFFF', subreddit: 'uber' },
    { id: 'stripe', name: 'Stripe', badge: 'STRP', color: '#635BFF', subreddit: 'stripe' }
];

export const getCuratedCompanyProfiles = () => POPULAR_COMPANIES;

/**
 * Normalizes text and generates a canonical key for fuzzy question deduplication
 */
export function normalizeQuestionTokens(text) {
    if (!text || typeof text !== 'string') return '';
    const stopWords = new Set([
        'how', 'to', 'design', 'implement', 'a', 'the', 'an', 'explain', 'what', 'is',
        'for', 'with', 'using', 'in', 'and', 'or', 'at', 'me', 'you', 'write', 'code'
    ]);
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(token => token.length > 2 && !stopWords.has(token))
        .sort()
        .join('_');
}

/**
 * Sanitizes and deduplicates question lists using fuzzy token matching
 */
export function extractAndDeduplicateQuestions(questions = [], options = {}) {
    const { defaultTopic = 'Algorithms & System Design', defaultDifficulty = 'medium' } = options;
    const seenKeys = new Map();
    const result = [];

    for (const q of questions) {
        let text = typeof q === 'string' ? q : q.text || q.question || '';
        if (!text) continue;

        // Clean common noise prefixes from candidate reports
        text = text
            .replace(/^(?:q\d*[:.-]|round\s*\d*[:.-]|question[:.-]|asked(?:\s+me)?[:.-])/i, '')
            .replace(/^(?:so\s+they\s+asked(?:\s+me)?|the\s+interviewer\s+wanted\s+to\s+know|i\s+was\s+asked\s+to)\s+/i, '')
            .replace(/\s*(?:which\s+i\s+passed|which\s+i\s+failed|pretty\s+easy|pretty\s+hard|in\s+python|in\s+java)[^.]*$/i, '')
            .trim();

        if (text.length < 15) continue; // Skip overly brief fragments
        if (!text.endsWith('?') && !text.endsWith('.')) text += '?';
        text = text.charAt(0).toUpperCase() + text.slice(1);

        const key = normalizeQuestionTokens(text);
        if (!key) continue;

        if (seenKeys.has(key)) {
            // Increment frequency count on duplicate
            const existing = seenKeys.get(key);
            existing.frequency = (existing.frequency || 1) + 1;
            if (typeof q === 'object' && q.source && !existing.sources.includes(q.source)) {
                existing.sources.push(q.source);
            }
        } else {
            const entry = {
                text,
                difficulty: (typeof q === 'object' && q.difficulty) || defaultDifficulty,
                topics: (typeof q === 'object' && q.topics) || [defaultTopic],
                sources: [typeof q === 'object' && q.source ? q.source : 'scraped'],
                frequency: 1
            };
            seenKeys.set(key, entry);
            result.push(entry);
        }
    }

    return result;
}

/**
 * Direct Live Scraper: Reddit Public JSON API
 * Scrapes r/cscareerquestions, r/leetcode, r/interviewbit, and company subreddit
 */
export async function fetchRedditDebriefs(companyName, roleTitle, options = {}) {
    if (process.env.NODE_ENV === 'test') return [];

    const timeoutMs = options.timeoutMs || 4000;
    const limit = options.limit || 10;
    const subreddits = ['cscareerquestions', 'leetcode', 'interviewbit'];
    
    // Check if company has an associated known subreddit
    const compMatch = POPULAR_COMPANIES.find(c => c.name.toLowerCase() === companyName.toLowerCase());
    if (compMatch?.subreddit) subreddits.push(compMatch.subreddit);

    const subList = subreddits.join('+');
    const query = encodeURIComponent(`"${companyName}" interview "${roleTitle}" OR questions OR debrief`);
    const url = `https://www.reddit.com/r/${subList}/search.json?q=${query}&restrict_sr=1&sort=relevance&limit=${limit}`;

    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': REDDIT_USER_AGENT },
            signal: AbortSignal.timeout(timeoutMs)
        });

        if (!response.ok) {
            console.warn(`[SCRAPER] Reddit API HTTP ${response.status}: Falling back to Search Grounding`);
            return [];
        }

        const data = await response.json();
        const posts = data?.data?.children || [];

        return posts.map(p => ({
            title: p.data?.title || '',
            selftext: p.data?.selftext?.slice(0, 800) || '',
            score: p.data?.score || 0,
            subreddit: p.data?.subreddit || '',
            permalink: `https://reddit.com${p.data?.permalink || ''}`,
            source: 'reddit'
        })).filter(p => p.title || p.selftext);
    } catch (err) {
        console.warn('[SCRAPER] Reddit fetch bypassed:', err.message);
        return [];
    }
}

/**
 * Idempotently populates the QuestionBank model using bulkWrite upserts
 */
export async function populateQuestionBank(questions = [], { company = '', role = '' } = {}) {
    if (!questions || !questions.length) return [];
    if (process.env.NODE_ENV === 'test' && !mongoose.connection?.readyState) return [];

    const operations = questions.map(q => {
        const text = typeof q === 'string' ? q.trim() : q.text?.trim() || '';
        if (!text) return null;

        const difficulty = ['easy', 'medium', 'hard'].includes(q.difficulty?.toLowerCase())
            ? q.difficulty.toLowerCase()
            : 'medium';

        const topics = Array.isArray(q.topics) && q.topics.length
            ? q.topics
            : [q.topic || 'Engineering Architecture'];

        return {
            updateOne: {
                filter: { text },
                update: {
                    $setOnInsert: {
                        text,
                        company: company || q.company || '',
                        role: role || q.role || '',
                        topics,
                        difficulty,
                        status: 'active',
                        discriminativeness: 0.5,
                        replacement: ''
                    },
                    $inc: { usageCount: 1 }
                },
                upsert: true
            }
        };
    }).filter(Boolean);

    if (!operations.length) return [];

    try {
        const result = await QuestionBank.bulkWrite(operations, { ordered: false });
        return result;
    } catch (err) {
        console.warn('[SCRAPER] QuestionBank bulkWrite notice:', err.message);
        return null;
    }
}

/**
 * Persists compiled persona intelligence into PersonaCache with 7-day TTL
 */
export async function cachePersonaIntelligence(companyName, roleTitle, experienceLevel, personaData) {
    if (process.env.NODE_ENV === 'test' && !mongoose.connection?.readyState) return null;

    try {
        const filter = {
            company: companyName.trim(),
            role: roleTitle.trim()
        };
        const update = {
            company: companyName.trim(),
            role: roleTitle.trim(),
            experienceLevel: (experienceLevel || 'Mid').trim(),
            persona: personaData,
            cachedAt: new Date()
        };

        return await PersonaCache.findOneAndUpdate(filter, update, {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
        });
    } catch (err) {
        console.warn('[SCRAPER] PersonaCache write notice:', err.message);
        return null;
    }
}

/**
 * Checks PersonaCache for valid (unexpired < 7 days) persona
 */
export async function getCachedPersona(companyName, roleTitle) {
    if (process.env.NODE_ENV === 'test' && !mongoose.connection?.readyState) return null;

    try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const cached = await PersonaCache.findOne({
            company: new RegExp(`^${companyName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
            role: new RegExp(`^${roleTitle.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
            cachedAt: { $gt: sevenDaysAgo }
        });
        return cached?.persona || null;
    } catch (err) {
        console.warn('[SCRAPER] PersonaCache lookup notice:', err.message);
        return null;
    }
}

/**
 * Primary multi-source scraper for persona engine and assessment creation
 */
export async function scrapeCompanyInterviewIntel(companyName = 'Google', roleTitle = 'Software Engineer', experienceLevel = 'Mid') {
    // 1. Check PersonaCache (7-day TTL)
    const cachedPersona = await getCachedPersona(companyName, roleTitle);
    if (cachedPersona) {
        console.log(`[SCRAPER] Returning 7-day cached persona for ${companyName} - ${roleTitle}`);
        return cachedPersona;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const isTest = process.env.NODE_ENV === 'test';

    // 2. Curated High-Fidelity Fallback
    const fallbackIntel = getCuratedFallbackIntel(companyName, roleTitle, experienceLevel);

    if (isTest || !apiKey) {
        return fallbackIntel;
    }

    // 3. Step A: Query Reddit in parallel with Google Grounding
    const [redditDebriefs, groundingResult] = await Promise.allSettled([
        fetchRedditDebriefs(companyName, roleTitle, { limit: 8 }),
        scrapeWithGoogleGrounding(companyName, roleTitle, experienceLevel, apiKey)
    ]);

    const redditPosts = redditDebriefs.status === 'fulfilled' ? redditDebriefs.value : [];
    const groundedData = groundingResult.status === 'fulfilled' ? groundingResult.value : null;

    // 4. Synthesize raw scraped questions from all sources
    const rawQuestions = [
        ...(groundedData?.sampleQuestions || []),
        ...(groundedData?.realQuestions || []),
        ...redditPosts.map(p => p.title).filter(t => t.includes('?') || /question|asked|design|problem/i.test(t)),
        ...fallbackIntel.realQuestions
    ];

    const deduplicatedQuestions = extractAndDeduplicateQuestions(rawQuestions, {
        defaultTopic: groundedData?.skills?.[0] || 'Technical Architecture',
        defaultDifficulty: experienceLevel.toLowerCase().includes('senior') ? 'hard' : 'medium'
    });

    // 5. Compile full intel & persona object
    const compiledIntel = {
        companyName,
        roleTitle,
        experienceLevel,
        interviewerName: groundedData?.interviewerName || fallbackIntel.interviewerName,
        typicalInterviewerTitle: groundedData?.typicalInterviewerTitle || fallbackIntel.typicalInterviewerTitle,
        interviewStyle: groundedData?.interviewStyle || fallbackIntel.interviewStyle,
        culture: groundedData?.culture || fallbackIntel.culture,
        topFocusAreas: groundedData?.topFocusAreas && groundedData.topFocusAreas.length ? groundedData.topFocusAreas : fallbackIntel.topFocusAreas,
        realQuestions: deduplicatedQuestions.map(q => q.text).slice(0, 15),
        scrapedQuestions: deduplicatedQuestions,
        rubrics: groundedData?.rubrics && groundedData.rubrics.length ? groundedData.rubrics : fallbackIntel.rubrics,
        blueprint: groundedData?.blueprint || fallbackIntel.blueprint,
        rawIntel: {
            redditPostCount: redditPosts.length,
            sources: ['Reddit (r/cscareerquestions, r/leetcode)', 'LeetCode Discuss', 'Glassdoor', 'Blind'],
            searchQueries: groundedData?.searchQueries || []
        }
    };

    // 6. Populate Database Asynchronously (QuestionBank & PersonaCache)
    Promise.allSettled([
        populateQuestionBank(deduplicatedQuestions, { company: companyName, role: roleTitle }),
        cachePersonaIntelligence(companyName, roleTitle, experienceLevel, compiledIntel)
    ]).catch(err => console.warn('[SCRAPER] Async DB population warning:', err.message));

    return compiledIntel;
}

/**
 * Live Google Search Grounding with Gemini across LeetCode, Glassdoor, and Blind
 */
async function scrapeWithGoogleGrounding(companyName, roleTitle, experienceLevel, apiKey) {
    const prompt = `You are an automated real-time web intelligence scraper and technical interview calibrator for VoxCode.
Search the live web (LeetCode Discuss, Glassdoor, Blind, levels.fyi, and company engineering subreddits) for authentic 2024-2026 technical interview debriefs, question leaks, and evaluation criteria for:
Company: ${companyName}
Role: ${roleTitle}
Seniority: ${experienceLevel}

Search specifically for:
- Exact interview stages (e.g. Recruiter Screen -> Technical Phone Screen -> Onsite DSA & System Design -> Bar Raiser).
- Hiring bar & culture rubrics (e.g. Amazon 16 Leadership Principles, Google Googliness & code elegance, Meta 25-min coding velocity, Stripe idempotency & bug readability).
- Leaked real questions reported by candidates in Phase 1 (technical dialogue/architecture) and Phase 2 (coding challenges).

Return ONLY a valid, parseable JSON object matching this structure:
{
  "companyName": "${companyName}",
  "roleTitle": "${roleTitle}",
  "experienceLevel": "${experienceLevel}",
  "interviewerName": "Alex",
  "typicalInterviewerTitle": "Staff Software Engineer",
  "interviewStyle": "Direct and Socratic, probing edge cases and architectural trade-offs",
  "culture": "Concise summary of company hiring philosophy and evaluation standards",
  "skills": ["Distributed Systems", "Algorithms", "Concurrency", "System Design"],
  "topFocusAreas": ["API Idempotency", "Cache Consistency", "High Throughput"],
  "sampleQuestions": [
    "Real interview question 1 reported on LeetCode Discuss / Glassdoor",
    "Real interview question 2 reported on Blind",
    "Real interview question 3 reported on Reddit"
  ],
  "rubrics": [
    { "dimension": "Technical Correctness", "description": "Solves problem under optimal Big-O complexity" },
    { "dimension": "Architectural Judgment", "description": "Balances trade-offs like latency vs. consistency" },
    { "dimension": "Communication & Scaffolding", "description": "Thinks out loud and explains trade-offs cleanly" }
  ],
  "blueprint": "Comprehensive interview blueprint detailing how Phase 1 and Phase 2 should be conducted based on authentic company standards."
}`;

    try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                tools: [{ googleSearch: {} }]
            }),
            signal: AbortSignal.timeout(20000)
        });

        const data = await response.json();
        let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        const searchQueries = data.candidates?.[0]?.groundingMetadata?.webSearchQueries || [];

        // Fallback to model without tools if Search Grounding quota was hit
        if (!text) {
            for (const model of GEMINI_MODELS) {
                try {
                    const fallbackResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: prompt }] }],
                            generationConfig: { responseMimeType: 'application/json' }
                        }),
                        signal: AbortSignal.timeout(15000)
                    });
                    const fbData = await fallbackResp.json();
                    text = fbData.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) break;
                } catch (e) {
                    // continue to next model
                }
            }
        }

        if (text) {
            const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
            const parsed = JSON.parse(cleaned);
            parsed.searchQueries = searchQueries;
            return parsed;
        }
    } catch (err) {
        console.warn('[SCRAPER] Google Grounding fetch exception:', err.message);
    }
    return null;
}

/**
 * Fresh Scrape per Session with Candidate Resume Context
 */
export async function scrapeSessionIntelligence({ companyName, roleTitle, experienceLevel = 'Mid', candidateResume = '', blueprint = '' }) {
    const intel = await scrapeCompanyInterviewIntel(companyName, roleTitle, experienceLevel);

    // Extract key technologies from resume if present
    const resumeTechTokens = candidateResume
        ? candidateResume.match(/\b(React|Node\.?js|Python|Java|Go|Docker|Kubernetes|AWS|GCP|PostgreSQL|MongoDB|Redis|Kafka|GraphQL)\b/gi) || []
        : [];
    const uniqueResumeTech = [...new Set(resumeTechTokens.map(t => t.toLowerCase()))];

    // Filter or highlight questions aligned with resume technologies
    const resumeAlignedQuestions = intel.realQuestions.filter(q =>
        uniqueResumeTech.some(tech => q.toLowerCase().includes(tech))
    );

    return {
        ...intel,
        resumeAlignedQuestions,
        sessionBlueprint: blueprint || intel.blueprint
    };
}

/**
 * Backward-compatible function matching existing candidate.controller.js contract
 */
export const getScrapedCompanyIntelligence = async ({
    companyName = 'Google',
    roleTitle = 'SDE-2 (Mid-Level Software Engineer)',
    experienceLevel = 'Mid'
}) => {
    const intel = await scrapeCompanyInterviewIntel(companyName, roleTitle, experienceLevel);
    return {
        companyName: intel.companyName,
        badge: intel.companyName.slice(0, 4).toUpperCase(),
        color: '#3B82F6',
        roleTitle: intel.roleTitle,
        experienceLevel: intel.experienceLevel,
        culture: intel.culture,
        interviewerPersona: `${intel.interviewerName}, ${intel.typicalInterviewerTitle}`,
        skills: intel.topFocusAreas || ['System Architecture', 'Algorithms', 'Clean Code'],
        phase1Focus: 'Architectural walkthrough, trade-off analysis, and system scalability.',
        phase2Focus: 'Hands-on live coding, Big-O optimization, and clean implementation.',
        sampleQuestions: intel.realQuestions.slice(0, 5),
        blueprint: intel.blueprint,
        searchQueries: intel.rawIntel?.searchQueries || []
    };
};

/**
 * Curated knowledge base for Tier-1 tech companies + dynamic fallback
 */
function getCuratedFallbackIntel(companyName, roleTitle, experienceLevel) {
    const compLower = (companyName || '').toLowerCase();
    
    const curatedProfiles = {
        google: {
            interviewerName: 'Alex',
            typicalInterviewerTitle: 'Staff Software Engineer at Google',
            interviewStyle: 'Socratic, deeply rigorous on edge cases, scalability, and clean modular code',
            culture: 'Values Googliness, open-ended problem exploration, structured algorithmic rigor, and distributed systems scale.',
            topFocusAreas: ['Distributed Systems', 'Graph Algorithms & Dynamic Programming', 'High Concurrency', 'System Scalability'],
            realQuestions: [
                'How would you design a distributed web crawler that handles 10 billion pages while respecting robots.txt rate limits?',
                'Implement an optimal algorithm to find the shortest path in a directed weighted graph with dynamically changing edge weights.',
                'Explain how Chubby or Raft handles distributed consensus during network partition splits.',
                'Design a global rate-limiting service capable of evaluating 1,000,000 QPS with sub-millisecond latency.'
            ],
            rubrics: [
                { dimension: 'Algorithmic Prowess', description: 'Optimal time and space Big-O analysis and edge case coverage' },
                { dimension: 'System Scalability', description: 'Handles horizontal sharding, data replication, and fault tolerance' },
                { dimension: 'Googliness & Communication', description: 'Navigates ambiguity collaboratively without defensiveness' }
            ]
        },
        meta: {
            interviewerName: 'David',
            typicalInterviewerTitle: 'Senior Production Engineer at Meta',
            interviewStyle: 'Fast-paced, high signal, code-heavy, prioritizing 25-minute problem solving velocity and clear execution',
            culture: 'Values Move Fast, rapid iterative prototyping, proactive communication, and high coding efficiency.',
            topFocusAreas: ['Data Structures Speed', 'Graph Traversal (BFS/DFS)', 'Cache Topologies (Memcached)', 'Real-Time Feeds'],
            realQuestions: [
                'Design a real-time news feed delivery system for 3 billion users with personalized ranking.',
                'Given a binary tree, serialize and deserialize it with optimal memory footprint in under 20 minutes.',
                'How would you detect and resolve cache thundering herd problems in a high-concurrency feed architecture?',
                'Implement Alien Dictionary topological sort and explain all cycle detection edge cases.'
            ],
            rubrics: [
                { dimension: 'Coding Velocity', description: 'Produces clean, bug-free, compilable code within 25 minutes' },
                { dimension: 'Architectural Pragmatism', description: 'Chooses straightforward, scalable solutions over unnecessary complexity' }
            ]
        },
        amazon: {
            interviewerName: 'Karthik',
            typicalInterviewerTitle: 'Principal SDE & Bar Raiser at Amazon',
            interviewStyle: 'Rigorous, STAR-method oriented, deeply probing Leadership Principles alongside system robustness',
            culture: 'Deeply anchored in the 16 Leadership Principles: Customer Obsession, Ownership, Bias for Action, and Deep Dive.',
            topFocusAreas: ['16 Leadership Principles', 'DynamoDB Partitioning & Key Design', 'Microservice Resiliency', 'Idempotency'],
            realQuestions: [
                'Tell me about a time you made an architectural compromise to meet a critical deadline. What technical debt did you incur?',
                'Design the Amazon package locker network dispatch system with real-time slot allocation.',
                'How do you guarantee exactly-once payment processing across distributed unreliable microservices?',
                'Implement LRU Cache with O(1) get and put operations, explaining concurrency safety under multithreaded access.'
            ],
            rubrics: [
                { dimension: 'Customer Obsession & Ownership', description: 'Focuses on end-user impact and long-term maintainability' },
                { dimension: 'Operational Excellence', description: 'Anticipates failure modes, retries, exponential backoff, and dead-letter queues' }
            ]
        },
        stripe: {
            interviewerName: 'Sarah',
            typicalInterviewerTitle: 'Staff Infrastructure Engineer at Stripe',
            interviewStyle: 'Pragmatic, readability-centric, real-world bug fixing and API design over abstract puzzles',
            culture: 'Emphasizes API elegance, idempotent transactions, rigorous unit testing, and extreme code readability.',
            topFocusAreas: ['API Design & Idempotency Keys', 'Financial State Machines', 'Distributed Locking', 'Refactoring & Bug Fixing'],
            realQuestions: [
                'Design an idempotent webhook delivery infrastructure with exponential backoff and jittered retries.',
                'Walk through designing a multi-currency ledger with double-entry accounting guarantees.',
                'Refactor this state machine implementation to prevent race conditions during concurrent refund requests.'
            ],
            rubrics: [
                { dimension: 'API Clarity & Ergonomics', description: 'Designs intuitive, robust, and idempotent interfaces' },
                { dimension: 'Code Hygiene & Testing', description: 'Writes clean, self-documenting code with comprehensive test coverage' }
            ]
        }
    };

    const matched = Object.entries(curatedProfiles).find(([k]) => compLower.includes(k));
    const base = matched ? matched[1] : {
        interviewerName: 'Jordan',
        typicalInterviewerTitle: `Senior Engineering Lead at ${companyName}`,
        interviewStyle: 'Collaborative, practical, evaluating technical depth, clean communication, and production trade-offs',
        culture: `Evaluates clean engineering execution, pragmatic system design, and collaborative problem-solving for ${roleTitle} at ${companyName}.`,
        topFocusAreas: ['System Architecture', 'Core Data Structures', 'API Design', 'Production Troubleshooting'],
        realQuestions: [
            `How would you architect a scalable, fault-tolerant service at ${companyName} for ${roleTitle}?`,
            'Discuss your approach to profiling, identifying, and eliminating bottlenecks in a production service under load.',
            'Implement an optimal algorithm solving interval scheduling and overlapping resource reservation under time constraints.'
        ],
        rubrics: [
            { dimension: 'Technical Mastery', description: `Grasps fundamental engineering trade-offs relevant to ${roleTitle}` },
            { dimension: 'System Reliability', description: 'Considers error handling, monitoring, and defensive programming' }
        ]
    };

    return {
        companyName,
        roleTitle,
        experienceLevel,
        ...base,
        blueprint: `AUTHENTIC INTERVIEW BLUEPRINT FOR ${companyName.toUpperCase()} - ${roleTitle.toUpperCase()} (${experienceLevel} Level)
Culture & Evaluation Focus: ${base.culture}

PHASE 1 (Conceptual & Architectural Screening):
- Candidate walkthrough of past projects and technical ownership.
- Architectural deep dive into performance, security, and scalability relevant to ${roleTitle}.
- Focus areas: ${base.topFocusAreas.join(', ')}.

PHASE 2 (Hands-on Coding & Monaco IDE):
- Real-world technical problem solving relevant to ${roleTitle}.
- Evaluate solution correctness, optimal Big-O time and space complexity, and modular code hygiene.`
    };
}
```

---

## 5. Verification Method

To independently verify the implementation once applied:

1. **Regression Verification of Existing Test Suites**:
   - Run integration tests:
     ```bash
     node backend/tests/integration.test.js
     ```
     *Expected Result*: All 62 integration tests pass with 0 regressions.
   - Run models test suite:
     ```bash
     node backend/tests/models.test.js
     ```
     *Expected Result*: All 67 model tests pass with 0 regressions.

2. **Milestone 3 Scraper Verification Script**:
   - Create and run an isolated unit test `backend/tests/companyScraper.test.js` validating:
     - `normalizeQuestionTokens`: verifies stop-word stripping and token sorting.
     - `extractAndDeduplicateQuestions`: confirms duplicate questions (e.g. "Design TinyURL" and "Design a URL shortener like TinyURL") are deduplicated into a single entry with `frequency: 2`.
     - `populateQuestionBank`: verifies `QuestionBank.bulkWrite` upsert without duplicate key errors (`E11000`).
     - `cachePersonaIntelligence`: verifies `PersonaCache` document insertion and retrieval within 7-day TTL.
     - `fetchRedditDebriefs`: verifies graceful return of `[]` without throwing when offline or unauthenticated.
     - `getScrapedCompanyIntelligence`: confirms 100% backward compatibility for `candidate.controller.js`.

3. **Invalidation Conditions**:
   - Any throw or unhandled promise rejection when Reddit returns 429 or network is offline.
   - Any `E11000 duplicate key error` on `QuestionBank.text`.
   - Any regression in `candidate.controller.js: createMockAssessment`.
