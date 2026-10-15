import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());

// Route imports
import authRouter from './routes/auth.routes.js';
import companyRouter from './routes/company.routes.js';
import candidateRouter from './routes/candidate.routes.js';
import assessmentRouter from './routes/assessment.routes.js';
import interviewRouter from './routes/interview.routes.js';
import evaluationRouter from './routes/evaluation.routes.js';

// Route declarations
app.use("/api/auth", authRouter);
app.use("/api/company", companyRouter);
app.use("/api/candidate", candidateRouter);
app.use("/api/assessments", assessmentRouter);
app.use("/api/interview", interviewRouter);
app.use("/api/evaluation", evaluationRouter);

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

