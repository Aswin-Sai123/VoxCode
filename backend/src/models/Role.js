const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    title: { type: String, required: true },
    description: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Role', roleSchema);
