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
    scrapedBlueprint: { type: String, default: '' }, // authentic web-scraped company interview blueprint
    scrapedQuestions: [{ type: String }], // authentic scraped company interview questions
    assessmentCode: { type: String, unique: true, required: true },
    status: { 
        type: String, 
        enum: ['ACTIVE', 'CLOSED'], 
        default: 'ACTIVE' 
    }
}, { timestamps: true });

export const Assessment = mongoose.model('Assessment', assessmentSchema);
