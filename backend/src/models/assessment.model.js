import mongoose, { Schema } from 'mongoose';

const assessmentSchema = new Schema({
    company: { type: Schema.Types.ObjectId, ref: 'Company', required: false },
    role: { type: Schema.Types.ObjectId, ref: 'Role', required: false },
    createdByCandidate: { type: Schema.Types.ObjectId, ref: 'Candidate', required: false },
    assessmentType: { 
        type: String, 
        enum: ['COMPANY', 'MOCK'], 
        default: 'COMPANY' 
    },
    targetCompanyName: { type: String, default: '' },
    targetRoleTitle: { type: String, default: '' },
    title: { type: String, required: true },
    skills: [{ type: String }],
    experienceLevel: { 
        type: String, 
        enum: ['Entry', 'Mid', 'Senior'], 
        default: 'Entry' 
    },
    durationMinutes: { type: Number, default: 30 },
    blueprint: { type: String, default: '' }, // interview blueprint text doc
    blueprintFileName: { type: String, default: '' },
    blueprintAnalysis: {
        roundType: { type: String, default: 'TECHNICAL' },
        roundSummary: { type: String, default: '' },
        codingRoundEnabled: { type: Boolean, default: true },
        totalDurationMinutes: { type: Number, default: 30 },
        phases: [{ type: String }],
        timeline: [{
            phase: { type: String },
            title: { type: String },
            startMinute: { type: Number },
            endMinute: { type: Number },
            durationMinutes: { type: Number }
        }],
        keyCompetencies: [{ type: String }],
        interviewerPersonaPrompt: { type: String, default: '' }
    },
    interviewFormat: {
        type: String,
        enum: ['FULL_INTERVIEW', 'PROJECT_AND_TECHNICAL_ONLY', 'BEHAVIORAL_ONLY'],
        default: 'FULL_INTERVIEW'
    },
    scrapedBlueprint: { type: String, default: '' }, // authentic web-scraped company interview blueprint
    scrapedQuestions: [{ type: String }], // authentic scraped company interview questions
    assessmentCode: { type: String, unique: true, required: true },
    status: { 
        type: String, 
        enum: ['ACTIVE', 'CLOSED'], 
        default: 'ACTIVE' 
    },
    openingTime: { type: Date, default: null },
    closingTime: { type: Date, default: null },
    accessType: { 
        type: String, 
        enum: ['PUBLIC', 'INVITE_ONLY'], 
        default: 'PUBLIC' 
    },
    eligibleEmails: [{ type: String, lowercase: true, trim: true }],
    codingRoundEnabled: { type: Boolean, default: true },
    voiceRoundEnabled: { type: Boolean, default: true }
}, { timestamps: true });

export const Assessment = mongoose.model('Assessment', assessmentSchema);
