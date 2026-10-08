const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
    token: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    role: { type: String, enum: ['COMPANY', 'CANDIDATE'], required: true }
}, { timestamps: true });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
