import mongoose, { Schema } from 'mongoose';

const questionBankSchema = new Schema({
    text: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    company: {
        type: String,
        default: '',
        trim: true
    },
    role: {
        type: String,
        default: '',
        trim: true
    },
    topics: {
        type: [String],
        default: []
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['active', 'retired', 'experimental'],
        default: 'active'
    },
    discriminativeness: {
        type: Number,
        default: 0.5
    },
    usageCount: {
        type: Number,
        default: 0
    },
    replacement: {
        type: String,
        default: '',
        trim: true
    }
}, { timestamps: true });

// Compound indexes for rapid question retrieval
questionBankSchema.index({ company: 1, role: 1, status: 1 });
questionBankSchema.index({ topics: 1, difficulty: 1, status: 1 });

export const QuestionBank = mongoose.model('QuestionBank', questionBankSchema);
export default QuestionBank;

