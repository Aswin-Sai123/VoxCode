import mongoose from 'mongoose';
import { PersonaCache } from '../models/personaCache.model.js';
import { QuestionBank } from '../models/questionBank.model.js';
import { getCompanyLeetCodeQuestions } from './leetcodeDataset.service.js';

const GEMINI_MODELS = ['gemini-flash-lite-latest', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.5-flash'];
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
        'for', 'with', 'using', 'in', 'and', 'or', 'at', 'me', 'you', 'write', 'code',
        'would', 'could', 'can', 'do', 'we', 'they', 'so', 'i'
    ]);
    const allowedShortTokens = new Set(['ai', 'ml', 'ui', 'db', 'os', 'ip', 's3', 'az', 'pr', 'ci', 'go', 'js', 'ts']);
    return text
        .toLowerCase()
        .replace(/([a-z]{3,})\s+(\d+)/gi, (m, p1, p2) => p1 + p2)
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(token => (token.length > 2 || allowedShortTokens.has(token)) && !stopWords.has(token))
        .sort()
        .join('_');
}

/**
 * Sanitizes and deduplicates question lists using fuzzy token matching
 */
export function extractAndDeduplicateQuestions(questions = [], options = {}) {
    if (!Array.isArray(questions)) return [];
    const { defaultTopic = 'Algorithms & System Design', defaultDifficulty = 'medium' } = options;
    const seenKeys = new Map();
    const result = [];

    for (const q of questions) {
        if (!q) continue;
        let text = typeof q === 'string' ? q : (typeof q?.text === 'string' ? q.text : (typeof q?.question === 'string' ? q.question : ''));
        if (!text) continue;

        // Clean common noise prefixes from candidate reports
        text = text
            .replace(/^(?:question\s*\d*|q\d+|q\b|round\s*\d*|asked(?:\s+me)?|so\s+they\s+asked(?:\s+me)?|the\s+interviewer\s+wanted\s+to\s+know|the\s+interviewer\s+asked(?:\s+me)?|i\s+was\s+asked\s+to)[:.-]?\s*/i, '')
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
                topics: (typeof q === 'object' && Array.isArray(q.topics) && q.topics.length ? q.topics : [defaultTopic]),
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
    const compMatch = POPULAR_COMPANIES.find(c => c.name.toLowerCase() === (companyName || '').toLowerCase());
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
    if (!mongoose.connection || mongoose.connection.readyState !== 1) return [];

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
    if (!mongoose.connection || mongoose.connection.readyState !== 1) return null;

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
            returnDocument: 'after',
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
    if (!mongoose.connection || mongoose.connection.readyState !== 1) return null;

    try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const cached = await PersonaCache.findOne({
            company: new RegExp(`^${(companyName || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
            role: new RegExp(`^${(roleTitle || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
            cachedAt: { $gt: sevenDaysAgo }
        });
        return cached?.persona || null;
    } catch (err) {
        console.warn('[SCRAPER] PersonaCache lookup notice:', err.message);
        return null;
    }
}

/**
 * Live Google Search Grounding with Gemini across LeetCode, Glassdoor, and Blind
 */
async function scrapeWithGoogleGrounding(companyName, roleTitle, experienceLevel, apiKey) {
    const prompt = `You are an automated real-time web intelligence scraper and technical interview architect for VoxCode.
Perform a thorough, in-depth search of recent 2024-2026 interview debriefs and discussions on LeetCode Discuss, Glassdoor, Blind, levels.fyi, and company engineering blogs for:
Company: ${companyName}
Role: ${roleTitle}
Seniority: ${experienceLevel}

You must construct a complete, deep-dive interview architecture:
1. Exact hiring process breakdown (Round 1: Screening, Round 2: Technical/Architectural Dialogue, Round 3: Live Problem Solving / DSA, Round 4: Bar Raiser & Culture).
2. Deep company engineering evaluation principles (e.g. Google's code maintainability, testing, and Big-O efficiency; Amazon's Leadership Principles; Stripe's production-readiness & idempotency; Meta's speed and working code).
3. Authentic interview questions recently reported by candidates in technical architecture and system design rounds.
4. Comprehensive multi-paragraph blueprint specifying time allocation, transition signals, question pacing, and pass/fail thresholds.

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
 * Primary multi-source scraper for persona engine and assessment creation
 */
export async function scrapeCompanyInterviewIntel(companyName = 'Google', roleTitle = 'Software Engineer', experienceLevel = 'Mid') {
    // 1. Check PersonaCache (7-day TTL)
    const cachedPersona = await getCachedPersona(companyName, roleTitle);
    if (cachedPersona) {
        return cachedPersona;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const isTest = process.env.NODE_ENV === 'test';

    // 2. Curated High-Fidelity Fallback
    const fallbackIntel = getCuratedFallbackIntel(companyName, roleTitle, experienceLevel);

    if (isTest || !apiKey) {
        return fallbackIntel;
    }

    const [redditDebriefs, groundingResult, mongoQuestions] = await Promise.allSettled([
        fetchRedditDebriefs(companyName, roleTitle, { limit: 8 }),
        scrapeWithGoogleGrounding(companyName, roleTitle, experienceLevel, apiKey),
        getCompanyLeetCodeQuestions(companyName, {
            targetDifficulty: (experienceLevel.toLowerCase().includes('senior') || /sde\s*2|l5|l6/i.test(roleTitle)) ? 'med/hard' : 'Medium',
            limit: 10
        })
    ]);

    const redditPosts = redditDebriefs.status === 'fulfilled' ? redditDebriefs.value : [];
    const groundedData = groundingResult.status === 'fulfilled' ? groundingResult.value : null;
    const dbLeetcodeQuestions = mongoQuestions.status === 'fulfilled' ? (mongoQuestions.value || []).map(q => `${q.title} (${q.difficulty} - ${q.url})`) : [];

    // 4. Synthesize raw scraped questions from all sources
    const rawQuestions = [
        ...(groundedData?.sampleQuestions || []),
        ...(groundedData?.realQuestions || []),
        ...dbLeetcodeQuestions,
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
    const resumeAlignedQuestions = (intel.realQuestions || []).filter(q =>
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
    const cacheKey = `${companyName.trim().toLowerCase()}_${roleTitle.trim().toLowerCase()}_${experienceLevel.trim().toLowerCase()}`;

    // Return in-memory cached intelligence if scraped within the last 15 minutes
    if (scrapedIntelligenceCache.has(cacheKey)) {
        const cached = scrapedIntelligenceCache.get(cacheKey);
        if (Date.now() - cached.timestamp < 1000 * 60 * 15) {
            return cached.data;
        }
    }

    const intel = await scrapeCompanyInterviewIntel(companyName, roleTitle, experienceLevel);
    const result = {
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
        sampleQuestions: (intel.realQuestions || []).slice(0, 5),
        blueprint: intel.blueprint,
        searchQueries: intel.rawIntel?.searchQueries || []
    };

    scrapedIntelligenceCache.set(cacheKey, {
        timestamp: Date.now(),
        data: result
    });

    return result;
};

/**
 * Curated knowledge base for Tier-1 tech companies + dynamic fallback
 */
export function getCuratedFallbackIntel(companyName, roleTitle, experienceLevel) {
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

export default {
    POPULAR_COMPANIES,
    getCuratedCompanyProfiles,
    normalizeQuestionTokens,
    extractAndDeduplicateQuestions,
    fetchRedditDebriefs,
    populateQuestionBank,
    cachePersonaIntelligence,
    getCachedPersona,
    scrapeCompanyInterviewIntel,
    scrapeSessionIntelligence,
    getScrapedCompanyIntelligence,
    getCuratedFallbackIntel
};
