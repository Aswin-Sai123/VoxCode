import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

const candidateSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String }, // Optional for Google OAuth
    googleId: { type: String }
}, { timestamps: true });

candidateSchema.pre('save', async function() {
    if (!this.isModified('password') || !this.password) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

candidateSchema.methods.matchPassword = async function(enteredPassword) {
    if(!this.password) return false;
    return await bcrypt.compare(enteredPassword, this.password);
};

export const Candidate = mongoose.model('Candidate', candidateSchema);
