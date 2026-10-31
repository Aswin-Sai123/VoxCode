import mongoose, { Schema } from 'mongoose';

const calibrationConfigSchema = new Schema({
    type: {
        type: String,
        required: true,
        unique: true,
        default: 'evaluation',
        trim: true
    },
    adjustments: {
        type: Schema.Types.Mixed,
        default: () => ({})
    },
    accuracy: {
        type: Number,
        default: 0
    },
    sampleCount: {
        type: Number,
        default: 0
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

export const CalibrationConfig = mongoose.model('CalibrationConfig', calibrationConfigSchema);
export default CalibrationConfig;

