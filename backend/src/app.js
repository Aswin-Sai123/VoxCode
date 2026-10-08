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

// Route declarations
app.use("/api/auth", authRouter);
app.use("/api/company", companyRouter);
app.use("/api/candidate", candidateRouter);

export { app };
