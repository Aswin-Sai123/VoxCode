import mongoose, { Schema } from 'mongoose';

const roleSchema = new Schema({
    company: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    title: { type: String, required: true },
    description: { type: String }
}, { timestamps: true });

export const Role = mongoose.model('Role', roleSchema);
