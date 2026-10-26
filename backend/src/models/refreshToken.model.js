import mongoose, { Schema } from 'mongoose';

const refreshTokenSchema = new Schema({
    token: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    role: { type: String, enum: ['COMPANY', 'CANDIDATE'], required: true }
}, { timestamps: true });

// Auto-delete refresh tokens after 7 days (604800 seconds)
refreshTokenSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

export const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
