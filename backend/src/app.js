import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { getFrontendUrl } from "./utils/url.utils.js";

const app = express();

// Trust reverse proxy (e.g. Render, Cloudflare) so req.protocol and secure redirects work correctly
app.set('trust proxy', 1);

const configuredFrontend = getFrontendUrl();

// Security headers middleware
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https: http:; media-src 'self' blob: data: https:;");
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
});

const allowedOrigins = [
    configuredFrontend?.replace(/\/$/, ''),
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5000'
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const cleanOrigin = origin.replace(/\/$/, '');
        if (
            allowedOrigins.includes(cleanOrigin) ||
            /^https:\/\/[a-z0-9-]+\.onrender\.com$/.test(cleanOrigin)
        ) {
            return callback(null, true);
        }
        return callback(null, false);
    },
    credentials: true
}));

import passport from './passport.js';

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use(cookieParser());
app.use(passport.initialize());

// Route imports
import authRouter from './routes/auth.routes.js';
import companyRouter from './routes/company.routes.js';
import candidateRouter from './routes/candidate.routes.js';
import assessmentRouter from './routes/assessment.routes.js';
import interviewRouter from './routes/interview.routes.js';
import evaluationRouter from './routes/evaluation.routes.js';
import ttsRouter from './routes/tts.routes.js';

// Root status endpoint
app.get('/', (req, res) => {
    if (req.accepts('html')) {
        return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>VoxCode API • Online</title>
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    background-color: #0b0f17;
                    color: #EDEDF0;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                }
                .card {
                    background: #141824;
                    border: 1px solid #1e293b;
                    border-radius: 16px;
                    padding: 36px 32px;
                    max-width: 440px;
                    width: 90%;
                    text-align: center;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.5);
                }
                .badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 6px 14px;
                    border-radius: 9999px;
                    background: rgba(34, 197, 94, 0.1);
                    border: 1px solid rgba(34, 197, 94, 0.25);
                    color: #4ade80;
                    font-size: 12px;
                    font-weight: 600;
                    margin-bottom: 20px;
                }
                .dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: #22c55e;
                    box-shadow: 0 0 10px #22c55e;
                }
                h1 {
                    font-size: 24px;
                    margin: 0 0 10px;
                    font-weight: 700;
                }
                p {
                    color: #8B8B9E;
                    font-size: 14px;
                    line-height: 1.6;
                    margin: 0 0 24px;
                }
                .btn {
                    display: inline-block;
                    padding: 12px 24px;
                    background: #2563eb;
                    color: #ffffff;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 14px;
                    transition: background 0.2s;
                }
                .btn:hover {
                    background: #1d4ed8;
                }
                .meta {
                    margin-top: 24px;
                    font-size: 11px;
                    color: #475569;
                    font-family: monospace;
                }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="badge">
                    <span class="dot"></span>
                    <span>Backend Operational</span>
                </div>
                <h1>VoxCode API Server</h1>
                <p>This service powers the AI interviewer, speech synthesis, and code evaluation engines.</p>
                <a href="${configuredFrontend}" class="btn">Open VoxCode Web App &rarr;</a>
                <div class="meta">Status: 200 OK • Node.js / Express</div>
            </div>
        </body>
        </html>
        `);
    }
    res.json({
        service: 'VoxCode API Backend',
        status: 'online',
        uptime: process.uptime(),
        frontend: configuredFrontend,
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// Route declarations
app.use("/api/auth", authRouter);
app.use("/api/company", companyRouter);
app.use("/api/candidate", candidateRouter);
app.use("/api/assessments", assessmentRouter);
app.use("/api/interview", interviewRouter);
app.use("/api/evaluation", evaluationRouter);
app.use("/api/tts", ttsRouter);

// Catch-all 404 handler for unknown API endpoints
app.use('/api', (req, res) => {
    res.status(404).json({
        success: false,
        message: `API endpoint not found: ${req.method} ${req.originalUrl}`
    });
});

// Global error handler — catches ApiError thrown by controllers
app.use((err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Something went wrong';

    if (err.name === 'CastError') {
        statusCode = 404;
        message = `Resource not found with specified identifier`;
    } else if (err.name === 'ValidationError') {
        statusCode = 400;
        message = Object.values(err.errors || {}).map(val => val.message).join(', ');
    }

    res.status(statusCode).json({
        success: false,
        message,
        errors: err.errors || []
    });
});

export { app };

