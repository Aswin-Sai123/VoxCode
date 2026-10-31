import fs from 'fs';
import path from 'path';
import readXlsxFile from 'read-excel-file/node';

const DATASET_DIR = path.resolve('backend/data/leetcode/leetcode-companywise-interview-questions');

/**
 * Normalizes company name for directory lookup (e.g., 'Google LLC' -> 'google')
 */
function normalizeCompanyName(name) {
    if (!name) return '';
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Finds matching company folder in the 654-company dataset
 */
function findCompanyDirectory(companyName) {
    if (!fs.existsSync(DATASET_DIR)) return null;
    const cleanTarget = normalizeCompanyName(companyName);
    const dirs = fs.readdirSync(DATASET_DIR);

    // Exact or direct slug match
    for (const dir of dirs) {
        const cleanDir = normalizeCompanyName(dir);
        if (cleanDir === cleanTarget || cleanTarget.includes(cleanDir) || cleanDir.includes(cleanTarget)) {
            return path.join(DATASET_DIR, dir);
        }
    }
    return null;
}

/**
 * Loads and filters LeetCode questions for a specific company by difficulty and frequency
 */
export async function getCompanyLeetCodeQuestions(companyName, options = {}) {
    const { targetDifficulty = 'Medium', minFrequency = 0 } = options;
    const companyDir = findCompanyDirectory(companyName);
    if (!companyDir) return [];

    const files = fs.readdirSync(companyDir).filter(f => f.endsWith('.xlsx'));
    if (!files.length) return [];

    // Prefer file with 'all' or first xlsx
    const targetFile = files.find(f => f.toLowerCase().includes('all')) || files[0];
    const filePath = path.join(companyDir, targetFile);

    try {
        const sheets = await readXlsxFile(filePath, { allSheets: true });
        if (!sheets || !sheets.length || !sheets[0].data) return [];
        const rows = sheets[0].data;

        const results = [];
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const title = row[3];
            const diff = row[4];
            const url = row[2];
            const freq = row[6] || 0;

            if (!title) continue;

            if (targetDifficulty) {
                const diffLower = String(diff).toLowerCase();
                const targetLower = String(targetDifficulty).toLowerCase();
                if (targetLower === 'medium' && diffLower !== 'medium') continue;
                if (targetLower === 'hard' && diffLower !== 'hard') continue;
                if (targetLower === 'easy' && diffLower !== 'easy') continue;
                if (targetLower === 'med/hard' && diffLower !== 'medium' && diffLower !== 'hard') continue;
            }

            if (freq < minFrequency) continue;

            results.push({
                number: row[1],
                title,
                url,
                difficulty: diff,
                acceptance: row[5],
                frequency: freq
            });
        }

        // Sort by frequency descending
        results.sort((a, b) => b.frequency - a.frequency);
        return results;
    } catch (err) {
        console.warn(`[LeetCode Dataset] Error parsing ${filePath}:`, err.message);
        return [];
    }
}

export default {
    getCompanyLeetCodeQuestions,
    findCompanyDirectory
};
