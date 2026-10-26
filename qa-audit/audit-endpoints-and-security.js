import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Override MONGODB_URI explicitly BEFORE any app code loads
const TEST_DB = 'voxcode_audit_' + Date.now();
process.env.MONGODB_URI = `mongodb://127.0.0.1:27017/${TEST_DB}`;
process.env.JWT_ACCESS_SECRET = 'audit_test_access_secret_12345';
process.env.JWT_REFRESH_SECRET = 'audit_test_refresh_secret_12345';
process.env.PORT = '0'; // random port

import mongoose from 'mongoose';
import { app } from '../backend/src/app.js';
import { Company } from '../backend/src/models/company.model.js';
import { Candidate } from '../backend/src/models/candidate.model.js';
import { Assessment } from '../backend/src/models/assessment.model.js';
import { Role } from '../backend/src/models/role.model.js';
import { InterviewSession } from '../backend/src/models/interviewSession.model.js';
import { Evaluation } from '../backend/src/models/evaluation.model.js';
import { RefreshToken } from '../backend/src/models/refreshToken.model.js';

let server;
let port;
let baseUrl;

const findings = [];
function recordFinding(category, id, severity, description, evidence) {
    findings.push({ category, id, severity, description, evidence });
    console.log(`[${severity}] [${category}] ${id}: ${description}`);
}

async function request(method, pathName, body = null, token = null, headers = {}) {
    const url = `${baseUrl}${pathName}`;
    const reqHeaders = { 'Content-Type': 'application/json', ...headers };
    if (token) reqHeaders['Authorization'] = `Bearer ${token}`;
    const options = { method, headers: reqHeaders };
    if (body !== null) options.body = typeof body === 'string' ? body : JSON.stringify(body);
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

async function runAudit() {
    console.log('Connecting to isolated local test DB:', process.env.MONGODB_URI);
    await mongoose.connect(process.env.MONGODB_URI);
    
    server = http.createServer(app);
    await new Promise((resolve) => {
        server.listen(0, '127.0.0.1', () => {
            port = server.address().port;
            baseUrl = `http://127.0.0.1:${port}`;
            console.log(`Audit test server listening on ${baseUrl}`);
            resolve();
        });
    });

    try {
        console.log('\n==================================================');
        console.log('AUDIT SECTION 1: SECURITY HEADERS & CORS');
        console.log('==================================================');

        const rootRes = await request('GET', '/health', null, null, { 'Origin': 'https://evil-attacker-site.com' });
        
        // 1. Check CORS reflection
        if (rootRes.headers['access-control-allow-origin'] === 'https://evil-attacker-site.com' && rootRes.headers['access-control-allow-credentials'] === 'true') {
            recordFinding('Security', 'SEC-CORS-01', 'Critical', 
                'Insecure CORS configuration: Reflects any untrusted Origin with credentials: true',
                `Origin: https://evil-attacker-site.com -> Access-Control-Allow-Origin: ${rootRes.headers['access-control-allow-origin']}, Access-Control-Allow-Credentials: ${rootRes.headers['access-control-allow-credentials']}`
            );
        }

        // 2. Check Security Headers (Helmet)
        const missingHeaders = [];
        if (!rootRes.headers['content-security-policy']) missingHeaders.push('Content-Security-Policy');
        if (!rootRes.headers['x-frame-options']) missingHeaders.push('X-Frame-Options');
        if (!rootRes.headers['x-content-type-options']) missingHeaders.push('X-Content-Type-Options');
        if (!rootRes.headers['strict-transport-security']) missingHeaders.push('Strict-Transport-Security');
        if (missingHeaders.length > 0) {
            recordFinding('Security', 'SEC-HDR-01', 'High',
                `Missing standard security headers (Helmet omitted): ${missingHeaders.join(', ')}`,
                `Headers returned: ${Object.keys(rootRes.headers).join(', ')}`
            );
        }

        // 3. Check 404 handler for API routes
        const missingRouteRes = await request('GET', '/api/non-existent-route-xyz');
        if (missingRouteRes.status === 404 && missingRouteRes.headers['content-type']?.includes('text/html')) {
            recordFinding('Backend', 'API-404-HTML', 'Medium',
                'Missing JSON 404 handler for API routes; returns raw Express HTML error page',
                `Status: ${missingRouteRes.status}, Content-Type: ${missingRouteRes.headers['content-type']}, Body starts with: ${String(missingRouteRes.body?.raw || '').slice(0, 60)}`
            );
        }

        console.log('\n==================================================');
        console.log('AUDIT SECTION 2: AUTH, NOSQL INJECTION & IDOR');
        console.log('==================================================');

        // Create initial test users
        const companyReg = await request('POST', '/api/auth/register', {
            name: 'AuditCorp', email: 'audit_company@test.com', password: 'Password123!', role: 'COMPANY'
        });
        const compToken = companyReg.body?.data?.accessToken;
        const compRefresh = companyReg.body?.data?.refreshToken;

        const candidate1Reg = await request('POST', '/api/auth/register', {
            name: 'Candidate One', email: 'candidate1@test.com', password: 'Password123!', role: 'CANDIDATE'
        });
        const cand1Token = candidate1Reg.body?.data?.accessToken;
        const cand1Refresh = candidate1Reg.body?.data?.refreshToken;
        const cand1Id = candidate1Reg.body?.data?._id;

        const candidate2Reg = await request('POST', '/api/auth/register', {
            name: 'Candidate Two', email: 'candidate2@test.com', password: 'Password123!', role: 'CANDIDATE'
        });
        const cand2Token = candidate2Reg.body?.data?.accessToken;

        // NoSQL Operator Injection in Login
        const nosqlLogin = await request('POST', '/api/auth/login', {
            email: { "$ne": "null" },
            password: "WrongPassword!"
        });
        if (nosqlLogin.status === 500) {
            recordFinding('Security', 'SEC-NOSQL-01', 'High',
                'NoSQL operator injection causes unhandled 500 server crash instead of 400/401',
                `POST /api/auth/login with {"email":{"$ne":"null"}} -> status: ${nosqlLogin.status}, body: ${JSON.stringify(nosqlLogin.body)}`
            );
        }

        // Case Sensitivity in Email Registration
        const duplicateCaseReg = await request('POST', '/api/auth/register', {
            name: 'Candidate One Variant', email: 'CANDIDATE1@test.com', password: 'Password123!', role: 'CANDIDATE'
        });
        if (duplicateCaseReg.status === 201 || duplicateCaseReg.status === 200) {
            recordFinding('Logic', 'AUTH-EMAIL-CASE', 'High',
                'Email uniqueness is case-sensitive: CANDIDATE1@test.com registered alongside candidate1@test.com',
                `Status: ${duplicateCaseReg.status}, Email registered twice with different casing`
            );
        }

        // Malformed ObjectId in routes (CastError -> 500 leak)
        const malformedIdRes = await request('GET', '/api/assessments/invalid-object-id-123', null, compToken);
        if (malformedIdRes.status === 500) {
            recordFinding('Backend', 'ERR-CASTER-01', 'Medium',
                'Malformed ObjectId parameter causes unhandled Mongoose CastError with 500 status instead of 400/404',
                `GET /api/assessments/invalid-object-id-123 -> status: ${malformedIdRes.status}, message: ${malformedIdRes.body?.message}`
            );
        }

        // Refresh token reuse and rotation
        const refreshRes1 = await request('POST', '/api/auth/refresh', { token: compRefresh });
        const refreshRes2 = await request('POST', '/api/auth/refresh', { token: compRefresh });
        if (refreshRes1.status === 200 && refreshRes2.status === 200) {
            recordFinding('Security', 'SEC-REFRESH-01', 'High',
                'Refresh token is never rotated upon use; same refresh token can be replayed indefinitely until expiry',
                `First refresh status: ${refreshRes1.status}, Second replay status: ${refreshRes2.status}`
            );
        }

        // Refresh token persistence without TTL
        const storedTokens = await RefreshToken.find({});
        const indexes = await RefreshToken.collection.indexes();
        const hasTtl = indexes.some(idx => idx.expireAfterSeconds !== undefined);
        if (!hasTtl) {
            recordFinding('Database', 'DB-REFRESH-TTL', 'Medium',
                'RefreshToken collection has no TTL index; expired refresh tokens accumulate in database forever',
                `RefreshToken collection indexes: ${JSON.stringify(indexes.map(i => i.name))}`
            );
        }

        console.log('\n==================================================');
        console.log('AUDIT SECTION 3: CODE SANDBOX BREAKOUT & ENV LEAK');
        console.log('==================================================');

        // Test process.env leak
        const envLeakTest = await request('POST', '/api/interview/run-code', {
            language: 'javascript',
            code: `
                const keys = Object.keys(process.env);
                console.log("ENV_KEYS_COUNT: " + keys.length);
                const hasMongo = !!process.env.MONGODB_URI;
                const hasJwt = !!process.env.JWT_ACCESS_SECRET;
                console.log("LEAK_VERIFIED: MONGO=" + hasMongo + " JWT=" + hasJwt);
            `
        }, cand1Token);

        if (envLeakTest.body?.data?.output?.includes('LEAK_VERIFIED: MONGO=true JWT=true')) {
            recordFinding('Security', 'SANDBOX-ENV-LEAK', 'Critical',
                'Code Sandbox executes directly on host and leaks full server process.env to untrusted candidate code',
                `Output: ${envLeakTest.body?.data?.output}`
            );
        }

        // Test JS wrapper variable redeclaration conflict
        const redeclareTest = await request('POST', '/api/interview/run-code', {
            language: 'javascript',
            code: `const fs = require('fs'); const input = 'my_test'; console.log('OK');`
        }, cand1Token);
        if (redeclareTest.body?.data?.output?.includes('already been declared') || redeclareTest.body?.data?.hasError) {
            recordFinding('Sandbox', 'SANDBOX-REDECLARE', 'High',
                'JS sandbox pre-injects const fs and const input, causing candidate code declaring fs or input to crash with SyntaxError',
                `Output: ${redeclareTest.body?.data?.output}`
            );
        }

        // Test Unauthenticated compute abuse on run-code
        const unauthRunCode = await request('POST', '/api/interview/run-code', {
            language: 'javascript',
            code: 'console.log("FREE_COMPUTE");'
        });
        console.log('Unauthenticated /api/interview/run-code status:', unauthRunCode.status);

        console.log('\n==================================================');
        console.log('AUDIT SECTION 4: TIME WINDOW & DURATION MATRIX');
        console.log('==================================================');

        // Create Role for Assessment Matrix
        const compDoc = await Company.findOne({ email: 'audit_company@test.com' });
        const testRole = await Role.create({
            company: compDoc._id,
            title: 'Matrix Test Engineer',
            description: 'Timing Matrix Testing'
        });

        const matrixCases = [
            { label: 'duration 0', payload: { durationMinutes: 0 } },
            { label: 'duration negative', payload: { durationMinutes: -15 } },
            { label: 'duration NaN', payload: { durationMinutes: 'not-a-number' } },
            { label: 'duration float 29.5', payload: { durationMinutes: 29.5 } },
            { label: 'duration huge 99999', payload: { durationMinutes: 99999 } },
            { label: 'opening in past, closing in past (opening < closing)', payload: {
                openingTime: new Date(Date.now() - 86400000 * 2).toISOString(),
                closingTime: new Date(Date.now() - 86400000).toISOString()
            }},
            { label: 'only closing in past', payload: {
                closingTime: new Date(Date.now() - 3600000).toISOString()
            }},
            { label: 'window shorter than duration (window 5m, duration 60m)', payload: {
                durationMinutes: 60,
                openingTime: new Date(Date.now()).toISOString(),
                closingTime: new Date(Date.now() + 300000).toISOString()
            }},
            { label: 'opening equal to closing', payload: {
                openingTime: new Date(Date.now() + 100000).toISOString(),
                closingTime: new Date(Date.now() + 100000).toISOString()
            }}
        ];

        for (const tc of matrixCases) {
            const res = await request('POST', '/api/assessments', {
                roleId: testRole._id,
                title: `Matrix Assessment: ${tc.label}`,
                skills: ['JavaScript'],
                ...tc.payload
            }, compToken);

            const storedDuration = res.body?.data?.durationMinutes;
            const storedOpen = res.body?.data?.openingTime;
            const storedClose = res.body?.data?.closingTime;
            
            console.log(`[Matrix Test] ${tc.label} -> HTTP ${res.status} | Stored: duration=${storedDuration}, open=${storedOpen}, close=${storedClose}`);
            
            if (res.status === 201) {
                if (tc.label === 'duration negative' && storedDuration < 0) {
                    recordFinding('Logic', 'MATRIX-DUR-NEG', 'High',
                        'Backend accepts and stores negative assessment duration without validation',
                        `Payload: durationMinutes: -15 -> Stored: ${storedDuration}`
                    );
                }
                if (tc.label === 'duration 0' && storedDuration === 30) {
                    recordFinding('Logic', 'MATRIX-DUR-ZERO', 'Medium',
                        'Duration of 0 silently coerces to default 30 via Number(0) || 30 without informing recruiter',
                        `Payload: durationMinutes: 0 -> Stored: ${storedDuration}`
                    );
                }
                if (tc.label.includes('past') && (storedClose && new Date(storedClose) < new Date())) {
                    recordFinding('Logic', 'MATRIX-PAST-WINDOW', 'High',
                        'Assessment created with closing time in the past without rejection',
                        `Payload closingTime: ${tc.payload.closingTime} -> HTTP 201 Created`
                    );
                }
                if (tc.label.includes('window shorter than duration')) {
                    recordFinding('Logic', 'MATRIX-WINDOW-OVERFLOW', 'High',
                        'Assessment duration (60m) accepted even when closing window is only 5 minutes',
                        `Window: 5m vs Duration: 60m -> HTTP 201 Created`
                    );
                }
            }
        }

        console.log('\n==================================================');
        console.log('AUDIT SECTION 5: PRIVATE DATA LEAK & DASHBOARD LEAK');
        console.log('==================================================');

        // Check if candidate dashboard exposes other companies' assessments
        const candDashRes = await request('GET', '/api/candidate/dashboard', null, cand1Token);
        const exposed = candDashRes.body?.data?.availableAssessments || [];
        console.log(`Candidate Dashboard exposed ${exposed.length} available assessments`);
        if (exposed.some(a => a.assessmentCode)) {
            recordFinding('Security', 'DATA-LEAK-DASH-CODES', 'High',
                'Candidate dashboard leaks private assessment codes of other companies to arbitrary candidates',
                `Exposed assessment codes: ${exposed.map(a => a.assessmentCode).join(', ')}`
            );
        }

    } finally {
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
        server.close();
        console.log('\nTest DB dropped and server closed.');
    }

    console.log('\n==================================================');
    console.log(`AUDIT COMPLETE: ${findings.length} FINDINGS RECORDED`);
    console.log('==================================================');
}

runAudit().catch(err => {
    console.error('Audit script fatal error:', err);
    process.exit(1);
});
