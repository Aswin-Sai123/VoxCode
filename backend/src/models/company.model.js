import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

const companySchema = new Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, default: 'COMPANY', enum: ['COMPANY'] }
}, { timestamps: true });

companySchema.pre('save', async function() {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

companySchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

export const Company = mongoose.model('Company', companySchema);
