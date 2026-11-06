import { LeetCodeQuestion } from '../models/leetcodeQuestion.model.js';

/**
 * Normalizes company name for database lookup
 */
function normalizeCompanySlug(name) {
    if (!name) return '';
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Fetches company-specific LeetCode questions directly from MongoDB.
 * Supports single difficulty or 'med/hard' combinations, sorted by real-world frequency.
 */
export async function getCompanyLeetCodeQuestions(companyName, options = {}) {
    const { targetDifficulty = 'Medium', limit = 5 } = options;
    const companySlug = normalizeCompanySlug(companyName);
    if (!companySlug) return [];

    const query = {
        companySlug: new RegExp(companySlug, 'i')
    };

    if (targetDifficulty) {
        const targetLower = String(targetDifficulty).toLowerCase();
        if (targetLower === 'med/hard') {
            query.difficulty = { $in: ['Medium', 'Hard'] };
        } else if (['easy', 'medium', 'hard'].includes(targetLower)) {
            query.difficulty = targetLower.charAt(0).toUpperCase() + targetLower.slice(1);
        }
    }

    try {
        const questions = await LeetCodeQuestion.find(query)
            .sort({ frequency: -1 })
            .limit(limit)
            .lean();

        return questions.map(q => ({
            number: q.questionNumber,
            title: q.title,
            url: q.url,
            difficulty: q.difficulty,
            acceptance: q.acceptance,
            frequency: q.frequency
        }));
    } catch (err) {
        console.warn('[LeetCode MongoDB Service] Query warning:', err.message);
        return [];
    }
}

/**
 * Samples random authentic questions for recruiters who specify questions in blueprints
 */
export async function sampleCompanyQuestions(companyName, count = 2, difficulty = 'Hard') {
    const questions = await getCompanyLeetCodeQuestions(companyName, {
        targetDifficulty: difficulty,
        limit: 30
    });

    if (!questions.length) return [];
    // Shuffle and pick
    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

export default {
    getCompanyLeetCodeQuestions,
    sampleCompanyQuestions
};
