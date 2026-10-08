const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const candidateSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String }, // Optional for Google OAuth
    googleId: { type: String }
}, { timestamps: true });

candidateSchema.pre('save', async function(next) {
    if (!this.isModified('password') || !this.password) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

candidateSchema.methods.matchPassword = async function(enteredPassword) {
    if(!this.password) return false;
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Candidate', candidateSchema);
