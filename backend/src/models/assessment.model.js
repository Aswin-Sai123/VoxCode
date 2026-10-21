import mongoose, { Schema } from 'mongoose';

const assessmentSchema = new Schema({
    company: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    role: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    title: { type: String, required: true },
    skills: [{ type: String }],
    experienceLevel: { 
        type: String, 
        enum: ['Entry', 'Mid', 'Senior'], 
        default: 'Entry' 
    },
    durationMinutes: { type: Number, default: 30 },
    blueprint: { type: String, default: '' }, // interview blueprint text doc
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
