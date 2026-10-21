import mongoose, { Schema } from 'mongoose';

const interviewSessionSchema = new Schema({
    candidate: { 
        type: Schema.Types.ObjectId, 
        ref: 'Candidate', 
        required: true 
    },
    assessment: { 
        type: Schema.Types.ObjectId, 
        ref: 'Assessment', 
        required: true 
    },
    isPractice: {
        type: Boolean,
        default: false
    },
    stage: { 
        type: String, 
        enum: ['CONCEPTUAL', 'CODING', 'COMPLETED'], 
        default: 'CONCEPTUAL' 
    },
    status: { 
        type: String, 
        enum: ['IN_PROGRESS', 'COMPLETED', 'TIMED_OUT'], 
        default: 'IN_PROGRESS' 
    },
    topics: [{ 
        type: String 
    }],
    currentTopicIndex: { 
        type: Number, 
        default: 0 
    },
    questionsInCurrentTopic: { 
        type: Number, 
        default: 0 
    },
    stateMachine: {
        type: Schema.Types.Mixed,
        default: null
    },
    transcript: [{
        role: { 
            type: String, 
            enum: ['ai', 'candidate'], 
            required: true 
        },
        text: { 
            type: String, 
            required: true 
        },
        timestamp: { 
            type: Date, 
            default: Date.now 
        },
        evaluation: {
            correctness: { type: Number },
            depth: { type: Number },
            critique: { type: String }
        },
        topic: { 
            type: String 
        }
    }],
    codingChallenge: {
        title: { type: String, default: '' },
        difficulty: { type: String, default: 'Medium' },
        description: { type: String, default: '' },
        functionDescription: { type: String, default: '' },
        inputFormat: { type: String, default: '' },
        constraints: [{ type: String }],
        outputFormat: { type: String, default: '' },
        sampleTestCases: [{
            input: { type: String, default: '' },
            expectedOutput: { type: String, default: '' },
            explanation: { type: String, default: '' }
        }],
        starterCode: { type: String, default: '' },
        language: { type: String, default: 'javascript' }
    },
    codeSubmission: {
        language: { type: String, default: 'javascript' },
        code: { type: String, default: '' },
        output: { type: String, default: '' }
    },
    durationMinutes: { 
        type: Number, 
        default: 30 
    },
    candidateResume: {
        type: String,
        default: ''
    },
    interviewFormat: {
        type: String,
        enum: ['FULL_INTERVIEW', 'PROJECT_AND_TECHNICAL_ONLY'],
        default: 'FULL_INTERVIEW'
    },
    startedAt: { 
        type: Date, 
        default: Date.now 
    },
    endedAt: { 
        type: Date 
    },
    evaluation: {
        type: Schema.Types.ObjectId,
        ref: 'Evaluation'
    }
}, { timestamps: true });


export const InterviewSession = mongoose.model('InterviewSession', interviewSessionSchema);
