import mongoose, { Schema } from 'mongoose';

const evaluationSchema = new Schema({
    session: { 
        type: Schema.Types.ObjectId, 
        ref: 'InterviewSession', 
        required: true,
        unique: true,
        index: true
    },
    candidate: { 
        type: Schema.Types.ObjectId, 
        ref: 'Candidate', 
        required: true,
        index: true
    },
    assessment: { 
        type: Schema.Types.ObjectId, 
        ref: 'Assessment', 
        required: true,
        index: true
    },
    isPractice: {
        type: Boolean,
        default: false
    },
    scores: {
        overall: { type: Number, min: 0, max: 100, default: 0 },
        conceptual: { type: Number, min: 0, max: 100, default: 0 },
        coding: { type: Number, min: 0, max: 100, default: 0 },
        codeQuality: { type: Number, min: 0, max: 100, default: 0 },
        communication: { type: Number, min: 0, max: 100, default: 0 }
    },
    verdict: { 
        type: String, 
        enum: ['Strong Hire', 'Hire', 'Needs Improvement', 'Reject'], 
        default: 'Needs Improvement' 
    },
    summary: { 
        type: String, 
        default: '' 
    },
    strengths: [{ 
        type: String 
    }],
    areasForImprovement: [{ 
        type: String 
    }],
    codeReview: {
        correctness: { type: String, default: 'Pending evaluation' },
        timeComplexity: { type: String, default: 'Not evaluated' },
        spaceComplexity: { type: String, default: 'Not evaluated' },
        suggestions: [{ type: String }]
    },
    testCaseResults: [{
        input: { type: String, default: '' },
        expectedOutput: { type: String, default: '' },
        actualOutput: { type: String, default: '' },
        passed: { type: Boolean, default: false },
        executionTime: { type: String, default: '0.00s' }
    }],
    candidateQuestionsAsked: [{
        question: { type: String, default: '' },
        interviewerAnswer: { type: String, default: '' },
        analysis: { type: String, default: '' }
    }],
    companyHistoryContext: {
        priorInterviewsCount: { type: Number, default: 0 },
        trajectorySummary: { type: String, default: '' },
        priorScores: [{
            overall: { type: Number },
            date: { type: Date },
            roleTitle: { type: String },
            verdict: { type: String }
        }]
    },
    roleRubricsFeedback: [{
        competency: { type: String, default: '' },
        score: { type: Number, min: 0, max: 100, default: 0 },
        status: { 
            type: String, 
            enum: ['EXCEEDS_EXPECTATIONS', 'MEETS_EXPECTATIONS', 'BELOW_EXPECTATIONS', 'NOT_EVALUATED'], 
            default: 'MEETS_EXPECTATIONS' 
        },
        feedback: { type: String, default: '' }
    }],
    recruiterDecision: {
        type: String,
        enum: ['PENDING', 'SHORTLISTED', 'REJECTED', 'ADVANCED_TO_ROUND_2'],
        default: 'PENDING'
    },
    recruiterNotes: {
        type: String,
        default: ''
    },
    proctoringSummary: {
        integrityScore: { type: Number, default: 100 },
        trustLevel: { 
            type: String, 
            enum: ['HIGH_TRUST', 'MODERATE_TRUST', 'SUSPICIOUS', 'FLAGGED'], 
            default: 'HIGH_TRUST' 
        },
        tabSwitchCount: { type: Number, default: 0 },
        windowBlurCount: { type: Number, default: 0 },
        pasteCount: { type: Number, default: 0 },
        fullscreenExitCount: { type: Number, default: 0 },
        faceMissingCount: { type: Number, default: 0 },
        multipleFacesCount: { type: Number, default: 0 },
        totalViolations: { type: Number, default: 0 },
        events: [{
            type: { type: String },
            timestamp: { type: Date },
            details: { type: String },
            penalty: { type: Number, default: 0 }
        }]
    },
    deepEvaluation: {
        type: Schema.Types.Mixed,
        default: null
    },
    status: {
        type: String,
        enum: ['PENDING', 'COMPLETED', 'FAILED'],
        default: 'PENDING'
    }
}, { timestamps: true });

export const Evaluation = mongoose.model('Evaluation', evaluationSchema);
