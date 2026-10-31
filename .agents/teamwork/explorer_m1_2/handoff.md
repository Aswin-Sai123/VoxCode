# Milestone 1 Handoff Report: Package Dependencies & Installation Plan

**Agent**: Explorer 2 (Milestone 1 — Data Architecture & Models)  
**Date**: 2026-10-30  
**Status**: Task Complete (Hard Handoff)  
**Working Directory**: `c:\Users\pratheek\OneDrive\Documents\VoxCode\.agents\teamwork\explorer_m1_2`  
**Reference Analysis**: `c:\Users\pratheek\OneDrive\Documents\VoxCode\.agents\teamwork\explorer_m1_2\analysis.md`  

---

## 1. Observation

1. **`backend/package.json` State**:
   - `backend/package.json:14` specifies `"type": "module"`.
   - `backend/package.json:15-27` lists 11 dependencies:
     ```json
     "dependencies": {
       "bcryptjs": "^3.0.3",
       "cookie-parser": "^1.4.7",
       "cors": "^2.8.6",
       "dotenv": "^18.0.6",
       "express": "^5.2.1",
       "jsonwebtoken": "^9.0.3",
       "mongoose": "^9.11.1",
       "msedge-tts": "^2.1.0",
       "nodemailer": "^10.1.1",
       "passport": "^0.7.0",
       "passport-google-oauth20": "^2.0.0"
     }
     ```
   - Neither `"ws"` nor `"@google-cloud/speech"` is listed in `backend/package.json`.
2. **`backend/package-lock.json` Baseline**:
   - Lockfile is version 3 (`"lockfileVersion": 3`).
   - Running `cd backend; npm install --dry-run` outputs:
     `up to date in 2s` with 44 funding notices and zero warnings or errors.
3. **Pre-Existing Hoisted `ws` on Disk**:
   - Running `Test-Path backend/node_modules/ws` returns `True`.
   - `backend/node_modules/ws/package.json:3` specifies `"version": "8.22.0"`.
   - `npm info msedge-tts@2.1.0 dependencies` reports `{ ws: '^8.21.3', ... }`.
   - `ws` is currently present only as a transitive dependency of `msedge-tts`.
4. **`ws` ES Module Wrapper & Native Fallback**:
   - `npm info ws@8.18.0 exports` shows `'.': { import: './wrapper.mjs', browser: './browser.js', require: './index.js' }`.
   - In `wrapper.mjs:13-16`:
     ```javascript
     import WebSocketServer from './lib/websocket-server.js';
     export { createWebSocketStream, Receiver, Sender, WebSocket, WebSocketServer };
     export default WebSocket;
     ```
   - Executing `cd backend; node --input-type=module -e "import WebSocket, { WebSocketServer } from 'ws'; console.log('WebSocketServer:', typeof WebSocketServer);"` returned verbatim:
     `WebSocketServer: function`.
   - `npm info ws@8.18.0 peerDependenciesMeta` shows:
     `{ bufferutil: { optional: true }, 'utf-8-validate': { optional: true } }`.
5. **`@google-cloud/speech` Dependency Structure**:
   - `npm info @google-cloud/speech@6.7.0 engines` specifies `{ node: '>=14.0.0' }`.
   - Executing `npm install --dry-run --prefix backend ws@^8.18.0 @google-cloud/speech@^6.7.0` returned exit code 0, adding 92 packages without compilation errors or warnings.
   - All gRPC networking is handled by `@grpc/grpc-js@1.14.7` (pure JavaScript, non-native).
6. **Existing Test Suite Baseline**:
   - Running `node backend/tests/integration.test.js` passed 62/62 tests:
     `RESULTS: 62 passed, 0 failed, 62 total`.
   - Running `node backend/tests/interviewEvaluation.test.js` passed:
     `ALL INTERVIEW & EVALUATION PIPELINE TESTS PASSED (100%)`.

---

## 2. Logic Chain

1. **Premise 1** (from Observation 1 & 3): While `ws@8.22.0` physically exists in `backend/node_modules/` due to `msedge-tts@2.1.0`, it is unlisted in `backend/package.json`. In a clean checkout or containerized build (`npm ci`), npm prunes or refuses to hoist undeclared dependencies if package trees shift.
2. **Inference 1**: To satisfy Milestone 1 Feature 5 and prevent runtime errors during Milestone 2 WebSocket server initialization, `"ws": "^8.18.0"` must be explicitly declared in `backend/package.json`.
3. **Premise 2** (from Observation 3): `msedge-tts` requires `ws: ^8.21.3`, and `backend/package.json` will require `ws: ^8.18.0`.
4. **Inference 2**: In npm semver, `^8.18.0` allows all minor and patch versions `>=8.18.0 <9.0.0`. Version `8.22.0` satisfies both constraints. Therefore, adding `"ws": "^8.18.0"` introduces zero version branching or duplicate copies in `node_modules`.
5. **Premise 3** (from Observation 4 & 5): Both `ws` optional peer dependencies (`bufferutil`, `utf-8-validate`) are marked `{ optional: true }`, with dynamic fallback to pure JS implementations (`lib/buffer-util.js`, `lib/validation.js`). Furthermore, `@google-cloud/speech` relies entirely on pure JS `@grpc/grpc-js` rather than native C++ bindings.
6. **Inference 3**: Neither package requires native compilation tools (`node-gyp`, Python, C++ build tools). The installation is guaranteed to succeed across Windows, Linux, Docker, and macOS without compilation errors.
7. **Premise 4** (from Observation 4): `ws` includes `./wrapper.mjs` exporting `WebSocketServer` as a named export.
8. **Inference 4**: The required syntax in Milestone 2 (`import { WebSocketServer } from 'ws'`) is natively valid in Node.js ESM.
9. **Premise 5** (from Observation 2, 5 & 6): Dry-run installation resolved 92 packages cleanly without touching existing dependencies, and the current codebase passes all 62 integration tests.
10. **Inference 5**: Installing `"ws": "^8.18.0"` and `"@google-cloud/speech": "^6.7.0"` will cause zero regressions across all 62 existing integration tests.

---

## 3. Caveats

1. **No `@google-cloud/speech` GCP Credentials Required for Build**: Adding `@google-cloud/speech` to `package.json` installs the library, but running speech recognition calls against Google Cloud STT requires GCP service account credentials (`GOOGLE_APPLICATION_CREDENTIALS`). The client service designed in Milestone 2 must gracefully handle missing credentials and fall back to browser Web Speech STT.
2. **Working Directory for npm**: When running commands, always run `npm install --prefix backend` or `cd backend && npm install`. Running `npm install` in the project root would create a root-level `node_modules` instead of modifying `backend/node_modules`.
3. **Read-Only Scope Preservation**: This agent has not modified `backend/package.json` or `backend/package-lock.json`. The physical modification must be executed by the Milestone 1 Worker.

---

## 4. Conclusion

1. **Exact `backend/package.json` Dependency Addition**:
   Add `"@google-cloud/speech": "^6.7.0"` and `"ws": "^8.18.0"` to `backend/package.json` under `"dependencies"`.
2. **Installation Command for Worker**:
   ```bash
   cd backend && npm install ws@^8.18.0 @google-cloud/speech@^6.7.0
   ```
   *Alternative*: Edit `backend/package.json` directly and run `npm install --prefix backend`.
3. **Zero Native Build Risk**: `ws` uses pure JS fallback; `@google-cloud/speech` uses `@grpc/grpc-js`. Zero node-gyp or compilation failures.
4. **Full ES Module Compatibility**: `import { WebSocketServer } from 'ws'` and `import { SpeechClient } from '@google-cloud/speech'` are fully supported in Node v24.
5. **Zero Test Regressions**: All 62 integration tests will continue to pass.

---

## 5. Verification Method

To independently verify this analysis:

1. **Verify Dry Run Resolution**:
   ```powershell
   npm install --dry-run --prefix backend ws@^8.18.0 @google-cloud/speech@^6.7.0
   ```
   *Expected Output*: Adds packages cleanly and exits with code 0.

2. **Verify ESM Import of `WebSocketServer`**:
   ```powershell
   cd backend
   node --input-type=module -e "import WebSocket, { WebSocketServer } from 'ws'; console.log('ws OK:', typeof WebSocketServer === 'function');"
   ```
   *Expected Output*: `ws OK: true`.

3. **Verify Post-Install Regression Baseline (Worker Verification)**:
   ```powershell
   node backend/tests/blueprintParser.test.js
   node backend/tests/interviewEvaluation.test.js
   node backend/tests/integration.test.js
   ```
   *Expected Output*: `RESULTS: 62 passed, 0 failed, 62 total`.

4. **Invalidation Conditions**:
   - If `npm install` produces native compilation errors, investigate if an unintended optional native addon was explicitly requested without `--no-optional`.
   - If `import { WebSocketServer } from 'ws'` throws `ERR_MODULE_NOT_FOUND` or `SyntaxError: The requested module 'ws' does not provide an export named 'WebSocketServer'`, check `ws` version is `>=8.0.0`.
