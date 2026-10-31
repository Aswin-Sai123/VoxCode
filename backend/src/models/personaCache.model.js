import mongoose, { Schema } from 'mongoose';

const personaCacheSchema = new Schema({
    company: {
        type: String,
        required: true,
        trim: true
    },
    role: {
        type: String,
        required: true,
        trim: true
    },
    experienceLevel: {
        type: String,
        default: '',
        trim: true
    },
    persona: {
        type: Schema.Types.Mixed,
        required: true
    },
    cachedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Compound index for cache lookup by company and role
personaCacheSchema.index({ company: 1, role: 1 });

// 7-day TTL index to automatically purge expired cache documents (604800 seconds = 7 days)
personaCacheSchema.index({ cachedAt: 1 }, { expireAfterSeconds: 604800 });

export const PersonaCache = mongoose.model('PersonaCache', personaCacheSchema);
export default PersonaCache;

