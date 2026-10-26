import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_DB = 'voxcode_audit_races_' + Date.now();
process.env.MONGODB_URI = `mongodb://127.0.0.1:27017/${TEST_DB}`;
process.env.JWT_ACCESS_SECRET = 'audit_test_access_secret_12345';
process.env.JWT_REFRESH_SECRET = 'audit_test_refresh_secret_12345';
process.env.PORT = '0';

import mongoose from 'mongoose';
import { app } from '../backend/src/app.js';
import { Company } from '../backend/src/models/company.model.js';
import { Candidate } from '../backend/src/models/candidate.model.js';
import { Assessment } from '../backend/src/models/assessment.model.js';
import { Role } from '../backend/src/models/role.model.js';
import { InterviewSession } from '../backend/src/models/interviewSession.model.js';
import { Evaluation } from '../backend/src/models/evaluation.model.js';
import { runTestCases } from '../backend/src/services/evaluation.service.js';

let server, port, baseUrl;
const findings = [];

function recordFinding(category, id, severity, description, evidence) {
    findings.push({ category, id, severity, description, evidence });
    console.log(`[${severity}] [${category}] ${id}: ${description}`);
}

async function request(method, pathName, body = null, token = null) {
    const url = `${baseUrl}${pathName}`;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const options = { method, headers };
    if (body !== null) options.body = JSON.stringify(body);
    try {
        const res = await fetch(url, options);
        const text = await res.text();
        let json = null;
        try { json = JSON.parse(text); } catch { json = { raw: text }; }
        return { status: res.status, headers: Object.fromEntries(res.headers.entries()), body: json };
    } catch (err) {
        return { status: 0, error: err.message };
    }
}

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    server = http.createServer(app);
    await new Promise(resolve => server.listen(0, '127.0.0.1', () => {
        port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
    }));

    try {
        console.log('\n==================================================');
        console.log('AUDIT SECTION 6: RACE CONDITIONS & DUPLICATES');
        console.log('==================================================');

        // Setup users
        const comp = await Company.create({
            name: 'RaceCorp',
            email: 'race_comp@test.com',
            password: 'Password123!',
            role: 'COMPANY'
        });
        const role = await Role.create({
            company: comp._id,
            title: 'Staff Platform Engineer',
            description: 'Concurrency Testing'
        });
        const assessment = await Assessment.create({
            company: comp._id,
            role: role._id,
            title: 'Concurrency Benchmark',
            skills: ['Concurrency', 'Distributed Systems'],
            assessmentCode: 'ASMT-RACE-TEST01',
            status: 'ACTIVE',
            accessType: 'PUBLIC',
            durationMinutes: 30
        });

        const cand = await Candidate.create({
            name: 'Race Candidate',
            email: 'race_cand@test.com',
            password: 'Password123!',
            role: 'CANDIDATE',
            resumeText: 'Experience in high throughput distributed systems.'
        });

        // Login candidate
        const candLogin = await request('POST', '/api/auth/candidate/login', {
            email: 'race_cand@test.com', password: 'Password123!'
        });
        const candToken = candLogin.body.data.accessToken;

        // 1. Race: Concurrent startSession requests
        const [startRes1, startRes2] = await Promise.all([
            request('POST', `/api/interview/start/ASMT-RACE-TEST01`, { resumeText: 'Resume text here' }, candToken),
            request('POST', `/api/interview/start/ASMT-RACE-TEST01`, { resumeText: 'Resume text here' }, candToken)
        ]);

        const inProgressSessions = await InterviewSession.find({
            candidate: cand._id,
            assessment: assessment._id,
            status: 'IN_PROGRESS'
        });

        console.log(`Concurrent startSession results: HTTP ${startRes1.status} and HTTP ${startRes2.status}. Total IN_PROGRESS sessions in DB: ${inProgressSessions.length}`);
        if (inProgressSessions.length > 1) {
            recordFinding('Race', 'RACE-START-SESSION', 'High',
                'Parallel startSession requests create duplicate IN_PROGRESS sessions for the same candidate and assessment',
                `DB contains ${inProgressSessions.length} concurrent IN_PROGRESS sessions: ${inProgressSessions.map(s => s._id).join(', ')}`
            );
        }

        const activeSessionId = inProgressSessions[0]._id;

        // Complete session
        await InterviewSession.findByIdAndUpdate(activeSessionId, { status: 'COMPLETED', stage: 'COMPLETED' });

        // 2. Race: Concurrent triggerEvaluation requests
        const [evalRes1, evalRes2] = await Promise.all([
            request('POST', `/api/evaluation/trigger/${activeSessionId}`, {}, candToken),
            request('POST', `/api/evaluation/trigger/${activeSessionId}`, {}, candToken)
        ]);

        const dbEvals = await Evaluation.find({ session: activeSessionId });
        console.log(`Concurrent triggerEvaluation: HTTP ${evalRes1.status} and HTTP ${evalRes2.status}. Total evaluations for session: ${dbEvals.length}`);
        if (dbEvals.length > 1) {
            recordFinding('Race', 'RACE-EVAL-DUPLICATE', 'High',
                'No unique index on Evaluation.session allows concurrent triggers to insert duplicate evaluations for the same session',
                `DB contains ${dbEvals.length} evaluations for sessionId ${activeSessionId}: ${dbEvals.map(e => e._id).join(', ')}`
            );
        }

        console.log('\n==================================================');
        console.log('AUDIT SECTION 7: TEST RUNNER FLAWS & SUBSTRING PASS');
        console.log('==================================================');

        // Test 1: Substring pass bug (expected '1', actual output '10')
        // Candidate writes code that outputs '10', but expected is '1'
        const falsePositiveTestCases = [{ input: 'x', expectedOutput: '1' }];
        const wrongCode = `function solution() { return 10; }`;
        const testCaseResults = await runTestCases('javascript', wrongCode, falsePositiveTestCases);

        console.log('Test case evaluation result for wrong answer (output=10, expected=1):', testCaseResults[0]);
        if (testCaseResults[0]?.passed === true) {
            recordFinding('AI/Evaluation', 'RUNNER-SUBSTRING-PASS', 'High',
                'Test-case runner uses cleanActual.includes(cleanExpected), causing wrong outputs like "10" to falsely pass tests expecting "1"',
                `Expected: "1", Actual: "${testCaseResults[0]?.actualOutput}", Passed: ${testCaseResults[0]?.passed}`
            );
        }

        // Test 2: Auto-pass on syntax crash in Python / static analysis fallback
        const crashingPython = `def solution(x):\n  raise Exception("Catastrophic error")`;
        const pyResults = await runTestCases('python', crashingPython, [{ input: '5', expectedOutput: '25' }]);
        console.log('Crashing Python test case result:', pyResults[0]);
        if (pyResults[0]?.passed === true) {
            recordFinding('AI/Evaluation', 'RUNNER-CRASH-AUTOPASS', 'High',
                'Crashing test case execution in evaluation runner falls back to auto-pass with fake "Evaluated via static analysis"',
                `Output: "${pyResults[0]?.actualOutput}", Passed: ${pyResults[0]?.passed}`
            );
        }

        console.log('\n==================================================');
        console.log('AUDIT SECTION 8: ROUTE ALIASES & PARITY');
        console.log('==================================================');

        // Check /join/:code vs /code/:code
        const alias1 = await request('GET', `/api/assessments/join/ASMT-RACE-TEST01`, null, candToken);
        const alias2 = await request('GET', `/api/assessments/code/ASMT-RACE-TEST01`, null, candToken);
        console.log(`/api/assessments/join status: ${alias1.status}, /api/assessments/code status: ${alias2.status}`);

        // Check /execute vs /run-code
        const execRes = await request('POST', '/api/interview/execute', { language: 'javascript', code: 'console.log("EXEC");' }, candToken);
        const runRes = await request('POST', '/api/interview/run-code', { language: 'javascript', code: 'console.log("RUN");' }, candToken);
        console.log(`/api/interview/execute status: ${execRes.status}, /api/interview/run-code status: ${runRes.status}`);

        // Check /candidate/resume/upload unauthenticated
        const unauthResume = await request('POST', '/api/candidate/resume/upload', { resumeText: 'Leaked resume text' });
        console.log('Unauthenticated /api/candidate/resume/upload status:', unauthResume.status, unauthResume.body?.message);
        if (unauthResume.status === 200 || unauthResume.status === 201) {
            recordFinding('Security', 'UNAUTH-RESUME-UPLOAD', 'Medium',
                '/api/candidate/resume/upload allows unauthenticated requests due to optionalAuth() without validating user presence',
                `Status: ${unauthResume.status}, Response: ${JSON.stringify(unauthResume.body)}`
            );
        }

    } finally {
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
        server.close();
    }

    console.log('\n==================================================');
    console.log(`RACES & EVAL AUDIT COMPLETE: ${findings.length} FINDINGS`);
    console.log('==================================================');
}

run().catch(err => {
    console.error('Fatal in races & eval audit:', err);
    process.exit(1);
});
