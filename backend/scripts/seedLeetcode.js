import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import readXlsxFile from 'read-excel-file/node';
import { LeetCodeQuestion } from '../src/models/leetcodeQuestion.model.js';

dotenv.config();

const DATASET_DIR = path.resolve('data/leetcode/leetcode-companywise-interview-questions');

async function seedLeetCodeQuestions() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error('MONGODB_URI not found in environment');
        process.exit(1);
    }

    if (!fs.existsSync(DATASET_DIR)) {
        console.error('Dataset folder not found at', DATASET_DIR);
        process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB. Scanning company folders...');

    const dirs = fs.readdirSync(DATASET_DIR);
    console.log(`Found ${dirs.length} company folders.`);

    let totalSaved = 0;
    const batchSize = 1000;
    let buffer = [];

    for (let dIdx = 0; dIdx < dirs.length; dIdx++) {
        const dir = dirs[dIdx];
        const fullDir = path.join(DATASET_DIR, dir);
        if (!fs.statSync(fullDir).isDirectory()) continue;

        const files = fs.readdirSync(fullDir).filter(f => f.endsWith('.xlsx'));
        if (!files.length) continue;

        const targetFile = files.find(f => f.toLowerCase().includes('all')) || files[0];
        const filePath = path.join(fullDir, targetFile);

        const companySlug = dir.toLowerCase().replace(/[^a-z0-9]/g, '');
        const companyName = dir.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

        try {
            const sheets = await readXlsxFile(filePath, { allSheets: true });
            if (!sheets || !sheets.length || !sheets[0].data) continue;
            const rows = sheets[0].data;

            // Header: Done, #, URL, Title, Difficulty, Acceptance %, Frequency %
            for (let i = 1; i < rows.length; i++) {
                const r = rows[i];
                const questionNumber = Number(r[1]);
                const url = r[2];
                const title = r[3];
                const difficulty = r[4];
                const acceptance = Number(r[5]) || 0;
                const frequency = Number(r[6]) || 0;

                if (!title || !['Easy', 'Medium', 'Hard'].includes(difficulty)) continue;

                buffer.push({
                    companySlug,
                    companyName,
                    questionNumber,
                    title,
                    url,
                    difficulty,
                    acceptance,
                    frequency
                });

                if (buffer.length >= batchSize) {
                    await LeetCodeQuestion.insertMany(buffer);
                    totalSaved += buffer.length;
                    buffer = [];
                    process.stdout.write(`\rSaved ${totalSaved} questions across companies...`);
                }
            }
        } catch (fileErr) {
            // skip corrupted or invalid xlsx
        }
    }

    if (buffer.length > 0) {
        await LeetCodeQuestion.insertMany(buffer);
        totalSaved += buffer.length;
    }

    console.log(`\nSuccessfully seeded ${totalSaved} questions into MongoDB!`);
    await mongoose.disconnect();
    process.exit(0);
}

seedLeetCodeQuestions().catch(err => {
    console.error('Seeding error:', err);
    process.exit(1);
});

