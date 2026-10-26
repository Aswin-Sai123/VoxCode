import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { getFrontendUrl } from "./utils/url.utils.js";

const app = express();

// Trust reverse proxy (e.g. Render, Cloudflare) so req.protocol and secure redirects work correctly
app.set('trust proxy', 1);

const configuredFrontend = getFrontendUrl();

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const cleanOrigin = origin.replace(/\/$/, '');
        if (
            cleanOrigin === configuredFrontend ||
            cleanOrigin === 'http://localhost:5173' ||
            cleanOrigin === 'http://localhost:5000' ||
            cleanOrigin.endsWith('.onrender.com') ||
            cleanOrigin.includes('localhost')
        ) {
            return callback(null, true);
        }
        return callback(null, true);
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

// Route declarations
app.use("/api/auth", authRouter);
app.use("/api/company", companyRouter);
app.use("/api/candidate", candidateRouter);
app.use("/api/assessments", assessmentRouter);
app.use("/api/interview", interviewRouter);
app.use("/api/evaluation", evaluationRouter);
app.use("/api/tts", ttsRouter);

// Global error handler — catches ApiError thrown by controllers
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: err.message || 'Something went wrong',
        errors: err.errors || []
    });
});

export { app };

