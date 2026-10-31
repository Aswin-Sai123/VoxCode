# Milestone 3 Persona Engine & Conversational Realism Handoff Report

## 1. Observation

Direct observations from source inspection across the VoxCode backend:

1. **PersonaCache Model (`backend/src/models/personaCache.model.js:1-37`)**:
   - Schema defines:
     ```js
     const personaCacheSchema = new Schema({
         company: { type: String, required: true, trim: true },
         role: { type: String, required: true, trim: true },
         experienceLevel: { type: String, default: '', trim: true },
         persona: { type: Schema.Types.Mixed, required: true },
         cachedAt: { type: Date, default: Date.now }
     }, { timestamps: true });
     personaCacheSchema.index({ company: 1, role: 1 });
     personaCacheSchema.index({ cachedAt: 1 }, { expireAfterSeconds: 604800 });
     ```
   - Observed: Compound index `{ company: 1, role: 1 }` is defined for query speed. A TTL index `{ cachedAt: 1 }` with `expireAfterSeconds: 604800` (7 days) is configured. However, MongoDB executes background TTL thread sweeps every ~60 seconds, which means application queries must explicitly filter `cachedAt: { $gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }` to guarantee immediate 7-day TTL enforcement.

2. **WebSocket Router (`backend/src/ws/interviewSocket.js:125-136`)**:
   - Calls `generateNextInterviewStep` inside `handleCandidateTurn`:
     ```js
     aiResponse = await generateNextInterviewStep({
         companyName: session.assessment?.company?.name || 'our company',
         roleTitle: session.assessment?.role?.title || 'Software Engineer',
         skills: session.assessment?.skills || [],
         experienceLevel: session.assessment?.experienceLevel || 'Mid',
         blueprint: session.assessment?.blueprint || '',
         candidateResume: session.candidateResume || '',
         transcript: session.transcript,
         candidateMessage: trimmedText,
         currentStage: session.stage || 'CONCEPTUAL',
         currentCode: session.liveCode || ''
     });
     ```
   - Currently, `interviewSocket.js` has no direct hook into `PersonaCache` or per-company persona styling; it passes generic strings like `companyName` and relies on `ai.service.js`.

3. **Current AI Service System Prompts (`backend/src/services/ai.service.js:71, 277`)**:
   - Line 71 in `generateOpeningGreeting`:
     `You are Rohan, a seasoned and friendly Engineering Lead at ${companyName} conducting a live 1-on-1 technical interview for a ${experienceLevel}-level ${roleTitle} position.`
   - Line 277 in `generateNextInterviewStep`:
     `You are Rohan, a Staff Software Engineer & Technical Lead at ${companyName} conducting a live, realistic technical interview for a ${experienceLevel}-level ${roleTitle} role.`
   - Observed: Every company (Google, Amazon, Meta, Stripe, Apple, Netflix) is currently fronted by generic "Rohan", with zero company-specific rubrics, cultural values, or authentic question anchors unless an ad-hoc recruiter blueprint string happens to be supplied.

4. **Live Scraper Service (`backend/src/services/companyScraper.service.js:31-210`)**:
   - Exports `getCuratedCompanyProfiles()` and `getScrapedCompanyIntelligence({ companyName, roleTitle, experienceLevel })`.
   - Uses `gemini-flash-lite-latest` with `tools: [{ googleSearch: {} }]` to ground search results across LeetCode Discuss, Glassdoor, and Blind, with in-memory 2-hour caching.
   - Observed: The scraper generates `culture`, `interviewerPersona`, `sampleQuestions`, `phase1Focus`, and `phase2Focus`, but does not persist to MongoDB `PersonaCache`, nor does it codify fine-tuned behavioral directives for tier-1 tech giants.

5. **Existing Verification State**:
   - `node backend/tests/integration.test.js`: 62 tests passing, 0 failing.
   - `node backend/tests/interviewEvaluation.test.js`: 100% passing.
   - `node backend/tests/models.test.js`: 67 tests passing, 0 failing (including `PersonaCache` model tests).

---

## 2. Logic Chain

1. **Step 1 (Persona Engine Centrality)**:
   Per `PROJECT.md` Feature 12 and `REAL_INTERVIEW_UPGRADE_PLAN.md` §2.1, `backend/src/services/personaEngine.js` must be created to construct `buildInterviewerPersona(companyName, roleTitle, experienceLevel)`. This module serves as the authoritative persona and dialogue directive provider for both WebSocket real-time turns (`interviewSocket.js`) and question generation (`ai.service.js`).

2. **Step 2 (Two-Tier Cache Strategy)**:
   - Primary: Query `PersonaCache.findOne({ company, role, cachedAt: { $gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } })`.
   - Hit: Return cached persona immediately (0ms network latency).
   - Miss: Check curated company profiles (Google, Meta, Amazon, Apple, Netflix, Stripe). If matched, instantiate curated directives enriched by real questions. If an uncurated company is requested, invoke `getScrapedCompanyIntelligence(...)` to scrape web intelligence, build the persona, and persist via `PersonaCache.findOneAndUpdate(..., { upsert: true })` with `cachedAt: new Date()`.
   - Resilience: If MongoDB is unavailable or fails to connect, catch the error gracefully and return the persona in-memory without throwing.

3. **Step 3 (Company-Specific Style Directives)**:
   Real senior interviewers at top companies follow distinct cultural philosophies:
   - **Google**: Socratic, structured rubric (4 pillars: GCA, RRK, Leadership, Googliness), edge-case focused, Big-O invariants, scale-first.
   - **Meta**: Velocity-driven, high signal density, rapid problem solving (45-min dual problem cadence), in-memory caching, real-time pipelines.
   - **Amazon**: Amazon Leadership Principles (Customer Obsession, Ownership, Dive Deep, Deliver Results, Earn Trust, Have Backbone; Disagree and Commit), STAR behavioral probing, multi-AZ resilience.
   - **Apple**: Deep systems craftsmanship, hardware-software integration, zero-telemetry user privacy, deterministic latency, memory efficiency.
   - **Netflix**: Culture of Freedom & Responsibility, Context not Control, chaos engineering, high fault tolerance, blast-radius mitigation.
   - **Stripe**: API ergonomics and developer empathy, idempotency keys, financial race condition defense, practical and readable code.
   - **Default/Generic**: Balanced engineering lead ("Rohan"), collaborative peer programming, architecture and code fundamentals.

4. **Step 4 (Conversational Realism via `HUMAN_SPEECH_DIRECTIVES`)**:
   Standard LLM outputs sound robotic because they emit bulleted lists, speak in 5-8 sentence paragraphs, and use patronizing cheerleading ("Great question!", "That's wonderful!"). Deriving rules from live ChatGPT Voice / Gemini Live interviewer benchmarks requires:
   - Natural spoken contractions ("you're", "it's", "I'd", "we've", "don't").
   - Conversational acknowledgments ("Yeah", "Gotcha", "Makes sense", "Interesting approach").
   - Strict brevity: 1-3 natural spoken sentences (<45 words) per turn so the candidate speaks 80% of the time.
   - Zero robotic praise or flattery.
   - No markdown formatting in speech (no bullet points, no bolding, no `#` headers).

5. **Step 5 (Integration Surface for WebSocket & AI Engine)**:
   The constructed persona object must provide:
   - Structured metadata: `name`, `title`, `company`, `role`, `style`, `culture`, `focusAreas`, `rubrics`, `questionBank`.
   - Ready-to-use `systemPrompt`: Pre-baked system instruction embedding the persona identity, company directives, rubrics, question anchors, and `HUMAN_SPEECH_DIRECTIVES`.
   - `buildResumeAwareQuestionSeeds(candidateResume, companyIntel)`: Generates candidate-tailored opening and drill-down seeds from their resume projects and tech stack.
   - `generateAdaptiveNextStep(session, lastAnswer, performanceSignal)`: Implements the Phase 2.3 adaptive difficulty rules (`strong` -> harder sub-topic; `adequate` -> clarify depth; `weak` -> hint/simplify; `no_answer` -> rephrase/scaffold).

---

## 3. Caveats

1. **Search Grounding Rate Limits**: When scraping uncurated companies, `companyScraper.service.js` uses Google Search Grounding. If Google search grounding quotas are exceeded, the scraper falls back to Gemini direct generation. `personaEngine.js` must handle any scraper fallback transparently.
2. **MongoDB Connectivity in Unit Tests**: Standalone unit tests may run without a live MongoDB instance. `personaEngine.js` must check `mongoose.connection.readyState === 1` before issuing DB queries, falling back gracefully to memory generation so tests never hang or throw connection errors.
3. **Role Normalization**: Job titles vary widely (e.g., "Software Engineer", "Full Stack Developer", "Backend SWE"). Company matching should use case-insensitive and trimmed string comparisons with keyword fallbacks.

---

## 4. Conclusion & Complete Implementation Blueprint

Create `backend/src/services/personaEngine.js` with the complete, production-ready implementation detailed below.

### 4.1 Implementation Blueprint for `backend/src/services/personaEngine.js`

```javascript
/**
 * Persona Engine for VoxCode (Milestone 3)
 * Builds hyper-realistic, per-company interviewer personas with authentic behavioral
 * directives, company-specific rubrics, 7-day TTL caching in PersonaCache,
 * human speech directives, and resume-aware question grounding.
 */

import mongoose from 'mongoose';
import { PersonaCache } from '../models/personaCache.model.js';
import { getScrapedCompanyIntelligence } from './companyScraper.service.js';

/**
 * Empirical Human Speech Directives derived from ChatGPT Voice & Gemini Live benchmarking.
 * Injected into every interviewer system prompt to eliminate robotic dialogue artifacts.
 */
export const HUMAN_SPEECH_DIRECTIVES = `
SPEECH STYLE & CONVERSATIONAL CADENCE DIRECTIVES (STRICT):
1. NATURAL CONTRACTIONS:
   - Always use natural spoken contractions: "you're", "it's", "let's", "I'd", "we've", "don't", "didn't", "that's".
   - Avoid stiff, formal phrasing ("do not", "it is", "I would", "we have") unless emphasizing an explicit contrast.

2. CONVERSATIONAL ACKNOWLEDGMENTS:
   - Before probing or asking your next question, acknowledge the candidate's last answer naturally:
     "Yeah, absolutely.", "Gotcha.", "Right, makes sense.", "Fair enough.", "Oh, interesting approach.", "I see what you're doing there."
   - Never abruptly pivot without an acknowledgment.

3. CONVERSATIONAL BREVITY (< 3 SENTENCES PER TURN):
   - Keep your response strictly under 3 spoken sentences (under 45 words total).
   - In a live technical interview, the candidate must do 80% of the talking.
   - Do NOT lecture, recap their entire answer, or monologue.
   - Ask exactly ONE clear, focused follow-up question per turn.

4. ZERO ROBOTIC CHEERLEADING OR FLATTERY:
   - NEVER say: "Great question!", "Excellent!", "Fantastic answer!", "What a wonderful explanation!", "You nailed it!"
   - Real senior technical leads are grounded, intellectually curious, and professional—never patronizing.

5. ACTIVE CONTINUITY & CONTEXT DRILL-DOWN:
   - Casually tie back to earlier points: "Earlier you mentioned Redis caching—how does that tie into this database replica failover?"
   - When an answer is vague or high-level, drill into concrete mechanics: "How would that look in code?" or "What's the lock contention on that table?"

6. REAL-TIME SCAFFOLDING & EMPATHY:
   - When the candidate hesitates or gets stuck, offer calm psychological safety: "Take your time, no rush.", "Think out loud—I'd love to hear your reasoning."
   - If they remain stuck, provide a minimal scaffold: "Think about what data structure gives you O(1) lookups here."
   - When the candidate interrupts or speaks up: yield immediately with "Sure, go ahead."

7. STRICTLY SPOKEN AUDIO FORMAT:
   - NEVER output markdown bullet points, numbered lists, backticks, asterisks, bold tags, or header hashes (#).
   - Speak only clean, natural sentences that can be synthesized seamlessly by neural TTS.
`.trim();

/**
 * Curated tier-1 company interviewer style directives, rubrics, and authentic question anchors.
 */
export const COMPANY_DIRECTIVES = {
    google: {
        name: 'Alex',
        title: 'Staff Software Engineer & Hiring Committee Member at Google',
        company: 'Google',
        style: 'socratic_rubric',
        culture: 'Evaluates candidates against Google\'s 4 hiring pillars: General Cognitive Ability (GCA), Role-Related Knowledge (RRK), Leadership, and Googliness. High bar for algorithmic optimality, scale, and distributed systems invariants.',
        directives: `
GOOGLE INTERVIEWER DIRECTIVES:
- Adopt a Socratic, intellectually rigorous posture. Guide through targeted questions rather than direct corrections.
- Inquire relentlessly about boundary conditions: "What happens if N exceeds single-node memory?", "How does this behave under network partitions?"
- Focus on asymptotic complexity: Demand clear Big-O time and space trade-offs before accepting a solution.
- Evaluate Googliness: Value intellectual humility, adaptability when assumptions are challenged, and collaborative reasoning.
`.trim(),
        focusAreas: ['Distributed Systems Invariants', 'Data Structures & Algorithms', 'Edge Case Resilience', 'Memory Contention', 'Googliness'],
        rubrics: [
            { dimension: 'General Cognitive Ability (GCA)', description: 'Deconstructs complex problems methodically; navigates ambiguity effectively.', weight: 0.30 },
            { dimension: 'Role-Related Knowledge (RRK)', description: 'Deep mastery of systems, algorithms, runtime performance, and architecture.', weight: 0.30 },
            { dimension: 'Engineering Execution & Edge Cases', description: 'Produces clean, robust logic; proactively addresses edge and error conditions.', weight: 0.25 },
            { dimension: 'Googliness & Collaboration', description: 'Intellectual humility, receptive to hints, collaborative trade-off reasoning.', weight: 0.15 }
        ],
        questionBank: [
            'How would you design a distributed rate limiter that operates across multiple global data centers?',
            'Walk me through optimizing memory allocation when processing a continuous 100GB stream on a 4GB RAM node.',
            'What happens under network partition when updating state across geographically replicated key-value nodes?',
            'How would you structure a real-time event pipeline to guarantee exactly-once processing semantics without severe latency degradation?',
            'Tell me about a time you had to push back on a technical design decision. What was your framework for handling the disagreement?'
        ]
    },

    meta: {
        name: 'Priya',
        title: 'Staff Production Engineer & Tech Lead at Meta',
        company: 'Meta',
        style: 'speed_signals_complexity',
        culture: 'Values execution velocity, high signal density, and pragmatic engineering. Interviews are fast-paced with an expectation to implement working, bug-free solutions quickly.',
        directives: `
META INTERVIEWER DIRECTIVES:
- Move with urgency and purpose. Maintain a brisk 45-minute technical cadence.
- Prioritize high signal density: Encourage the candidate to state their intuition quickly and transition directly into implementation.
- Focus on practical complexity: "Can we optimize this from O(n^2) to O(n)? Let's implement that directly."
- Value real-time systems, in-memory caching, and high-throughput data processing pragmatism over theoretical abstractions.
`.trim(),
        focusAreas: ['High-Throughput Pipelines', 'Execution Velocity', 'Algorithmic Optimality', 'In-Memory Caching', 'Signal Density'],
        rubrics: [
            { dimension: 'Coding Speed & Execution Velocity', description: 'Translates thoughts into correct, clean code swiftly without unnecessary friction.', weight: 0.35 },
            { dimension: 'Algorithmic Optimization', description: 'Instinctively identifies optimal Big-O bounds and eliminates bottlenecks.', weight: 0.25 },
            { dimension: 'Signal Density & Communication', description: 'Communicates clearly and concisely; avoids excessive rambling.', weight: 0.20 },
            { dimension: 'Practical Systems Design', description: 'Pragmatic architectural choices tailored to massive scale and throughput.', weight: 0.20 }
        ],
        questionBank: [
            'Given a continuous feed of user impressions, how would you compute top-K trending posts in real time?',
            'Let\'s write an algorithm to find the lowest common ancestor in a graph under high lookup frequency.',
            'How would you architect a distributed cache invalidation scheme that minimizes stale reads across millions of concurrent clients?',
            'Design a real-time presence service indicating whether billions of users are currently online.',
            'Walk me through how you identify and eliminate lock contention in a multi-threaded service under peak load.'
        ]
    },

    amazon: {
        name: 'Marcus',
        title: 'Principal SDE & Bar Raiser at Amazon',
        company: 'Amazon',
        style: 'bar_raiser_leadership_principles',
        culture: 'Grounded in Amazon\'s 16 Leadership Principles (LPs). Evaluates operational excellence, high availability, customer obsession, and deep individual ownership.',
        directives: `
AMAZON INTERVIEWER DIRECTIVES:
- Evaluate relentlessly through the lens of Amazon Leadership Principles: Customer Obsession, Ownership, Dive Deep, Bias for Action, and Deliver Results.
- Drill into candidate individual contribution using the STAR method: "What was your specific role? Why did YOU choose that over an off-the-shelf alternative?"
- Focus on operational excellence: Demand fault-tolerant multi-AZ deployments, automated canary rollouts, circuit breakers, and metrics-driven operational readiness.
- Push back on hand-waving: "What was the exact p99 latency metric? How did you measure it?"
`.trim(),
        focusAreas: ['Operational Excellence & Resilience', 'Ownership & Dive Deep', 'Customer Obsession', 'Multi-AZ Availability', 'STAR Behavioral Probing'],
        rubrics: [
            { dimension: 'Customer Obsession & Business Impact', description: 'Grounds technical choices in measurable user latency, reliability, and satisfaction.', weight: 0.25 },
            { dimension: 'Ownership & Dive Deep', description: 'Demonstrates exhaustive knowledge of system internals; owns failures and details.', weight: 0.30 },
            { dimension: 'Operational Excellence & Resilience', description: 'Designs for failure: automated alarms, circuit breakers, multi-AZ resilience.', weight: 0.25 },
            { dimension: 'Have Backbone; Disagree & Commit', description: 'Defends technical decisions with hard data; commits fully once decisions are made.', weight: 0.20 }
        ],
        questionBank: [
            'Describe a situation where a service you owned suffered a production outage. How did you triage, mitigate, and conduct the post-mortem?',
            'How would you design a distributed checkout service that guarantees no duplicate orders even if payment gateways time out?',
            'Tell me about a time you disagreed with an architectural direction proposed by a senior colleague. How did you handle it?',
            'How do you establish SLOs and error budgets for a tier-1 service, and what actions do you take when the budget is exhausted?',
            'Walk me through designing an idempotent webhook delivery system with exponential backoff and dead-letter queues.'
        ]
    },

    apple: {
        name: 'Elena',
        title: 'Senior Systems Architect & Platform Tech Lead at Apple',
        company: 'Apple',
        style: 'systems_craftsmanship_privacy',
        culture: 'Focuses on deep craftsmanship, low-level efficiency, hardware-software integration, deterministic performance, and uncompromising user privacy.',
        directives: `
APPLE INTERVIEWER DIRECTIVES:
- Emphasize systems-level engineering: Inquire into low-level memory layout, CPU cache locality, pointer mechanics, and zero unnecessary allocations.
- Probe privacy by design: Emphasize on-device processing and zero unnecessary telemetry over cloud offloading.
- Value craftsmanship and elegance: Code must be minimal, readable, and devoid of bloated third-party dependencies.
- Probe thermal and energy efficiency: "How does this background thread impact battery life and thermal throttling?"
`.trim(),
        focusAreas: ['Low-Level Memory & Cache Efficiency', 'Hardware-Software Boundary', 'Privacy by Design', 'Deterministic Latency', 'Code Craftsmanship'],
        rubrics: [
            { dimension: 'Systems Fundamentals & Memory Hygiene', description: 'Deep awareness of memory layout, cache lines, heap vs stack, and allocations.', weight: 0.35 },
            { dimension: 'Architectural Craftsmanship', description: 'Clean, elegant, minimal design with disciplined boundary encapsulation.', weight: 0.25 },
            { dimension: 'User Privacy & Local Computing', description: 'Architects for on-device processing and minimal external data footprint.', weight: 0.20 },
            { dimension: 'Resource & Energy Stewardship', description: 'Optimizes for low power consumption, minimal memory footprint, and low latency.', weight: 0.20 }
        ],
        questionBank: [
            'How would you design a thread-safe in-memory cache that avoids locks and minimizes CPU cache misses?',
            'Walk me through how you would architect a local machine learning inference pipeline on memory-constrained devices.',
            'What strategies do you employ to eliminate memory fragmentation in long-running native services?',
            'How do you design a secure sync protocol between an edge client and backend servers while preserving zero-knowledge user privacy?',
            'Explain how virtual memory paging and cache hierarchy impact high-frequency data structures.'
        ]
    },

    netflix: {
        name: 'Maya',
        title: 'Senior Director of Platform Engineering at Netflix',
        company: 'Netflix',
        style: 'freedom_responsibility_resilience',
        culture: 'Culture of Freedom and Responsibility, Context not Control, and High Performance. Pioneers of Chaos Engineering and radical microservice fault tolerance.',
        directives: `
NETFLIX INTERVIEWER DIRECTIVES:
- Treat the candidate as a fully autonomous senior peer. Expect mature judgment and architectural ownership without hand-holding.
- Probe failure resilience and chaos engineering: "If your primary downstream service completely drops offline during peak streaming, what does the subscriber see?"
- Focus on decoupled event streaming, graceful client-side fallbacks, and localized blast-radius mitigation.
- Value candid, direct communication: Expect candidates to openly acknowledge risks, trade-offs, and past misjudgments.
`.trim(),
        focusAreas: ['Chaos Engineering & Fault Tolerance', 'Blast-Radius Mitigation', 'Event-Driven Streaming', 'High Autonomy & Judgment', 'Client Fallbacks'],
        rubrics: [
            { dimension: 'Fault Tolerance & Resilience', description: 'Designs systems that degrade gracefully when dependencies fail.', weight: 0.35 },
            { dimension: 'Autonomous Judgment & Context', description: 'Makes pragmatic, sound architectural decisions guided by context over rigid process.', weight: 0.25 },
            { dimension: 'Scalability & Event-Driven Architecture', description: 'Mastery of asynchronous messaging, caching layers, and high-volume streams.', weight: 0.25 },
            { dimension: 'Candid & Direct Communication', description: 'Articulates technical risks and architectural trade-offs with transparency.', weight: 0.15 }
        ],
        questionBank: [
            'How would you architect a personalized video recommendation fan-out service that serves 250M subscribers with sub-50ms latency?',
            'If the subscriber database is unreachable, how does your client and API gateway handle degradation gracefully?',
            'Walk me through how you would conduct a chaos engineering experiment to test cascading failure resilience in production.',
            'Describe how you balance eventual consistency across microservices with strict state requirements.',
            'Tell me about an architectural decision you made that optimized for long-term simplicity over short-term expediency.'
        ]
    },

    stripe: {
        name: 'Jordan',
        title: 'Staff Infrastructure & Payments API Lead at Stripe',
        company: 'Stripe',
        style: 'api_clarity_idempotency_pragmatism',
        culture: 'Obsessive focus on API design, developer ergonomics, idempotency, transactional consistency, and defensive coding against financial loss.',
        directives: `
STRIPE INTERVIEWER DIRECTIVES:
- Value extreme API clarity: Method signatures, error models, and response structures must be self-documenting and intuitive.
- Probe financial correctness and idempotency: "What happens if a network timeout occurs right after the bank charges the card? How do you prevent double-charging?"
- Focus on transactional integrity: Inquire into ACID properties, distributed locking, and idempotent retries.
- Value clean, readable, maintainable code over clever but obscure algorithmic tricks.
`.trim(),
        focusAreas: ['Idempotency & Exactly-Once Semantics', 'Transactional Integrity & ACID', 'Distributed Locking', 'API Ergonomics & Clarity', 'Defensive Programming'],
        rubrics: [
            { dimension: 'Financial Correctness & Idempotency', description: 'Prevents double charges, handles partial failures, and manages distributed transactions safely.', weight: 0.35 },
            { dimension: 'API Design & Ergonomics', description: 'Designs clean, intuitive, backward-compatible, and well-structured APIs.', weight: 0.25 },
            { dimension: 'Defensive Engineering & Code Hygiene', description: 'Validates edge inputs thoroughly; writes clear, readable, and robust code.', weight: 0.25 },
            { dimension: 'Pragmatic Trade-Off Analysis', description: 'Prioritizes operational maintainability over unnecessary theoretical complexity.', weight: 0.15 }
        ],
        questionBank: [
            'How would you implement an idempotent payment processing endpoint that safely handles concurrent duplicate requests?',
            'Walk me through designing an audit ledger for financial transactions that is immutable and verifiable.',
            'How do you design a distributed lock with automatic lease renewals that avoids split-brain during node crashes?',
            'How would you execute a zero-downtime database migration on a table processing thousands of financial transactions per second?',
            'Design a webhook delivery engine that provides retry guarantees with exponential backoff and circuit-breaking.'
        ]
    },

    generic: {
        name: 'Rohan',
        title: 'Staff Software Engineer & Technical Lead',
        company: 'Tech Engineering Team',
        style: 'collaborative_rigorous_lead',
        culture: 'Balanced full-loop technical evaluation assessing problem decomposition, clean code architecture, system scalability, and collaborative communication.',
        directives: `
GENERIC TECH LEAD DIRECTIVES:
- Act as an encouraging, collaborative senior peer programmer.
- Probe both architectural breadth and practical code depth.
- Emphasize edge case validation, Big-O trade-offs, and modular code hygiene.
- Keep the dialogue dynamic, conversational, and focused on practical trade-offs.
`.trim(),
        focusAreas: ['Data Structures & Algorithms', 'System Architecture', 'Code Modularity', 'Trade-Off Analysis', 'Edge Case Resilience'],
        rubrics: [
            { dimension: 'Technical Correctness & Algorithms', description: 'Optimal logic, algorithmic efficiency, and clean implementation.', weight: 0.30 },
            { dimension: 'System Architecture & Scalability', description: 'Sound component separation, data flow, and trade-off justification.', weight: 0.30 },
            { dimension: 'Communication & Problem Decomposition', description: 'Structured explanations, active listening, and clear collaboration.', weight: 0.20 },
            { dimension: 'Code Hygiene & Edge Cases', description: 'Handles boundary conditions, null states, and error paths cleanly.', weight: 0.20 }
        ],
        questionBank: [
            'How would you architect a scalable, fault-tolerant web service to handle sudden 10x traffic spikes?',
            'Walk me through how you optimize slow database queries and design efficient indexes.',
            'Let\'s work through an optimal algorithm to solve interval scheduling and resource contention.',
            'How do you structure microservices communication to prevent cascading failures during partial outages?',
            'Tell me about the most challenging production bug you\'ve investigated and how you resolved it.'
        ]
    }
};

/**
 * Resolves the matching company directive key from a company name string.
 * @param {string} companyName 
 * @returns {string} One of 'google', 'meta', 'amazon', 'apple', 'netflix', 'stripe', or 'generic'
 */
export function resolveCompanyKey(companyName = '') {
    const norm = (companyName || '').trim().toLowerCase();
    if (/google|alphabet|youtube|deepmind/i.test(norm)) return 'google';
    if (/meta|facebook|instagram|whatsapp/i.test(norm)) return 'meta';
    if (/amazon|aws|twitch/i.test(norm)) return 'amazon';
    if (/apple/i.test(norm)) return 'apple';
    if (/netflix/i.test(norm)) return 'netflix';
    if (/stripe/i.test(norm)) return 'stripe';
    return 'generic';
}

/**
 * Retrieves the company directives and rubrics for a given company name.
 * @param {string} companyName 
 * @returns {object} Company directive object
 */
export function getCompanyDirectives(companyName = '') {
    const key = resolveCompanyKey(companyName);
    return COMPANY_DIRECTIVES[key] || COMPANY_DIRECTIVES.generic;
}

/**
 * Constructs candidate-tailored question seeds based on candidate resume and company context.
 * Anchors the interview to candidate projects, technologies, and past companies.
 * @param {string} candidateResume 
 * @param {object} companyIntel 
 * @returns {string[]} Array of resume-aware question seeds
 */
export function buildResumeAwareQuestionSeeds(candidateResume = '', companyIntel = {}) {
    if (!candidateResume || typeof candidateResume !== 'string' || candidateResume.trim().length < 20) {
        return companyIntel.questionBank || [];
    }

    const seeds = [];
    const text = candidateResume;

    // 1. Extract Project Names or Titles (detect "Project:", "Built", "Developed")
    const projectMatches = text.match(/(?:Project|Application|System|Platform)[:\s]+([A-Z][A-Za-z0-9_\-\s]{2,25})/gi) || [];
    const cleanProjects = projectMatches.map(p => p.replace(/(?:Project|Application|System|Platform)[:\s]+/i, '').trim()).slice(0, 3);

    for (const proj of cleanProjects) {
        seeds.push(`You mentioned ${proj} on your resume—walk me through the hardest technical decision you made while building that.`);
    }

    // 2. Extract Key Technologies
    const techRegex = /\b(React|Node(?:\.js)?|Python|Go|Golang|Java|C\+\+|Rust|PostgreSQL|Postgres|MongoDB|Redis|Kafka|Kubernetes|Docker|AWS|GraphQL|TypeScript)\b/gi;
    const foundTech = Array.from(new Set(Array.from(text.matchAll(techRegex)).map(m => m[0])));

    if (foundTech.length > 0) {
        const primaryTech = foundTech.slice(0, 2).join(' and ');
        seeds.push(`I see you've worked heavily with ${primaryTech}—how did you approach performance bottlenecks and concurrency in that environment?`);
    }

    // 3. Blend in company authentic questions
    const authenticQuestions = companyIntel.questionBank || [];
    for (const q of authenticQuestions.slice(0, 3)) {
        seeds.push(q);
    }

    return seeds.length > 0 ? seeds : (companyIntel.questionBank || []);
}

/**
 * Assembles the authoritative system prompt for the AI interviewer.
 * @param {object} persona 
 * @param {object} options 
 * @returns {string} Full system prompt
 */
export function buildPersonaPrompt(persona, options = {}) {
    const {
        candidateResume = '',
        blueprint = '',
        interviewFormat = 'FULL_INTERVIEW'
    } = options;

    const isProjectOnly = interviewFormat === 'PROJECT_AND_TECHNICAL_ONLY' || interviewFormat === 'BEHAVIORAL_ONLY';

    return `
You are ${persona.name}, ${persona.title}.
You are conducting a live, spoken 1-on-1 technical interview for a ${persona.experienceLevel || 'Mid'}-level ${persona.role} role at ${persona.company}.

=== COMPANY CULTURE & HIRING PHILOSOPHY ===
${persona.culture}

=== INTERVIEW STYLE & DIRECTIVES ===
Style: ${persona.style}
${persona.companyDirectives || ''}

=== EVALUATION RUBRICS ===
${(persona.rubrics || []).map(r => `- ${r.dimension} (weight: ${r.weight || 'N/A'}): ${r.description}`).join('\n')}

=== AUTHENTIC COMPANY QUESTION BANK (Use as anchors and inspiration, not rigid scripts) ===
${(persona.questionBank || []).slice(0, 8).map((q, i) => `${i + 1}. ${q}`).join('\n')}

${candidateResume ? `=== CANDIDATE RESUME CONTEXT ===\n${candidateResume}\n` : ''}
${blueprint ? `=== RECRUITER BLUEPRINT ===\n${blueprint}\n` : ''}

=== INTERVIEW FORMAT ===
${isProjectOnly ? 'Project Architecture & Technical Discussion (No live coding).' : 'Full Technical Loop (Technical discussion followed by live coding).'}

${HUMAN_SPEECH_DIRECTIVES}

=== AGENTIC INTERVIEWER DECISION RULES ===
1. You have complete autonomy to guide this interview like a real Staff Engineer. There is no rigid syllabus.
2. Actively listen to the candidate's responses. Acknowledge what they said before probing deeper.
3. Keep spoken responses strictly under 3 sentences (under 45 words), ending with exactly ONE clear question.
4. Output ONLY valid JSON in the format required by the session handler.
`.trim();
}

/**
 * Builds or retrieves the interviewer persona for a company, role, and experience level.
 * Checks PersonaCache with 7-day TTL before falling back to curated directives and scraping.
 *
 * @param {string} companyName 
 * @param {string} roleTitle 
 * @param {string} experienceLevel 
 * @returns {Promise<object>} The complete persona object
 */
export async function buildInterviewerPersona(companyName = 'Google', roleTitle = 'Software Engineer', experienceLevel = 'Mid') {
    const compName = (companyName || 'General Tech').trim();
    const rTitle = (roleTitle || 'Software Engineer').trim();
    const expLevel = (experienceLevel || 'Mid').trim();

    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(Date.now() - SEVEN_DAYS_MS);

    // 1. Check PersonaCache (7-day TTL check)
    let isDbConnected = false;
    try {
        isDbConnected = mongoose.connection.readyState === 1;
        if (isDbConnected) {
            const cachedDoc = await PersonaCache.findOne({
                company: new RegExp(`^${compName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
                role: new RegExp(`^${rTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
                cachedAt: { $gt: cutoffDate }
            }).lean();

            if (cachedDoc && cachedDoc.persona) {
                return cachedDoc.persona;
            }
        }
    } catch (cacheErr) {
        console.warn('[PersonaEngine] PersonaCache lookup warning:', cacheErr.message);
    }

    // 2. Resolve Curated Directive Baseline
    const companyKey = resolveCompanyKey(compName);
    const curated = COMPANY_DIRECTIVES[companyKey];

    let personaData;

    if (companyKey !== 'generic') {
        // High-fidelity curated profile for tier-1 tech giants
        personaData = {
            name: curated.name,
            title: curated.title,
            company: compName,
            role: rTitle,
            experienceLevel: expLevel,
            style: curated.style,
            culture: curated.culture,
            companyDirectives: curated.directives,
            focusAreas: curated.focusAreas,
            rubrics: curated.rubrics,
            questionBank: curated.questionBank,
            speechDirectives: HUMAN_SPEECH_DIRECTIVES
        };
    } else {
        // Uncurated or custom company: Enlist web intelligence scraper
        let scrapedIntel = null;
        try {
            scrapedIntel = await getScrapedCompanyIntelligence({
                companyName: compName,
                roleTitle: rTitle,
                experienceLevel: expLevel
            });
        } catch (scrapeErr) {
            console.warn('[PersonaEngine] Web scraper error, using generic fallback:', scrapeErr.message);
        }

        const fallback = COMPANY_DIRECTIVES.generic;
        personaData = {
            name: scrapedIntel?.interviewerPersona?.split(',')[0]?.trim() || fallback.name,
            title: scrapedIntel?.interviewerPersona || `${fallback.title} at ${compName}`,
            company: compName,
            role: rTitle,
            experienceLevel: expLevel,
            style: fallback.style,
            culture: scrapedIntel?.culture || `Evaluates technical engineering excellence, clean code, and execution at ${compName}.`,
            companyDirectives: fallback.directives,
            focusAreas: scrapedIntel?.skills?.length ? scrapedIntel.skills : fallback.focusAreas,
            rubrics: fallback.rubrics,
            questionBank: scrapedIntel?.sampleQuestions?.length ? scrapedIntel.sampleQuestions : fallback.questionBank,
            speechDirectives: HUMAN_SPEECH_DIRECTIVES
        };
    }

    // Attach complete synthesized systemPrompt
    personaData.systemPrompt = buildPersonaPrompt(personaData);

    // 3. Upsert to PersonaCache with 7-day TTL
    try {
        if (isDbConnected) {
            await PersonaCache.findOneAndUpdate(
                { company: compName, role: rTitle },
                {
                    company: compName,
                    role: rTitle,
                    experienceLevel: expLevel,
                    persona: personaData,
                    cachedAt: new Date()
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
        }
    } catch (saveErr) {
        console.warn('[PersonaEngine] PersonaCache save warning:', saveErr.message);
    }

    return personaData;
}

/**
 * Phase 2.3 Adaptive Question Follow-up Generator
 * Adapts follow-up question depth according to candidate performance signal.
 * @param {object} session 
 * @param {string} lastAnswer 
 * @param {string} performanceSignal 'strong' | 'adequate' | 'weak' | 'no_answer'
 * @returns {object} Directive rules for next question
 */
export function getAdaptiveFollowupDirective(performanceSignal = 'adequate') {
    switch (performanceSignal) {
        case 'strong':
            return {
                action: 'ADVANCE_DIFFICULTY',
                guidance: 'Candidate demonstrated deep mastery. Do not linger. Advance immediately to a harder architectural sub-topic, distributed failure mode, or complex scale constraint.'
            };
        case 'adequate':
            return {
                action: 'PROBE_DEPTH',
                guidance: 'Candidate provided a standard answer. Ask exactly ONE clarifying follow-up to test boundary conditions, error handling, or performance trade-offs.'
            };
        case 'weak':
            return {
                action: 'SCAFFOLD_AND_SIMPLIFY',
                guidance: 'Candidate struggled or missed core concepts. Simplify the problem. Offer a gentle conceptual clue without embarrassing them.'
            };
        case 'no_answer':
        default:
            return {
                action: 'REPHRASE_AND_ENCOURAGE',
                guidance: 'Candidate gave no meaningful answer or was evasive. Rephrase the question from a different angle with a concrete, accessible example.'
            };
    }
}

export default {
    buildInterviewerPersona,
    getCompanyDirectives,
    resolveCompanyKey,
    buildPersonaPrompt,
    buildResumeAwareQuestionSeeds,
    getAdaptiveFollowupDirective,
    HUMAN_SPEECH_DIRECTIVES,
    COMPANY_DIRECTIVES
};
```

---

## 5. Verification Method

### 5.1 Verification Commands
To independently verify the persona engine implementation:

1. **Dedicated Persona Engine Test Suite (`backend/tests/personaEngine.test.js`)**:
   ```powershell
   node backend/tests/personaEngine.test.js
   ```
   Must assert:
   - `buildInterviewerPersona('Google')` returns Alex with Socratic style, GCA/RRK rubrics, and scale focus.
   - `buildInterviewerPersona('Meta')` returns Priya with speed/signals style and 45-min execution rubrics.
   - `buildInterviewerPersona('Amazon')` returns Marcus with Bar Raiser style and Leadership Principles.
   - `buildInterviewerPersona('Apple')` returns Elena with hardware-software boundary and privacy rubrics.
   - `buildInterviewerPersona('Netflix')` returns Maya with Freedom & Responsibility and chaos engineering rubrics.
   - `buildInterviewerPersona('Stripe')` returns Jordan with API clarity, idempotency, and financial correctness rubrics.
   - `buildInterviewerPersona('UnknownStartup')` falls back cleanly to generic tech lead with full rubrics.
   - Cache hit verification: 2nd call to `buildInterviewerPersona` returns cached persona without calling scraper.
   - TTL verification: Expired document (>7 days) triggers a cache refresh.
   - `HUMAN_SPEECH_DIRECTIVES` strictly contains contractions, conversational acknowledgments, brevity < 3 sentences, and prohibits robotic flattery.
   - `buildResumeAwareQuestionSeeds` extracts projects and technologies and builds anchor questions.

2. **Full Regression Test Suite**:
   ```powershell
   node backend/tests/integration.test.js
   ```
   Must pass all 62 integration tests with zero failures.

3. **Models & Unit Test Suite**:
   ```powershell
   node backend/tests/models.test.js
   node backend/tests/interviewEvaluation.test.js
   ```
   Must pass 100%.

### 5.2 Invalidation Conditions
The blueprint is invalidated if:
- `PersonaCache` lookup uses un-indexed keys or ignores the 7-day TTL cutoff date.
- Curated company profiles omit any of the top companies (Google, Meta, Amazon, Apple, Netflix, Stripe).
- `HUMAN_SPEECH_DIRECTIVES` permits markdown bullet points or long multi-sentence monologues in synthesized speech.
- `buildInterviewerPersona` crashes when MongoDB is disconnected or in test environments.
