export const REALISTIC_BLUEPRINT_TEMPLATES = [
    {
        id: 'full-technical-coding',
        title: 'Full-Loop Technical & Live Coding',
        role: 'Senior Backend / Distributed Systems Engineer',
        badge: 'Live Monaco Coding',
        codingRoundEnabled: true,
        summary: 'Deep architectural discussion on high-concurrency systems followed by hands-on algorithmic coding in Monaco IDE with unit test validation.',
        suggestedDuration: 45,
        suggestedSkills: ['System Design', 'Distributed Systems', 'PostgreSQL', 'Redis', 'Algorithms & DSA'],
        blueprintText: `Role: Senior Backend Engineer (Distributed Systems)
Target Seniority: Senior (5+ years)
Focus Areas: High-concurrency architectures, distributed transactions, database indexing, and algorithmic problem solving.

Round Structure & Timeline:
1. Warmup & Production Project Context (0-5 mins):
   - Brief introduction.
   - Candidate explains their most complex production backend service (throughput, bottleneck resolved, failure recovery mechanisms).

2. Architectural Deep-Dive & Trade-offs (5-20 mins):
   - Distributed caching strategies: Cache-aside vs Write-through, thundering herd mitigation, and cache invalidation.
   - Asynchronous vs synchronous communication: Event-driven pub/sub (Kafka/RabbitMQ) vs REST/gRPC under heavy write spikes.
   - Database schema design & partitioning: Handling high-volume writes, indexing strategies, and database connection pooling.

3. Live Problem Solving & Hands-On Coding in Monaco IDE (20-40 mins):
   - Coding Challenge: Implement an in-memory Rate Limiter supporting configurable time windows (Sliding Window Log or Token Bucket).
   - Candidate must handle edge cases: Concurrent requests, thread/process safety, memory cleanup of expired timestamps.
   - Candidate writes clean, modular code, explains space/time complexity, and runs the test suite.

4. Candidate Q&A & Wrap-Up (40-45 mins):
   - Candidate questions regarding team engineering practices and architecture standards.

Key Evaluation Rubrics:
- Problem deconstruction & verbal reasoning before typing.
- Algorithmic efficiency (Time & Space complexity analysis).
- Production-readiness (error boundaries, input validation, edge cases).`
    },
    {
        id: 'system-architecture-verbal',
        title: 'System Architecture & Technical Defense (No Live IDE)',
        role: 'Staff Systems Architect / Tech Lead',
        badge: 'Architecture & Verbal Only',
        codingRoundEnabled: false,
        summary: 'Deep architectural defense and verbal problem solving with zero IDE coding. Candidates explain algorithmic approaches, state machines, and system trade-offs verbally.',
        suggestedDuration: 45,
        suggestedSkills: ['Distributed Systems', 'Cloud Architecture', 'Kafka', 'Data Modeling', 'Microservices'],
        blueprintText: `Role: Staff Systems Architect / Technical Lead
Target Seniority: Staff / Principal (7+ years)
Format: In-depth Architectural Defense & Technical Discussion (No Live IDE Coding; candidate explains technical approaches, trade-offs, and pseudo-code verbally).

Round Structure & Timeline:
1. Technical Background & Architecture Overview (0-5 mins):
   - Candidate outlines architectural ownership of large-scale distributed systems they have designed or maintained.

2. System Design & Scalability Deep-Dive (5-25 mins):
   - Scenario: Designing a global notification & webhook delivery engine with at-least-once delivery guarantees.
   - Message brokers & ordering: Partitioning keys in Kafka, dead-letter queue (DLQ) retry policies, exponential backoff, and circuit breaking.
   - Data consistency: Handling distributed workflows across microservices without 2-phase commit (Saga pattern, outbox pattern).

3. Technical Problem Solving & Verbal Coding (25-40 mins):
   - Problem: Detecting circular dependencies and determining build order in a multi-package repository.
   - Candidate verbally explains the data structures (directed graph via adjacency list), in-degree tracking, topological sort (Kahn's algorithm / DFS cycle detection), and edge cases (disconnected components, self-referencing nodes).
   - No IDE coding; candidate is evaluated purely on verbal technical clarity, algorithmic soundness, and communication.

4. Leadership & Engineering Judgment (40-45 mins):
   - Balancing tech debt vs feature delivery velocity; mentorship and resolving architectural stalemates.

Key Evaluation Rubrics:
- Scalability & trade-off analysis under high constraints.
- Clarity of technical articulation without code execution crutches.
- Production operational intuition (observability, alerting, disaster recovery).`
    },
    {
        id: 'practical-fullstack-frontend',
        title: 'Full-Stack & Frontend Engineering Loop',
        role: 'Senior Full-Stack / Frontend Engineer',
        badge: 'Live Monaco Coding',
        codingRoundEnabled: true,
        summary: 'Modern web architecture, state management, asynchronous pipelines, and a live coding exercise in Monaco IDE.',
        suggestedDuration: 40,
        suggestedSkills: ['React', 'TypeScript', 'Web Performance', 'REST/GraphQL', 'State Management'],
        blueprintText: `Role: Senior Full-Stack Engineer (Frontend Focus)
Target Seniority: Senior (4-6 years)
Focus Areas: Modern frontend architecture, asynchronous data flow, rendering performance, and practical algorithmic problem solving.

Round Structure & Timeline:
1. Candidate Intro & Technical Overview (0-5 mins):
   - Overview of high-traffic web applications built and key architectural decisions made.

2. Frontend Architecture & Performance Deep-Dive (5-20 mins):
   - Web performance: Critical rendering path, hydration bottlenecks, bundle code-splitting, and Core Web Vitals (LCP, INP, CLS).
   - State synchronization: Server-state caching (React Query / SWR) vs client state, optimistic UI updates, and cache invalidation.
   - Security & Resilience: Mitigating XSS, CSRF in SPAs, and handling flaky network connectivity.

3. Live Coding Challenge in Monaco IDE (20-35 mins):
   - Coding Challenge: Implement an autocomplete/search query manager with debouncing, request cancellation (AbortController), and out-of-order response rejection.
   - Candidate implements the solution, handles edge cases (rapid keystrokes, network errors), and runs test cases.

4. Candidate Q&A & Wrap-Up (35-40 mins):
   - Wrap-up and debrief.

Key Evaluation Rubrics:
- Mastery of modern JavaScript/TypeScript and asynchronous primitives.
- Code modularity, clean component separation, and error handling.
- Pragmatic problem-solving approach.`
    }
];
