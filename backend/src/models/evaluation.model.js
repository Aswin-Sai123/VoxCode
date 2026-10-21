import mongoose, { Schema } from 'mongoose';

const evaluationSchema = new Schema({
    session: { 
        type: Schema.Types.ObjectId, 
        ref: 'InterviewSession', 
        required: true,
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
    recruiterDecision: {
        type: String,
        enum: ['PENDING', 'SHORTLISTED', 'REJECTED', 'ADVANCED_TO_ROUND_2'],
        default: 'PENDING'
    },
    recruiterNotes: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['PENDING', 'COMPLETED', 'FAILED'],
        default: 'PENDING'
    }
}, { timestamps: true });

export const Evaluation = mongoose.model('Evaluation', evaluationSchema);
