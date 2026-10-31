import { extractTechStack } from './test_resume_seeds.js';

/**
 * Enhanced project extraction: distinguish project title from bullet points
 */
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
            const isBullet = /^[-*•]/.test(trimmed) || /^(built|designed|implemented|architected|developed|created|managed|handled)\b/i.test(trimmed);
            
            // If it's not a bullet and ends with a colon, or is a short title line
            if (!isBullet && (trimmed.endsWith(':') || trimmed.length < 50)) {
                if (currentProject) projects.push(currentProject);
                const name = trimmed.replace(/[:|–—-].*$/, '').replace(/^[-*•]\s*/, '').trim();
                currentProject = {
                    name,
                    tech: [],
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
