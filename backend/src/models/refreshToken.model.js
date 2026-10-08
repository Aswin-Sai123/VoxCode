import mongoose, { Schema } from 'mongoose';

const refreshTokenSchema = new Schema({
    token: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, required: true },
    role: { type: String, enum: ['COMPANY', 'CANDIDATE'], required: true }
}, { timestamps: true });

export const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
