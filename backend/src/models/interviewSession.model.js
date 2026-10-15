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
        }
    }],
    codingChallenge: {
        title: { type: String, default: '' },
        description: { type: String, default: '' },
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
    startedAt: { 
        type: Date, 
        default: Date.now 
    },
    endedAt: { 
        type: Date 
    }
}, { timestamps: true });

export const InterviewSession = mongoose.model('InterviewSession', interviewSessionSchema);
