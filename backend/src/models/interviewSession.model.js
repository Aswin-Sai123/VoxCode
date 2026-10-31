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
        enum: ['FULL_INTERVIEW', 'PROJECT_AND_TECHNICAL_ONLY', 'BEHAVIORAL_ONLY'],
        default: 'FULL_INTERVIEW'
    },
    startedAt: { 
        type: Date, 
        default: Date.now 
    },
    endedAt: { 
        type: Date 
    },
    proctoring: {
        integrityScore: { 
            type: Number, 
            default: 100,
            min: 0,
            max: 100 
        },
        tabSwitchCount: { 
            type: Number, 
            default: 0 
        },
        windowBlurCount: { 
            type: Number, 
            default: 0 
        },
        pasteCount: { 
            type: Number, 
            default: 0 
        },
        fullscreenExitCount: { 
            type: Number, 
            default: 0 
        },
        faceMissingCount: {
            type: Number,
            default: 0
        },
        multipleFacesCount: {
            type: Number,
            default: 0
        },
        cameraStatus: { 
            type: String, 
            enum: ['ACTIVE', 'DISABLED', 'ERROR', 'NOT_STARTED'], 
            default: 'NOT_STARTED' 
        },
        micStatus: { 
            type: String, 
            enum: ['ACTIVE', 'MUTED', 'ERROR', 'NOT_STARTED'], 
            default: 'NOT_STARTED' 
        },
        events: [{
            type: { 
                type: String, 
                enum: ['TAB_SWITCH', 'WINDOW_BLUR', 'SUSPICIOUS_PASTE', 'FULLSCREEN_EXIT', 'DEVTOOLS_ATTEMPT', 'CAMERA_OFF', 'AUDIO_ANOMALY', 'FACE_ABSENT', 'NO_FACE_DETECTED', 'FACE_OBSTRUCTED', 'MULTIPLE_FACES'], 
                required: true 
            },
            timestamp: { 
                type: Date, 
                default: Date.now 
            },
            details: { 
                type: String, 
                default: '' 
            },
            penalty: { 
                type: Number, 
                default: 0 
            }
        }]
    },
    evaluation: {
        type: Schema.Types.ObjectId,
        ref: 'Evaluation'
    },
    candidateProfile: {
        topicScores: { type: Schema.Types.Mixed, default: () => ({}) },
        overallSignal: { type: String, enum: ['strong', 'adequate', 'weak', 'unknown'], default: 'unknown' },
        communicationScore: { type: Number, default: 0 },
        technicalDepth: { type: Number, default: 0 },
        responseCount: { type: Number, default: 0 },
        weakTopics: { type: [String], default: [] }
    },
    microScores: [{
        question: String,
        answer: String,
        topic: String,
        score: Number,
        signal: String,
        dimensions: {
            correctness: Number,
            depth: Number,
            communication: Number,
            practical_application: Number
        },
        keyInsight: String,
        timestamp: { type: Date, default: Date.now }
    }],
    trainingSignals: {
        questionEffectiveness: [{
            question: String,
            candidateSignal: String,
            topicCoverage: Number,
            discriminativeness: Number
        }],
        sessionOutcome: {
            hireable: { type: Boolean, required: false },
            candidateRating: Number,
            evaluationAccuracy: Number
        }
    },
    liveCode: {
        type: String,
        default: ''
    },
    calibrated: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Prevent duplicate IN_PROGRESS sessions per candidate per assessment (RACE-START-SESSION)
interviewSessionSchema.index(
    { candidate: 1, assessment: 1 },
    { 
        unique: true, 
        partialFilterExpression: { 
            status: 'IN_PROGRESS' 
        } 
    }
);

interviewSessionSchema.index({ calibrated: 1, 'trainingSignals.sessionOutcome.hireable': 1 });

export const InterviewSession = mongoose.model('InterviewSession', interviewSessionSchema);
export default InterviewSession;

