import crypto from 'crypto';
import { Company } from '../models/company.model.js';
import { Candidate } from '../models/candidate.model.js';
import { RefreshToken } from '../models/refreshToken.model.js';
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getFrontendUrl } from '../utils/url.utils.js';

const sanitizeString = (val) => typeof val === 'string' ? val.trim() : '';

const generateTokens = (user, role) => {
    const accessToken = jwt.sign({ id: user._id, role }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user._id, role, jti: crypto.randomUUID() }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
    return { accessToken, refreshToken };
};

const oauthCodeStore = new Map();
setInterval(() => {
    const now = Date.now();
    for (const [code, data] of oauthCodeStore.entries()) {
        if (data.expiresAt < now) {
            oauthCodeStore.delete(code);
        }
    }
}, 60000);

export const registerCompany = asyncHandler(async (req, res) => {
    const name = sanitizeString(req.body.name);
    const email = sanitizeString(req.body.email).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!name || !email || !password) {
        throw new ApiError(400, 'Name, email, and password are required');
    }

    const exists = await Company.findOne({ email });
    if (exists) {
        throw new ApiError(400, 'Company already exists');
    }
    
    const company = await Company.create({ name, email, password });
    const { accessToken, refreshToken } = generateTokens(company, 'COMPANY');
    await RefreshToken.create({ token: refreshToken, userId: company._id, role: 'COMPANY' });
    
    res.status(201).json(new ApiResponse(201, { accessToken, refreshToken, role: 'COMPANY' }, 'Company registered successfully'));
});

export const loginCompany = asyncHandler(async (req, res) => {
    const email = sanitizeString(req.body.email).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!email || !password) {
        throw new ApiError(400, 'Email and password are required');
    }

    const company = await Company.findOne({ email });
    if (!company || !(await company.matchPassword(password))) {
        throw new ApiError(401, 'Invalid email or password');
    }
    
    const { accessToken, refreshToken } = generateTokens(company, 'COMPANY');
    await RefreshToken.create({ token: refreshToken, userId: company._id, role: 'COMPANY' });
    
    res.json(new ApiResponse(200, { accessToken, refreshToken, role: 'COMPANY' }, "Login successful"));
});

export const registerCandidate = asyncHandler(async (req, res) => {
    const name = sanitizeString(req.body.name);
    const email = sanitizeString(req.body.email).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!name || !email || !password) {
        throw new ApiError(400, 'Name, email, and password are required');
    }

    const exists = await Candidate.findOne({ email });
    if (exists) {
        throw new ApiError(400, 'Candidate already exists');
    }
    
    const candidate = await Candidate.create({ name, email, password });
    const { accessToken, refreshToken } = generateTokens(candidate, 'CANDIDATE');
    await RefreshToken.create({ token: refreshToken, userId: candidate._id, role: 'CANDIDATE' });
    
    res.status(201).json(new ApiResponse(201, { accessToken, refreshToken, role: 'CANDIDATE' }, 'Candidate registered successfully'));
});

export const loginCandidate = asyncHandler(async (req, res) => {
    const email = sanitizeString(req.body.email).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!email || !password) {
        throw new ApiError(400, 'Email and password are required');
    }

    const candidate = await Candidate.findOne({ email });
    if (!candidate || !(await candidate.matchPassword(password))) {
        throw new ApiError(401, 'Invalid email or password');
    }
    
    const { accessToken, refreshToken } = generateTokens(candidate, 'CANDIDATE');
    await RefreshToken.create({ token: refreshToken, userId: candidate._id, role: 'CANDIDATE' });
    
    res.json(new ApiResponse(200, { accessToken, refreshToken, role: 'CANDIDATE' }, "Login successful"));
});

export const googleCallback = asyncHandler(async (req, res) => {
    const candidate = req.user;
    const frontendUrl = getFrontendUrl();
    
    if (!candidate) {
        return res.redirect(`${frontendUrl}/login?error=google_failed`);
    }

    const { accessToken, refreshToken } = generateTokens(candidate, 'CANDIDATE');
    await RefreshToken.create({ token: refreshToken, userId: candidate._id, role: 'CANDIDATE' });
    
    const code = crypto.randomBytes(24).toString('hex');
    oauthCodeStore.set(code, {
        accessToken,
        refreshToken,
        role: 'CANDIDATE',
        expiresAt: Date.now() + 60000
    });

    res.redirect(`${frontendUrl}/login?code=${code}&role=CANDIDATE`);
});

export const oauthExchange = asyncHandler(async (req, res) => {
    const code = sanitizeString(req.body.code);
    if (!code) {
        throw new ApiError(400, 'OAuth exchange code is required');
    }

    const data = oauthCodeStore.get(code);
    if (!data || data.expiresAt < Date.now()) {
        oauthCodeStore.delete(code);
        throw new ApiError(400, 'OAuth exchange code has expired or is invalid. Please sign in again.');
    }

    oauthCodeStore.delete(code);

    res.json(new ApiResponse(200, {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        role: data.role
    }, 'OAuth exchange successful'));
});

export const refreshToken = asyncHandler(async (req, res) => {
    const token = req.body.token || req.body.refreshToken;
    if (!token || typeof token !== 'string') {
        throw new ApiError(401, 'No refresh token provided');
    }
    
    const existingToken = await RefreshToken.findOne({ token });
    if (!existingToken) {
        throw new ApiError(403, 'Invalid refresh token');
    }
    
    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
        await RefreshToken.findOneAndDelete({ token });
        throw new ApiError(403, 'Token expired or invalid');
    }

    await RefreshToken.findOneAndDelete({ token });

    const newRefreshToken = jwt.sign(
        { id: decoded.id, role: decoded.role, jti: crypto.randomUUID() },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
    );
    await RefreshToken.create({ token: newRefreshToken, userId: decoded.id, role: decoded.role });

    const accessToken = jwt.sign(
        { id: decoded.id, role: decoded.role },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: '15m' }
    );
    res.json(new ApiResponse(200, { accessToken, refreshToken: newRefreshToken }, "Token refreshed"));
});

export const logout = asyncHandler(async (req, res) => {
    const token = req.body.token || req.body.refreshToken;
    if (token && typeof token === 'string') {
        await RefreshToken.findOneAndDelete({ token });
    }
    res.json(new ApiResponse(200, null, 'Logged out successfully'));
});

export const getMe = asyncHandler(async (req, res) => {
    if (req.user.role === 'COMPANY') {
        const company = await Company.findById(req.user.id).select('-password');
        if (!company) {
            throw new ApiError(404, 'Company user not found');
        }
        const data = company.toObject();
        data.role = 'COMPANY';
        res.json(new ApiResponse(200, data, "Current user fetched"));
    } else if (req.user.role === 'CANDIDATE') {
        const candidate = await Candidate.findById(req.user.id).select('-password');
        if (!candidate) {
            throw new ApiError(404, 'Candidate user not found');
        }
        const data = candidate.toObject();
        data.role = 'CANDIDATE';
        res.json(new ApiResponse(200, data, "Current user fetched"));
    } else {
        throw new ApiError(404, 'User not found');
    }
});
