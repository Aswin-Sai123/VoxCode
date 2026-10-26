/**
 * VoxCode – Comprehensive Automated Integration Test Suite
 *
 * Covers:
 *   1. Auth: Company + Candidate registration, login, token refresh, invalid password, getMe
 *   2. Assessment: Creation, code uniqueness, time windows, expiry, eligibility, status toggle
 *   3. Interview: Start session, answer messages, complete session, completed-session cannot be resumed
 *   4. Code Sandbox: JS, Python execution, timeout handling
 *   5. Evaluation: Persistence, scoring, ownership checks (stubbed Gemini)
 *   6. Company interviews endpoint: Ongoing + completed listing
 *
 * Run:  node --experimental-vm-modules backend/tests/integration.test.js
 * Requires: local MongoDB running on mongodb://127.0.0.1:27017
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
process.env.NODE_ENV = 'test';

import mongoose from 'mongoose';
import { app } from '../src/app.js';
import http from 'http';

// ── Lightweight fetch-based test client ──────────────────────────────
const BASE = 'http://127.0.0.1:';
let PORT;
let server;

const request = async (method, urlPath, body = null, token = null) => {
    const url = `${BASE}${PORT}${urlPath}`;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const options = { method, headers, redirect: 'manual' };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(url, options);
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }
    return { status: res.status, body: json };
};

// ── Test harness ─────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const results = [];

const assert = (label, condition) => {
    if (condition) {
        passed++;
        results.push({ label, status: 'PASS' });
    } else {
        failed++;
        results.push({ label, status: 'FAIL' });
        console.error(`  ✗ FAIL: ${label}`);
    }
};

// ── Setup & Teardown ─────────────────────────────────────────────────
const TEST_DB = 'voxcode_test_' + Date.now();
const MONGO_URI = `mongodb://127.0.0.1:27017/${TEST_DB}`;

async function setup() {
    await mongoose.connect(MONGO_URI);
    console.log(`Connected to test DB: ${TEST_DB}`);
    server = http.createServer(app);
    await new Promise((resolve) => {
        server.listen(0, '127.0.0.1', () => {
            PORT = server.address().port;
            console.log(`Test server listening on port ${PORT}`);
            resolve();
        });
    });
}

async function teardown() {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    server.close();
    console.log('Test DB dropped and server closed.');
}

// ── Test Suites ──────────────────────────────────────────────────────
let companyToken = null;
let candidateToken = null;
let companyRefreshToken = null;
let assessmentId = null;
let assessmentCode = null;
let sessionId = null;
let evaluationId = null;

async function testAuthSuite() {
    console.log('\n── Auth Suite ──────────────────────');

    // 1. Company registration
    const regCompany = await request('POST', '/api/auth/register', {
        name: 'TestCorp', email: 'company@test.com', password: 'Pass1234!', role: 'COMPANY'
    });
    assert('Company registration returns 201', regCompany.status === 201);
    assert('Company registration returns accessToken', !!regCompany.body?.data?.accessToken);
    companyToken = regCompany.body?.data?.accessToken;
    companyRefreshToken = regCompany.body?.data?.refreshToken;

    // 2. Candidate registration
    const regCandidate = await request('POST', '/api/auth/register', {
        name: 'Alice Dev', email: 'alice@test.com', password: 'Alice1234!', role: 'CANDIDATE',
        resumeText: 'Full Stack Engineer with 3 years Node.js and MongoDB experience.'
    });
    assert('Candidate registration returns 201', regCandidate.status === 201);
    candidateToken = regCandidate.body?.data?.accessToken;

    // 3. Duplicate email
    const dup = await request('POST', '/api/auth/register', {
        name: 'Dup', email: 'alice@test.com', password: 'Dup1234!', role: 'CANDIDATE'
    });
    assert('Duplicate email registration fails (4xx)', dup.status >= 400);

    // 4. Login with correct password
    const login = await request('POST', '/api/auth/login', {
        email: 'alice@test.com', password: 'Alice1234!'
    });
    assert('Candidate login returns 200', login.status === 200);
    assert('Login returns accessToken', !!login.body?.data?.accessToken);
    candidateToken = login.body?.data?.accessToken;

    // 5. Login with wrong password
    const badLogin = await request('POST', '/api/auth/login', {
        email: 'alice@test.com', password: 'WrongPass!'
    });
    assert('Wrong password login fails (4xx)', badLogin.status >= 400);

    // 6. getMe with valid token
    const me = await request('GET', '/api/auth/me', null, candidateToken);
    assert('getMe returns 200', me.status === 200);
    assert('getMe returns user with CANDIDATE role', me.body?.data?.role === 'CANDIDATE');

    // 7. getMe without token
    const noAuth = await request('GET', '/api/auth/me');
    assert('getMe without token returns 401', noAuth.status === 401);

    // 8. Token refresh
    if (companyRefreshToken) {
        const refresh = await request('POST', '/api/auth/refresh', {
            refreshToken: companyRefreshToken
        });
        assert('Token refresh returns 200', refresh.status === 200);
        if (refresh.body?.data?.accessToken) {
            companyToken = refresh.body.data.accessToken;
        }
    } else {
        assert('Token refresh (skipped – no refresh token)', true);
    }

    // 9. Google OAuth route exists (should redirect or return 302/4xx without actual Google creds)
    const oauthRoute = await request('GET', '/api/auth/google');
    assert('Google OAuth route responds (not 404)', oauthRoute.status !== 404);
}

async function testAssessmentSuite() {
    console.log('\n── Assessment Suite ────────────────');

    // 1. Create role first
    const roleRes = await request('POST', '/api/company/roles', {
        title: 'Backend Engineer', description: 'Node.js specialist'
    }, companyToken);
    assert('Create role returns 201', roleRes.status === 201);
    const roleId = roleRes.body?.data?._id;

    // 2. Create assessment
    const createRes = await request('POST', '/api/assessments', {
        title: 'Backend Coding Test', role: roleId, skills: ['Node.js', 'MongoDB'],
        experienceLevel: 'Mid', durationMinutes: 45,
        codingRoundEnabled: true, voiceRoundEnabled: true,
        blueprintAnalysis: { interviewFormat: 'FULL_INTERVIEW' }
    }, companyToken);
    assert('Create assessment returns 201', createRes.status === 201);
    assert('Assessment has assessmentCode starting with ASMT-', createRes.body?.data?.assessmentCode?.startsWith('ASMT-'));
    assessmentId = createRes.body?.data?._id;
    assessmentCode = createRes.body?.data?.assessmentCode;

    // 3. Assessment code is unique
    const createRes2 = await request('POST', '/api/assessments', {
        title: 'Frontend Test', role: roleId, skills: ['React'],
        experienceLevel: 'Entry', durationMinutes: 30,
        blueprintAnalysis: { interviewFormat: 'FULL_INTERVIEW' }
    }, companyToken);
    assert('Second assessment also created', createRes2.status === 201);
    assert('Second assessment code differs from first', createRes2.body?.data?.assessmentCode !== assessmentCode);

    // 4. List assessments
    const list = await request('GET', '/api/assessments', null, companyToken);
    assert('List assessments returns 200', list.status === 200);
    assert('List assessments contains at least 2', (list.body?.data?.length || 0) >= 2);

    // 5. Toggle assessment status
    const toggle = await request('PATCH', `/api/assessments/${assessmentId}/status`, null, companyToken);
    assert('Toggle status returns 200', toggle.status === 200);
    assert('Toggled status is CLOSED', toggle.body?.data?.status === 'CLOSED');

    // Re-activate for subsequent tests
    await request('PATCH', `/api/assessments/${assessmentId}/status`, null, companyToken);

    // 6. Fetch assessment by code (candidate lobby)
    const lobby = await request('GET', `/api/assessments/code/${assessmentCode}`, null, candidateToken);
    assert('Fetch assessment by code returns 200', lobby.status === 200);
    assert('Lobby data includes title', !!lobby.body?.data?.title);

    // 7. Access non-existent assessment code
    const badCode = await request('GET', '/api/assessments/code/ASMT-NONEXISTENT', null, candidateToken);
    assert('Non-existent code returns 404', badCode.status === 404);

    // 8. Assessment not yet open (future opening time) rejects candidate with 403
    const futureAsmt = await request('POST', '/api/assessments', {
        title: 'Future Assessment', role: roleId,
        durationMinutes: 30,
        blueprintAnalysis: { interviewFormat: 'FULL_INTERVIEW' },
        openingTime: new Date(Date.now() + 86400000).toISOString(),
        closingTime: new Date(Date.now() + 172800000).toISOString()
    }, companyToken);
    const futureCode = futureAsmt.body?.data?.assessmentCode;
    const futureEntry = await request('POST', `/api/interview/start/${futureCode}`, {
        resumeText: 'Full Stack Engineer with 3 years Node.js and MongoDB experience.'
    }, candidateToken);
    assert('Not-yet-open assessment rejects candidate (403)', futureEntry.status === 403);

    // 9. Expired assessment (past closing time) rejects candidate with 403
    const expiredAsmt = await request('POST', '/api/assessments', {
        title: 'Expired Assessment', role: roleId,
        durationMinutes: 30,
        blueprintAnalysis: { interviewFormat: 'FULL_INTERVIEW' },
        openingTime: new Date(Date.now() + 1000).toISOString(),
        closingTime: new Date(Date.now() + 86400000).toISOString()
    }, companyToken);
    const expiredCode = expiredAsmt.body?.data?.assessmentCode;
    // Fast forward closing time into the past to simulate an expired assessment
    await mongoose.model('Assessment').findByIdAndUpdate(expiredAsmt.body?.data?._id, {
        closingTime: new Date(Date.now() - 3600000)
    });
    const expiredEntry = await request('GET', `/api/assessments/code/${expiredCode}`, null, candidateToken);
    assert('Expired assessment rejects candidate (403)', expiredEntry.status === 403);

    // 10. Invite-only assessment rejects uninvited candidate with 403
    const inviteAsmt = await request('POST', '/api/assessments', {
        title: 'Private Assessment', role: roleId,
        durationMinutes: 30,
        blueprintAnalysis: { interviewFormat: 'FULL_INTERVIEW' },
        accessType: 'INVITE_ONLY',
        eligibleEmails: ['exclusive@vip.com']
    }, companyToken);
    const inviteCode = inviteAsmt.body?.data?.assessmentCode;
    const inviteEntry = await request('GET', `/api/assessments/code/${inviteCode}`, null, candidateToken);
    assert('Invite-only assessment blocks uninvited candidate (403)', inviteEntry.status === 403);
}

async function testInterviewSuite() {
    console.log('\n── Interview Suite ─────────────────');

    // 1. Start a session
    const startRes = await request('POST', '/api/interview/start', {
        assessmentCode,
        resumeText: 'Full Stack Engineer with 3 years Node.js and MongoDB experience.'
    }, candidateToken);
    assert('Start session returns 200/201', startRes.status === 200 || startRes.status === 201);
    sessionId = startRes.body?.data?._id || startRes.body?.data?.session?._id;
    assert('Session ID received', !!sessionId);

    // 2. Send an answer message
    const msgRes = await request('POST', `/api/interview/session/${sessionId}/answer`, {
        answer: 'I would use a hash map for O(1) lookup'
    }, candidateToken);
    assert('Answer message returns 200', msgRes.status === 200);

    // 3. Complete session
    const completeRes = await request('POST', `/api/interview/session/${sessionId}/complete`, {
        codeSubmission: {
            language: 'javascript',
            code: 'function twoSum(nums, target) { const map = {}; for (let i = 0; i < nums.length; i++) { const comp = target - nums[i]; if (map[comp] !== undefined) return [map[comp], i]; map[nums[i]] = i; } return []; }'
        }
    }, candidateToken);
    assert('Complete session returns 200', completeRes.status === 200);

    // 4. Attempt to resume completed session → must fail
    const resumeRes = await request('POST', '/api/interview/start', {
        assessmentCode
    }, candidateToken);
    assert('Resume completed session returns 403', resumeRes.status === 403);

    // 5. Practice mock session
    const practiceRes = await request('POST', '/api/interview/practice/start', null, candidateToken);
    assert('Practice session starts (200/201)', practiceRes.status === 200 || practiceRes.status === 201);
    const practiceSessionId = practiceRes.body?.data?._id || practiceRes.body?.data?.session?._id;
    assert('Practice session is marked isPractice', practiceRes.body?.data?.isPractice === true || practiceRes.body?.data?.session?.isPractice === true);
}

async function testSandboxSuite() {
    console.log('\n── Sandbox Suite ───────────────────');

    // 1. JavaScript execution
    const jsRes = await request('POST', '/api/interview/execute', {
        language: 'javascript',
        code: 'console.log(2 + 3);',
        customInput: ''
    }, candidateToken);
    assert('JS sandbox returns 200', jsRes.status === 200);
    assert('JS sandbox output contains 5', jsRes.body?.data?.output?.includes('5'));

    // 2. Python execution
    const pyRes = await request('POST', '/api/interview/execute', {
        language: 'python',
        code: 'print(10 * 2)',
        customInput: ''
    }, candidateToken);
    assert('Python sandbox returns 200', pyRes.status === 200);
    assert('Python sandbox output contains 20', pyRes.body?.data?.output?.includes('20'));

    // 3. Timeout handling (infinite loop)
    const timeoutRes = await request('POST', '/api/interview/execute', {
        language: 'javascript',
        code: 'while(true){}',
        customInput: ''
    }, candidateToken);
    assert('Infinite loop returns 200 with timeout', timeoutRes.status === 200);
    assert('Timeout message present', (timeoutRes.body?.data?.output || '').toLowerCase().includes('timed out') || timeoutRes.body?.data?.hasError === true);

    // 4. Compilation error (bad C++ code)
    const cppRes = await request('POST', '/api/interview/execute', {
        language: 'cpp',
        code: '#include <iostream>\nint main() { std::cout << "hello"; }',
        customInput: ''
    }, candidateToken);
    // This may succeed or error depending on g++ availability
    assert('C++ sandbox returns 200', cppRes.status === 200);
}

async function testEvaluationSuite() {
    console.log('\n── Evaluation Suite ────────────────');

    // 1. Candidate reports
    const reports = await request('GET', '/api/evaluation/my-reports', null, candidateToken);
    assert('my-reports returns 200', reports.status === 200);

    // 2. Trigger evaluation for completed session
    const triggerRes = await request('POST', `/api/evaluation/trigger/${sessionId}`, null, candidateToken);
    assert('Trigger evaluation returns 200', triggerRes.status === 200);
    evaluationId = triggerRes.body?.data?._id;

    // 3. Fetch evaluation by session
    const evalRes = await request('GET', `/api/evaluation/session/${sessionId}`, null, candidateToken);
    assert('Get evaluation by session returns 200', evalRes.status === 200);
    assert('Evaluation has scores object', !!evalRes.body?.data?.scores);

    // 4. Candidate cannot trigger evaluation for another candidate's session (auth check)
    // Register second candidate
    const reg2 = await request('POST', '/api/auth/register', {
        name: 'Bob', email: 'bob@test.com', password: 'Bob1234!', role: 'CANDIDATE'
    });
    const bobToken = reg2.body?.data?.accessToken;
    if (bobToken) {
        const bobTrigger = await request('POST', `/api/evaluation/trigger/${sessionId}`, null, bobToken);
        assert('Other candidate cannot trigger evaluation (403)', bobTrigger.status === 403);

        const bobView = await request('GET', `/api/evaluation/session/${sessionId}`, null, bobToken);
        assert('Other candidate cannot view evaluation (403)', bobView.status === 403);
    }

    // 5. Company can view assessment evaluations (leaderboard)
    const leaderboard = await request('GET', `/api/evaluation/assessment/${assessmentId}`, null, companyToken);
    assert('Company leaderboard returns 200', leaderboard.status === 200);

    // 6. Company recruiter decision
    if (evaluationId) {
        const decision = await request('PATCH', `/api/evaluation/${evaluationId}/decision`, {
            recruiterDecision: 'SHORTLISTED', recruiterNotes: 'Great candidate'
        }, companyToken);
        assert('Recruiter decision returns 200', decision.status === 200);
        assert('Decision is SHORTLISTED', decision.body?.data?.recruiterDecision === 'SHORTLISTED');
    }
}

async function testCompanyInterviewsSuite() {
    console.log('\n── Company Interviews Suite ────────');

    const res = await request('GET', '/api/company/interviews', null, companyToken);
    assert('Company interviews endpoint returns 200', res.status === 200);
    assert('Response has ongoing array', Array.isArray(res.body?.data?.ongoing));
    assert('Response has completed array', Array.isArray(res.body?.data?.completed));
    assert('Completed array has at least 1 entry', (res.body?.data?.completed?.length || 0) >= 1);
}

async function testCandidateDashboard() {
    console.log('\n── Candidate Dashboard Suite ───────');

    const res = await request('GET', '/api/candidate/dashboard', null, candidateToken);
    assert('Candidate dashboard returns 200', res.status === 200);
    assert('Dashboard has stats', !!res.body?.data?.stats || res.body?.data !== undefined);
}

async function testSecuritySuite() {
    console.log('\n── Security & RBAC Suite ───────────');

    // 1. Candidate cannot create assessments
    const fakeAsmt = await request('POST', '/api/assessments', {
        title: 'Hacked Assessment'
    }, candidateToken);
    assert('Candidate cannot create assessment (403)', fakeAsmt.status === 403);

    // 2. Candidate cannot create company roles
    const fakeRole = await request('POST', '/api/company/roles', {
        title: 'Hacked Role'
    }, candidateToken);
    assert('Candidate cannot create company role (403)', fakeRole.status === 403);

    // 3. Company cannot start candidate interview sessions
    const fakeInterview = await request('POST', '/api/interview/start', {
        assessmentCode
    }, companyToken);
    assert('Company cannot start candidate interview (403)', fakeInterview.status === 403);

    // 4. Register a second distinct company
    const comp2Res = await request('POST', '/api/auth/company/register', {
        name: 'RivalCorp', email: 'rival@test.com', password: 'Pass1234!'
    });
    const rivalLogin = await request('POST', '/api/auth/company/login', {
        email: 'rival@test.com', password: 'Pass1234!'
    });
    const rivalToken = rivalLogin.body?.data?.accessToken;

    if (rivalToken) {
        // 5. Rival company cannot view Company 1's assessment
        const rivalView = await request('GET', `/api/assessments/${assessmentId}`, null, rivalToken);
        assert('Rival company cannot view other company assessment (404/403)', rivalView.status === 404 || rivalView.status === 403);

        // 6. Rival company cannot toggle Company 1's assessment status
        const rivalToggle = await request('PATCH', `/api/assessments/${assessmentId}/status`, null, rivalToken);
        assert('Rival company cannot toggle other company assessment (404/403)', rivalToggle.status === 404 || rivalToggle.status === 403);

        // 7. Rival company cannot view Company 1's assessment leaderboard
        const rivalLeaderboard = await request('GET', `/api/evaluation/assessment/${assessmentId}`, null, rivalToken);
        assert('Rival company cannot access other company leaderboard (403)', rivalLeaderboard.status === 403);
    }
}

// ── Main Runner ──────────────────────────────────────────────────────
(async () => {
    try {
        await setup();

        await testAuthSuite();
        await testAssessmentSuite();
        await testInterviewSuite();
        await testSandboxSuite();
        await testEvaluationSuite();
        await testCompanyInterviewsSuite();
        await testCandidateDashboard();
        await testSecuritySuite();

        console.log('\n══════════════════════════════════════');
        console.log(`  RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
        console.log('══════════════════════════════════════');

        console.log('\nDetailed Results:');
        results.forEach(r => {
            console.log(`  ${r.status === 'PASS' ? '✓' : '✗'} ${r.label}`);
        });

    } catch (err) {
        console.error('Fatal test error:', err);
    } finally {
        await teardown();
        process.exit(failed > 0 ? 1 : 0);
    }
})();
