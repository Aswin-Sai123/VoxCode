# VoxCode 🎙️💻
> **An AI-Powered Conversational Voice & Live Coding Technical Interview Platform**

[![Vite](https://img.shields.io/badge/Frontend-React_19_+_Vite-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js_+_Express-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Gemini AI](https://img.shields.io/badge/AI_Engine-Google_Gemini-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev/)
[![Monaco Editor](https://img.shields.io/badge/IDE-Monaco_Editor-007ACC?style=flat-square&logo=visualstudiocode&logoColor=white)](https://microsoft.github.io/monaco-editor/)
[![Tests](https://img.shields.io/badge/Tests-62_Passed_%E2%9C%93-brightgreen?style=flat-square)]()
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)]()

---

## 📌 Executive Summary

**VoxCode** is a full-stack, enterprise-grade AI technical interview platform built to simulate real-world engineering hiring rounds at top tech companies (Google, Amazon, Meta, Microsoft). 

Traditional automated assessments rely on rigid, multiple-choice quizzes or isolated code submission boxes that fail to evaluate how engineers actually think and communicate. **VoxCode bridges this gap** by combining:
1. **Real-time, voice-driven conversational rounds** led by an AI interviewer with natural speech cadence and live karaoke-style captions.
2. **An embedded multi-language IDE & sandbox runner** (JavaScript, Python, C++) with test assertion suites and execution timeout guards.
3. **Resume and project-aware contextual questioning** tailored to the candidate's actual background.
4. **Authentic video-call environment** with self-view camera preview and non-intrusive workspace continuity telemetry.
5. **Comprehensive AI evaluation scorecards** featuring multi-axis rubrics, hiring verdicts, and personalized readiness analytics.

---

## 🌟 Key Features

### 1. 🎙️ Natural Conversational AI Interviewer ("Rohan")
- **Bidirectional Voice Interface:** Hands-free speech recognition (Web Speech API) and Walkie-Talkie Push-to-Talk (`[Space]` hold to speak, `[Enter]` to submit).
- **Neural TTS Voice Engines:** Out-of-the-box support for Microsoft Edge Online Neural voices (Neerja, Prabhat), Google Cloud Neural TTS, and native browser speech fallback.
- **YouTube-Style Synchronized Captions:** Live, word-by-word highlighted captions rendered in real time as the AI speaks.
- **Web Audio FFT Visualizer:** Dynamic glowing orb (`VoiceVisualizerOrb`) pulsing to real-time audio frequencies from the candidate's microphone and AI speech stream.
- **Dynamic Topic Progression:** Multi-stage conversational state machine that adapts question difficulty and naturally transitions from conceptual deep-dives to system implementation.

### 2. 💻 Collaborative Code Studio & Execution Sandbox
- **Microsoft Monaco Editor:** Full VS Code editing experience with syntax highlighting, indentation, auto-completion, font sizing, and custom themes (`vs-dark`, `vs`, `hc-black`).
- **Sub-Second Native Code Execution:** Safe isolated subprocess execution runner supporting **JavaScript (Node.js)**, **Python 3**, and **C++ (g++)**.
- **Automated Test Harness:** Runs code against predefined test suites and custom input testcases with stdout, stderr, execution duration, and memory metrics.
- **Infinite Loop & Resource Protection:** Built-in CPU timeout monitors and memory bounds to prevent execution lockups.

### 3. 📄 Resume-Aware Personalization
- **PDF/DOCX Parsing:** Candidate resumes are parsed directly in the lobby to extract key technologies, past companies, and project experience.
- **Contextual Interview Threads:** The AI interviewer reads the candidate's parsed background to ask tailored architectural questions about their specific past projects.

### 4. 📹 Authentic Interview Environment
- **Clean Video-Call Experience:** Collapsible picture-in-picture self-view camera tile with live mic activity indicator—mirroring Google Meet, Zoom, Karat, and CoderPad.
- **Zero Hostile Proctoring:** Eliminates invasive eye-tracking bounding boxes or false-positive alarms in favor of reliable session stability and workspace continuity logging.

### 5. 📊 In-Depth Evaluation & Candidate Readiness
- **Multi-Dimensional Scoring Rubric:**
  - **Coding Accuracy & Problem Solving** (Testcase pass rate, time/space complexity analysis)
  - **Conceptual Understanding** (Fundamentals, trade-off rationale, edge case consideration)
  - **Communication & Articulation** (Clarity, structure, technical vocabulary)
- **Recruiter Decision Workflow:** AI hiring verdicts (`STRONG_HIRE`, `HIRE`, `BORDERLINE`, `NO_HIRE`) with one-click recruiter candidate review, shortlisting, and feedback distribution.
- **Candidate Readiness Index (CRI):** Comprehensive analytics dashboard tracking performance trends, percentile rankings, and skill radar charts.

---

## 🏛️ System Architecture

```text
                                  +-----------------------------+
                                  |     Candidate / Recruiter   |
                                  |        (React 19 + Vite)    |
                                  +--------------+--------------+
                                                 |
                       HTTPS REST / Audio Stream | Web Speech / MediaStream
                                                 v
                                  +-----------------------------+
                                  |     VoxCode API Gateway     |
                                  |      (Express + Node.js)    |
                                  +--------------+--------------+
                                                 |
            +--------------------+---------------+-------------------+
            |                    |                                   |
            v                    v                                   v
+-----------------------+ +-----------------------+ +-----------------------+
|   MongoDB Database    | |  AI Interview Engine  | |   Execution Sandbox   |
| (Mongoose ODM + Atlas)| | (Google Gemini Flash) | | (Node / Python / C++) |
+-----------------------+ +-----------------------+ +-----------------------+
            |                    |                                   |
            | User Profiles      | Dynamic Context / Rubrics         | Isolated Subprocess
            | Sessions & Tests   | Structured Evaluation             | Timeout Watchdog
            v                    v                                   v
+---------------------------------------------------------------------------+
|          Authentication: JWT (Access + HTTP-only Refresh) + OAuth2        |
+---------------------------------------------------------------------------+
```

---

## 🗂️ Project Directory Structure

```text
VoxCode/
├── backend/
│   ├── src/
│   │   ├── config/              # MongoDB connection & system environment
│   │   ├── controllers/         # REST API route controllers
│   │   │   ├── assessment.controller.js
│   │   │   ├── auth.controller.js
│   │   │   ├── candidate.controller.js
│   │   │   ├── evaluation.controller.js
│   │   │   └── interview.controller.js
│   │   ├── middleware/          # JWT auth verification, error handlers & RBAC
│   │   ├── models/              # Mongoose schemas (Candidate, Company, Session, etc.)
│   │   ├── routes/              # Express API route declarations
│   │   ├── services/            # Core business logic services
│   │   │   ├── ai.service.js             # Gemini AI conversation orchestration
│   │   │   ├── companyScraper.service.js # Real-world interview scraper
│   │   │   ├── email.service.js          # Nodemailer transactional alerts
│   │   │   ├── evaluation.service.js     # AI evaluation & scoring rubrics
│   │   │   ├── resumeParser.service.js   # PDF/DOCX resume extractor
│   │   │   ├── sandbox.service.js        # Multi-language code execution runner
│   │   │   └── tts.service.js            # Neural text-to-speech engine
│   │   ├── utils/               # State machine, API response & error wrappers
│   │   ├── app.js               # Express application initialization
│   │   ├── passport.js          # Google OAuth 2.0 strategy configuration
│   │   └── server.js            # HTTP server entrypoint
│   ├── tests/
│   │   └── integration.test.js  # 62 automated end-to-end integration tests
│   ├── .env.example             # Backend environment template
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   │   ├── candidate/       # CandidateReadinessIndex, scorecards
│   │   │   ├── common/          # VoiceVisualizerOrb, VoiceModelSelectorModal, Navbar
│   │   │   └── company/         # Recruiter interview cards, analytics
│   │   ├── context/             # AuthContext, ThemeContext (Dark/Light mode)
│   │   ├── pages/               # Application route views
│   │   │   ├── auth/            # Login, Register, OAuthCallback
│   │   │   ├── candidate/       # Dashboard, AssessmentLobby, InterviewRoom, Reports
│   │   │   └── company/         # Recruiter Dashboard, AssessmentResults
│   │   ├── services/            # Axios API client with automatic token refreshing
│   │   ├── utils/               # Audio synthesizers, sound effects, formatting
│   │   ├── App.jsx              # Client router with role-based route guards
│   │   ├── index.css            # Tailwind custom styling & design tokens
│   │   └── main.jsx             # React 19 root entrypoint
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
└── qa-audit/                    # Independent QA security & fuzzing test suite
    ├── audit-endpoints-and-security.js
    ├── audit-prompt-injection.js
    └── audit-races-and-eval.js
```

---

## 🚀 Quickstart Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB**: Local MongoDB instance (`mongodb://127.0.0.1:27017`) or a free [MongoDB Atlas](https://www.mongodb.com/atlas) connection URI
- **Google Gemini API Key**: Free API key from [Google AI Studio](https://aistudio.google.com/)
- **Python / GCC** *(Optional, for local sandbox runner)*: Python 3 and `g++` on system PATH

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/Aswin-Sai123/VoxCode.git
cd VoxCode
```

---

### Step 2: Configure Environment Variables

Create `.env` inside the `backend/` directory:
```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your credentials:
```env
# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database
MONGODB_URI=mongodb://127.0.0.1:27017/voxcode

# Authentication Secrets
JWT_ACCESS_SECRET=your_super_secret_access_jwt_key_32chars
JWT_REFRESH_SECRET=your_super_secret_refresh_jwt_key_32chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# Google OAuth2 (Optional for local testing)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

---

### Step 3: Install Dependencies

```bash
# Install backend packages
cd backend
npm install

# Install frontend packages
cd ../frontend
npm install
```

---

### Step 4: Run the Application Locally

Open two terminal windows:

**Terminal 1 — Backend API Server:**
```bash
cd backend
npm run dev
# Server boots up on http://localhost:5000
```

**Terminal 2 — Frontend Application:**
```bash
cd frontend
npm run dev
# Vite dev server starts on http://localhost:5173
```

Visit **`http://localhost:5173`** in your browser.

---

## 🧪 Testing & Quality Assurance

VoxCode includes a comprehensive automated test harness covering RBAC authorization, session lifecycles, sandbox execution, scoring, and security:

```bash
# Run backend integration tests
cd backend
npm test
```

### Test Suite Coverage:
-  **Auth Suite**: Registration, duplicate prevention, credential verification, JWT rotation, and profile recovery.
-  **Assessment Suite**: Role provisioning, assessment creation, access authorization, and scheduling window enforcement.
-  **Interview Suite**: Conversational message exchange, topic transitions, state continuity, and completion locks.
-  **Sandbox Suite**: Multi-language output matching, syntax error reporting, and infinite-loop timeout termination.
-  **Security & RBAC**: Privilege escalation defense, cross-company data isolation, and unauthorized evaluation prevention.

**Result:** `62 passed, 0 failed (100% green)`

---

## 🔒 Security & Best Practices

- **Role-Based Access Control (RBAC):** Strict separation of `CANDIDATE` and `COMPANY` capabilities enforced via middleware.
- **Short-Lived Access Tokens:** 15-minute access JWTs paired with securely rotated refresh tokens stored in database with device fingerprinting.
- **Sandbox Subprocess Isolation:** User code is executed in isolated runtime processes with strict timeouts to prevent denial-of-service (DoS).
- **Prompt Injection Defense:** Strict system framing prevents candidates from manipulating AI evaluators into granting unauthorized score inflation.
- **Clean Telemetry:** Zero biometric storage or intrusive eye tracking; only standard network reliability and workspace focus events are logged.

---

## 👨‍💻 Author & Acknowledgments

- **Developed by:** [Vadluri Pratheek](https://github.com/Aswin-Sai123)
- **Built with:** Node.js, Express, React 19, MongoDB, Google Gemini, and Monaco Editor.
- **License:** Released under the [MIT License](LICENSE).
