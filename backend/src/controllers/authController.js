const Company = require('../models/Company');
const Candidate = require('../models/Candidate');
const RefreshToken = require('../models/RefreshToken');
const jwt = require('jsonwebtoken');

const generateTokens = (user, role) => {
    const accessToken = jwt.sign({ id: user._id, role }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user._id, role }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
    return { accessToken, refreshToken };
};

exports.registerCompany = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const exists = await Company.findOne({ email });
        if (exists) return res.status(400).json({ message: 'Company already exists' });
        
        const company = await Company.create({ name, email, password });
        res.status(201).json({ message: 'Company registered successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.loginCompany = async (req, res) => {
    try {
        const { email, password } = req.body;
        const company = await Company.findOne({ email });
        if (!company || !(await company.matchPassword(password))) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        
        const { accessToken, refreshToken } = generateTokens(company, 'COMPANY');
        await RefreshToken.create({ token: refreshToken, userId: company._id, role: 'COMPANY' });
        
        res.json({ accessToken, refreshToken, role: 'COMPANY' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.registerCandidate = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const exists = await Candidate.findOne({ email });
        if (exists) return res.status(400).json({ message: 'Candidate already exists' });
        
        const candidate = await Candidate.create({ name, email, password });
        res.status(201).json({ message: 'Candidate registered successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.loginCandidate = async (req, res) => {
    try {
        const { email, password } = req.body;
        const candidate = await Candidate.findOne({ email });
        if (!candidate || !(await candidate.matchPassword(password))) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        
        const { accessToken, refreshToken } = generateTokens(candidate, 'CANDIDATE');
        await RefreshToken.create({ token: refreshToken, userId: candidate._id, role: 'CANDIDATE' });
        
        res.json({ accessToken, refreshToken, role: 'CANDIDATE' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.googleLogin = async (req, res) => {
    // Placeholder for actual OAuth implementation
    // For module 1, we just return a URL or redirect
    res.json({ url: 'https://accounts.google.com/o/oauth2/v2/auth?...' });
};

exports.googleCallback = async (req, res) => {
    // Placeholder for OAuth callback processing
    res.json({ message: 'Google auth callback placeholder' });
};

exports.refreshToken = async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(401).json({ message: 'No refresh token' });
        
        const existingToken = await RefreshToken.findOne({ token });
        if (!existingToken) return res.status(403).json({ message: 'Invalid refresh token' });
        
        jwt.verify(token, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
            if (err) return res.status(403).json({ message: 'Token expired or invalid' });
            const accessToken = jwt.sign({ id: decoded.id, role: decoded.role }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
            res.json({ accessToken });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.logout = async (req, res) => {
    try {
        const { token } = req.body;
        if (token) {
            await RefreshToken.findOneAndDelete({ token });
        }
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getMe = async (req, res) => {
    try {
        if (req.user.role === 'COMPANY') {
            const company = await Company.findById(req.user.id).select('-password');
            res.json(company);
        } else if (req.user.role === 'CANDIDATE') {
            const candidate = await Candidate.findById(req.user.id).select('-password');
            res.json(candidate);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
