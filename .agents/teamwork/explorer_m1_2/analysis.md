# Milestone 1 Deep-Dive Analysis: Package Dependencies & Installation Plan

**Explorer**: Explorer 2 (Milestone 1 — Data Architecture & Models)  
**Date**: 2026-10-30  
**Status**: Investigation Complete  
**Scope**: Exploration of package dependencies, lockfile behavior, native build risks, and pure ES Module compatibility for `ws` and `@google-cloud/speech` in `backend/package.json`.

---

## 1. Executive Summary

Milestone 1 includes Feature 5 ("Package Dependencies Setup: Add `ws` (and optional `@google-cloud/speech`) to `backend/package.json`").

Key findings:
1. **Existing Environment**: Node.js `v24.11.1`, npm `11.6.2`. The backend is strictly configured with `"type": "module"` in `backend/package.json:14`.
2. **Current State of `ws` on Disk**: `ws` version `8.22.0` is already present inside `backend/node_modules/ws` as a hoisted transitive dependency of `msedge-tts@2.1.0`. However, it is **missing** from `backend/package.json`'s top-level `"dependencies"`. Adding `"ws": "^8.18.0"` makes it an explicit dependency, guaranteeing availability in clean CI/CD environments and production deploys (`npm ci`).
3. **Pure ES Module Compatibility**:
   - `ws` exports `./wrapper.mjs` directly in its `package.json:25` `exports` map, explicitly exporting named `WebSocketServer` and `WebSocket`. Tested and verified: `import { WebSocketServer } from 'ws'` works out of the box in Node v24.
   - `@google-cloud/speech` exports `SpeechClient` in `./build/src/index.js:38`, which is detected by Node.js CJS module lexer, enabling both `import { SpeechClient } from '@google-cloud/speech'` and `import speech from '@google-cloud/speech'`.
4. **Native Compilation & Platform Risks**:
   - `ws` defines `bufferutil` and `utf-8-validate` as **optional peer dependencies** (`peerDependenciesMeta: { optional: true }`). If missing or if C++ compilation fails, `ws` automatically falls back to its bundled pure JavaScript implementations. Zero native compilation failures on Windows/Linux.
   - `@google-cloud/speech` uses `@grpc/grpc-js` (100% pure JavaScript gRPC implementation, NOT the legacy native C++ `grpc` library).
5. **Lockfile & Execution Strategy**:
   - Running `npm install --dry-run --prefix backend ws@^8.18.0 @google-cloud/speech@^6.7.0` resolved cleanly with exit code 0 in ~2–10 seconds, adding 92 packages without any peer dependency conflicts or warnings.
   - All 62 existing integration tests (`node backend/tests/integration.test.js`) and unit tests (`node backend/tests/interviewEvaluation.test.js`) pass with 0 regressions.

---

## 2. Existing Dependencies & Constraints Analysis

### 2.1 Inspection of `backend/package.json`
`backend/package.json` (lines 1–32):
```json
{
  "name": "backend",
  "version": "1.0.0",
  "description": "",
  "main": "src/index.js",
  "scripts": {
    "test": "node tests/integration.test.js",
    "dev": "nodemon src/index.js",
    "start": "node src/index.js"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "type": "module",
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
  },
  "devDependencies": {
    "nodemon": "^3.1.14"
  }
}
```

Key Observations:
- `"type": "module"` enforces ECMAScript module syntax throughout the backend.
- Existing dependencies are all modern packages without native addon compile steps.
- `msedge-tts` is at `^2.1.0`. `npm info msedge-tts@2.1.0 dependencies` confirms it relies on:
  ```json
  {
    "axios": "^1.11.0",
    "buffer": "^6.0.3",
    "isomorphic-ws": "^5.0.0",
    "stream-browserify": "^3.0.0",
    "ws": "^8.21.3"
  }
  ```
- Because `msedge-tts` uses `ws: ^8.21.3`, adding `"ws": "^8.18.0"` to `backend/package.json` creates **zero** version divergence; npm will resolve both to the latest compatible minor (`8.22.0`).

### 2.2 Inspection of `backend/package-lock.json`
- `lockfileVersion: 3` (standard npm v9/v10/v11 format).
- Clean state: `cd backend; npm install --dry-run` reports `up to date in 2s` with 44 funding notices and zero warnings.
- `npm ls --prefix backend` reports an uncorrupted tree with 12 top-level packages.

---

## 3. Dependency Addition Formulation

### 3.1 Exact Formulation in `backend/package.json`
The target addition must preserve JSON syntax, valid semver ranges, and maintain clean formatting.

#### Proposed `backend/package.json` (Dependencies block):
```json
  "dependencies": {
    "@google-cloud/speech": "^6.7.0",
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
    "passport-google-oauth20": "^2.0.0",
    "ws": "^8.18.0"
  },
```

#### Diff Patch for Worker:
```diff
--- a/backend/package.json
+++ b/backend/package.json
@@ -15,12 +15,14 @@
   "dependencies": {
+    "@google-cloud/speech": "^6.7.0",
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
-    "passport-google-oauth20": "^2.0.0"
+    "passport-google-oauth20": "^2.0.0",
+    "ws": "^8.18.0"
   },
```

---

## 4. Package Manager & Installation Behavior

### 4.1 CLI Availability
- `node -v` → `v24.11.1`
- `npm -v` → `11.6.2`
- PowerShell on Windows handles both `npm install --prefix backend` and `cd backend; npm install`.

### 4.2 Dry-Run Verification
We executed:
```powershell
npm install --dry-run --prefix backend ws@^8.18.0 @google-cloud/speech@^6.7.0
```
**Result**:
- Added 92 packages cleanly in 10s.
- Exit code 0.
- No compilation errors.
- Transitive packages added include:
  - `@google-cloud/speech@6.7.1`
  - `@grpc/grpc-js@1.14.7`
  - `google-gax@4.6.1`
  - `google-auth-library@9.15.1`
  - `protobufjs@7.6.6`

### 4.3 Native Compilation Analysis (BufferUtil, UTF-8-Validate, gRPC)
1. **`ws` Optional Dependencies**:
   - `npm info ws@8.18.0 peerDependencies` shows:
     `{ bufferutil: '^4.0.1', 'utf-8-validate': '>=5.0.2' }`
   - `npm info ws@8.18.0 peerDependenciesMeta` shows:
     ```json
     {
       "bufferutil": { "optional": true },
       "utf-8-validate": { "optional": true }
     }
     ```
   - In `ws`, both modules are wrapped in `try/catch` fallback blocks:
     - `require('bufferutil')` falls back to `lib/buffer-util.js` (pure JS masking algorithm).
     - `require('utf-8-validate')` falls back to `lib/validation.js` (pure JS UTF-8 check).
   - In npm v11, optional peer dependencies are **not** forcibly compiled if absent. Even on Windows machines lacking Visual Studio C++ build tools, `npm install` completes cleanly with zero errors.
2. **`@google-cloud/speech` gRPC**:
   - Older Node.js gRPC clients depended on `grpc` (C++ binary addon compiled via node-pre-gyp/node-gyp, frequently breaking across Node versions).
   - `@google-cloud/speech@6.7.0` uses `@grpc/grpc-js`, a 100% pure JavaScript implementation of HTTP/2 and gRPC. It has zero native compilation steps.

---

## 5. Pure ES Module Compatibility

### 5.1 `ws` ES Module Architecture
`ws` provides native ESM support via an export map in `package.json`:
```json
"exports": {
  ".": {
    "browser": "./browser.js",
    "import": "./wrapper.mjs",
    "require": "./index.js"
  },
  "./package.json": "./package.json"
}
```
Inside `wrapper.mjs`:
```javascript
import createWebSocketStream from './lib/stream.js';
import Receiver from './lib/receiver.js';
import Sender from './lib/sender.js';
import WebSocket from './lib/websocket.js';
import WebSocketServer from './lib/websocket-server.js';

export { createWebSocketStream, Receiver, Sender, WebSocket, WebSocketServer };
export default WebSocket;
```

#### Empirical Test:
We executed inside `backend`:
```powershell
node --input-type=module -e "import WebSocket, { WebSocketServer } from 'ws'; console.log('WebSocketServer:', typeof WebSocketServer); console.log('WebSocket:', typeof WebSocket);"
```
**Output**:
```
WebSocketServer: function
WebSocket: function
```
This confirms that:
```javascript
import { WebSocketServer } from 'ws';
```
is 100% supported and works natively in Node.js ESM.

### 5.2 `@google-cloud/speech` ES Module Architecture
`@google-cloud/speech` main file `./build/src/index.js` defines:
```javascript
exports.protos = exports.AdaptationClient = exports.SpeechClient = exports.v2 = exports.v1p1beta1 = exports.v1 = void 0;
...
const SpeechClient = v1.SpeechClient;
exports.SpeechClient = SpeechClient;
exports.default = { v1, v1p1beta1, v2, SpeechClient, AdaptationClient };
```
Because Node.js static CJS lexical analyzer (`cjs-module-lexer`) parses `exports.SpeechClient = SpeechClient;`, both import styles work in ESM:
```javascript
import { SpeechClient } from '@google-cloud/speech';
```
and
```javascript
import speech from '@google-cloud/speech';
const { SpeechClient } = speech;
```

---

## 6. Worker Implementation Plan & Recommended Workflow

### Step 1: Update `backend/package.json`
Apply the diff to add `"@google-cloud/speech": "^6.7.0"` and `"ws": "^8.18.0"` under `"dependencies"`.

### Step 2: Run npm install
From project root:
```powershell
npm install --prefix backend
```
Or:
```powershell
cd backend; npm install
```

### Step 3: Verify Installed Dependencies
Execute verification script to ensure ESM import resolution:
```powershell
cd backend; node --input-type=module -e "import { WebSocketServer } from 'ws'; import { SpeechClient } from '@google-cloud/speech'; console.log('✓ ws and @google-cloud/speech imported successfully');"
```

### Step 4: Run Verification Tests
Verify that all test suites pass without regression:
1. `node backend/tests/blueprintParser.test.js`
2. `node backend/tests/interviewEvaluation.test.js`
3. `node backend/tests/integration.test.js` (62/62 tests passing)
