## 2026-10-30T15:12:56Z
You are explorer_m3_2 (Milestone 3 Scraper Explorer).
Your working directory is: c:\Users\pratheek\OneDrive\Documents\VoxCode\.agents\teamwork\explorer_m3_2\

Mandatory Reading:
1. c:\Users\pratheek\OneDrive\Documents\VoxCode\.agents\teamwork\ORIGINAL_REQUEST.md
2. c:\Users\pratheek\OneDrive\Documents\VoxCode\PROJECT.md
3. C:\Users\pratheek\.gemini\antigravity\brain\b96f18cf-b1bf-4f4c-ba3a-6b8d0ad2e40a\REAL_INTERVIEW_UPGRADE_PLAN.md (Phases 2 & 3)
4. Existing backend services and models: `backend/src/models/personaCache.model.js`, `backend/src/models/questionBank.model.js`

Task:
Investigate and design the implementation strategy for `backend/src/services/companyScraper.service.js`:
- How to fetch / scrape interview debriefs and leaked question context across multi-source targets:
  - Reddit: `r/cscareerquestions`, `r/leetcode`, `r/interviewbit`, and company subreddits (e.g., `r/google`, `r/meta`, etc.)
  - LeetCode discussion & company tags
  - Glassdoor interview debriefs
  - Blind posts
- How to implement search grounding / search synthesis (e.g. using public Reddit JSON APIs, search endpoints, or search grounding via LLM/mock fallback for offline environments)
- Sanitization, extraction, and deduplication of real interview questions and focus areas
- Population of `QuestionBank` model (`company`, `role`, `topic`, `difficulty`, `questionText`, `source`, `frequency`)
- Cache population of `PersonaCache` model (`company`, `role`, `rawIntel`, `scrapedQuestions`)
- Graceful error handling and network fallback if any source is rate-limited, blocked, or offline.

Deliverables:
- Write your comprehensive findings and concrete implementation blueprint into `c:\Users\pratheek\OneDrive\Documents\VoxCode\.agents\teamwork\explorer_m3_2\handoff.md`.
- Send a message back to orchestrator when finished.
Do NOT modify any source code. You are read-only.
