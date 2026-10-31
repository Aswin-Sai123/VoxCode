import { extractProjects } from './refined_extractor.js';
import { extractTechStack, extractCompanies, buildResumeAwareQuestionSeeds } from './test_resume_seeds.js';

// Wire up
const sampleResume = `
EXPERIENCE:
Senior Backend Engineer at Stripe (2022 - 2024)
- Architected real-time payment reconciliation service in Node.js, Kafka, and PostgreSQL.
- Reduced p99 latency from 1.2s to 180ms using Redis caching and read replicas.

PROJECTS:
VoxCode Live Audio Simulator:
- Built real-time Web Audio and WebSocket streaming engine with Redis and Docker.
- Handled sub-300ms speech synthesis chunking in Node.js.

SKILLS:
Node.js, TypeScript, PostgreSQL, Redis, Kafka, Docker, Kubernetes, AWS
`;

const sampleCompany = {
    companyName: 'Uber',
    focusAreas: ['High Throughput Event Streaming', 'Low Latency State Management', 'Distributed Consistency'],
    techStack: ['Node.js', 'Go', 'Kafka', 'Redis', 'PostgreSQL'],
    questionBank: [
        'How would you design a distributed rate limiter for millions of concurrent driver pings?',
        'Design an idempotent ride dispatch settlement pipeline.'
    ]
};

const extractedProjects = extractProjects(sampleResume);
console.log('EXTRACTED PROJECTS:', JSON.stringify(extractedProjects, null, 2));

const seeds = buildResumeAwareQuestionSeeds({
    candidateResume: sampleResume,
    projects: extractedProjects,
    pastCompanies: extractCompanies(sampleResume),
    skills: extractTechStack(sampleResume),
    experienceLevel: 'Senior'
}, sampleCompany, 'Senior Backend Engineer');

console.log('REFINED SEEDS:');
console.log(JSON.stringify(seeds, null, 2));
