const Role = require('../models/Role');

exports.getRoles = async (req, res) => {
    try {
        const roles = await Role.find({ company: req.user.id });
        res.json(roles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createRole = async (req, res) => {
    try {
        const { title, description } = req.body;
        const role = await Role.create({
            company: req.user.id,
            title,
            description
        });
        res.status(201).json(role);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateRole = async (req, res) => {
    try {
        const { title, description } = req.body;
        const role = await Role.findOneAndUpdate(
            { _id: req.params.id, company: req.user.id },
            { title, description },
            { new: true }
        );
        if (!role) return res.status(404).json({ message: 'Role not found' });
        res.json(role);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteRole = async (req, res) => {
    try {
        const role = await Role.findOneAndDelete({ _id: req.params.id, company: req.user.id });
        if (!role) return res.status(404).json({ message: 'Role not found' });
        res.json({ message: 'Role deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
