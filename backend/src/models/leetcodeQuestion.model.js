import mongoose from 'mongoose';

const leetcodeQuestionSchema = new mongoose.Schema({
    companySlug: {
        type: String,
        required: true,
        index: true
    },
    companyName: {
        type: String,
        required: true,
        index: true
    },
    questionNumber: {
        type: Number,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    difficulty: {
        type: String,
        enum: ['Easy', 'Medium', 'Hard'],
        required: true,
        index: true
    },
    acceptance: {
        type: Number,
        default: 0
    },
    frequency: {
        type: Number,
        default: 0,
        index: true
    }
}, {
    timestamps: true
});

leetcodeQuestionSchema.index({ companySlug: 1, difficulty: 1, frequency: -1 });

export const LeetCodeQuestion = mongoose.model('LeetCodeQuestion', leetcodeQuestionSchema);
export default LeetCodeQuestion;

