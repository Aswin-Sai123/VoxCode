/**
 * Prototype & Verification of buildResumeAwareQuestionSeeds
 */

const CANONICAL_SKILLS = [
    'Node.js', 'React', 'Vue.js', 'Angular', 'Next.js', 'TypeScript', 'JavaScript',
    'Python', 'Django', 'FastAPI', 'Go', 'Golang', 'Rust', 'Java', 'Spring Boot',
    'C++', 'C#', '.NET', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Cassandra',
    'DynamoDB', 'Kafka', 'RabbitMQ', 'AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes',
    'GraphQL', 'gRPC', 'Elasticsearch'
];

export function extractTechStack(text) {
    if (!text || typeof text !== 'string') return [];
    const found = new Set();
    const normalized = text.toLowerCase();
    
    for (const skill of CANONICAL_SKILLS) {
        const lowerSkill = skill.toLowerCase();
        // Exact word boundary or punctuation match
        const regex = new RegExp(`(?:^|[^a-zA-Z0-9_#+.-])${escapeRegExp(lowerSkill)}(?:$|[^a-zA-Z0-9_#+.-])`, 'i');
        if (regex.test(normalized)) {
            found.add(skill);
        }
    }
    return Array.from(found);
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function extractProjects(resumeText) {
    if (!resumeText) return [];
    const projects = [];
    const lines = resumeText.split('\n');
    let inProjectsSection = false;
    let currentProject = null;

    for (const line of lines) {
        const trimmed = line.trim();
        if (/^(projects|personal projects|key projects|notable projects)\b/i.test(trimmed)) {
            inProjectsSection = true;
            continue;
        }
        if (inProjectsSection && /^(experience|work experience|employment|education|skills)\b/i.test(trimmed)) {
            inProjectsSection = false;
            if (currentProject) projects.push(currentProject);
            currentProject = null;
            continue;
        }

        if (inProjectsSection && trimmed) {
            // New project heading (bullet, title line, or bold)
            const titleMatch = trimmed.match(/^(?:[-*•]|\d+\.)?\s*([A-Za-z0-9\s_-]{3,40})(?:\s*[:|–—-]\s*(.*))?$/);
            if (titleMatch && !trimmed.toLowerCase().includes('responsibilities') && !trimmed.startsWith('Built ') && !trimmed.startsWith('Designed ')) {
                if (currentProject) projects.push(currentProject);
                currentProject = {
                    name: titleMatch[1].trim(),
                    description: titleMatch[2] ? titleMatch[2].trim() : '',
                    tech: extractTechStack(trimmed),
                    details: []
                };
            } else if (currentProject) {
                currentProject.details.push(trimmed);
                const lineTech = extractTechStack(trimmed);
                for (const t of lineTech) {
                    if (!currentProject.tech.includes(t)) currentProject.tech.push(t);
                }
            }
        }
    }
    if (currentProject) projects.push(currentProject);
    return projects;
}

export function extractCompanies(resumeText) {
    if (!resumeText) return [];
    const companies = [];
    const lines = resumeText.split('\n');
    let inExpSection = false;

    for (const line of lines) {
        const trimmed = line.trim();
        if (/^(experience|work experience|employment history|professional experience)\b/i.test(trimmed)) {
            inExpSection = true;
            continue;
        }
        if (inExpSection && /^(projects|education|skills|certifications)\b/i.test(trimmed)) {
            inExpSection = false;
            continue;
        }

        if (inExpSection && trimmed) {
            // Match pattern: "Company Name — Role" or "Role at Company Name"
            const atMatch = trimmed.match(/at\s+([A-Z][A-Za-z0-9\s&.,]{2,30})/);
            const dashMatch = trimmed.match(/^([A-Z][A-Za-z0-9\s&.,]{2,30})\s*(?:[—–|-]|·)\s*(?:Software|Engineer|Developer|Lead|Manager)/i);
            if (atMatch) {
                const comp = atMatch[1].trim().replace(/[,.-]$/, '');
                if (!companies.includes(comp)) companies.push(comp);
            } else if (dashMatch) {
                const comp = dashMatch[1].trim().replace(/[,.-]$/, '');
                if (!companies.includes(comp)) companies.push(comp);
            }
        }
    }
    return companies;
}

export function buildResumeAwareQuestionSeeds(candidateProfile, companyPersona, roleTitle = 'Software Engineer') {
    const rawResume = typeof candidateProfile === 'string' ? candidateProfile : (candidateProfile?.candidateResume || candidateProfile?.resume || '');
    const candidateSkills = Array.isArray(candidateProfile?.skills) && candidateProfile.skills.length > 0 
        ? candidateProfile.skills 
        : extractTechStack(rawResume);
    const candidateProjects = Array.isArray(candidateProfile?.projects) && candidateProfile.projects.length > 0 
        ? candidateProfile.projects 
        : extractProjects(rawResume);
    const pastCompanies = Array.isArray(candidateProfile?.pastCompanies) && candidateProfile.pastCompanies.length > 0
        ? candidateProfile.pastCompanies
        : extractCompanies(rawResume);
    const experienceLevel = candidateProfile?.experienceLevel || 'Mid';

    const companyName = companyPersona?.companyName || companyPersona?.company || 'our team';
    const focusAreas = companyPersona?.focusAreas || companyPersona?.topFocusAreas || ['System Architecture', 'High Concurrency', 'Distributed Systems'];
    const companyTech = companyPersona?.techStack || ['Node.js', 'PostgreSQL', 'Redis', 'Kafka'];
    const realQuestions = companyPersona?.questionBank || companyPersona?.realQuestions || [];

    // Find tech overlap
    const techOverlap = candidateSkills.filter(s => 
        companyTech.some(ct => ct.toLowerCase() === s.toLowerCase()) ||
        focusAreas.some(fa => fa.toLowerCase().includes(s.toLowerCase()))
    );

    const seeds = [];

    // 1. Project Deep Dive (Anchor Questions)
    for (const project of candidateProjects) {
        const matchingTech = project.tech.filter(t => 
            techOverlap.includes(t) || companyTech.some(ct => ct.toLowerCase() === t.toLowerCase())
        );
        const anchorTech = matchingTech.length > 0 ? matchingTech.join(' and ') : (project.tech[0] || 'the stack');
        const focusTopic = focusAreas[0] || 'performance bottlenecks';

        seeds.push({
            id: `seed_proj_${seeds.length + 1}`,
            category: 'PROJECT_DEEP_DIVE',
            anchorSource: { type: 'project', name: project.name, matchedCompanyFocus: focusTopic },
            openingPrompt: `I was looking over your resume and noticed you built ${project.name} using ${anchorTech}. Could you walk me through the hardest architectural decision you had to make on that, especially regarding ${focusTopic.toLowerCase()}?`,
            drillDownPrompts: [
                `What happens to ${project.name} if throughput surges 10x in a few minutes? Where does it bottleneck first?`,
                `If you had to redesign that architecture today with what you know now, what would you do differently?`
            ],
            difficulty: experienceLevel === 'Senior' ? 'hard' : 'medium'
        });
    }

    // 2. Company Scale Comparison
    for (const company of pastCompanies) {
        const focusConstraint = focusAreas[1] || 'high availability';
        seeds.push({
            id: `seed_comp_${seeds.length + 1}`,
            category: 'SCALE_COMPARISON',
            anchorSource: { type: 'company', name: company, matchedCompanyFocus: focusConstraint },
            openingPrompt: `During your time at ${company}, how did you approach ${focusConstraint.toLowerCase()} in production, and how do you think that compares to the scale and constraints we face here at ${companyName}?`,
            drillDownPrompts: [
                `What was the most challenging production outage or data inconsistency incident you investigated there?`,
                `How did your team measure SLA and latencies across service boundaries?`
            ],
            difficulty: 'hard'
        });
    }

    // 3. Tech Stack Overlap Question
    if (techOverlap.length > 0) {
        const topTech = techOverlap.slice(0, 2).join(' and ');
        seeds.push({
            id: `seed_tech_${seeds.length + 1}`,
            category: 'TECH_STACK_OVERLAP',
            anchorSource: { type: 'skill', name: topTech, matchedCompanyFocus: focusAreas[0] || 'System Design' },
            openingPrompt: `Both your background and our systems here at ${companyName} rely heavily on ${topTech}. In your experience, what are some of the subtle pitfalls or failure modes developers run into when scaling ${topTech} under high concurrency?`,
            drillDownPrompts: [
                `How do you handle connection pooling and timeout budgets for that in production?`,
                `What observability signals do you watch first when things degrade?`
            ],
            difficulty: experienceLevel === 'Junior' ? 'medium' : 'hard'
        });
    }

    // 4. Grounded Scraped Questions
    for (const q of realQuestions.slice(0, 3)) {
        const qText = typeof q === 'string' ? q : q.question;
        if (!qText) continue;
        const matchingSkill = candidateSkills.find(s => qText.toLowerCase().includes(s.toLowerCase()));
        seeds.push({
            id: `seed_scraped_${seeds.length + 1}`,
            category: 'GROUNDED_LEETCODE_BLIND',
            anchorSource: { type: 'question_bank', name: 'Scraped Authenticity', matchedCompanyFocus: qText },
            openingPrompt: matchingSkill 
                ? `A classic problem we look at here at ${companyName} involves ${qText}. Given your experience with ${matchingSkill}, how would you approach architecting that?`
                : `${qText}`,
            drillDownPrompts: [
                `What is the Big-O time and space complexity of that approach?`,
                `How does it handle duplicate writes or network retries?`
            ],
            difficulty: 'medium'
        });
    }

    return seeds;
}

// Verification test
const sampleResume = `
EXPERIENCE:
Senior Backend Engineer at Stripe (2022 - 2024)
- Architected real-time payment reconciliation service in Node.js, Kafka, and PostgreSQL.
- Reduced p99 latency from 1.2s to 180ms using Redis caching and read replicas.

PROJECTS:
VoxCode Live Audio Simulator:
- Built real-time Web Audio and WebSocket streaming engine with Redis and Docker.
- Handled sub-300ms speech synthesis chunking.

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

const seeds = buildResumeAwareQuestionSeeds(sampleResume, sampleCompany, 'Senior Backend Engineer');
console.log('GENERATED SEEDS:');
console.log(JSON.stringify(seeds, null, 2));
