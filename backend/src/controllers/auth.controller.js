import { Company } from '../models/company.model.js';
import { Candidate } from '../models/candidate.model.js';
import { RefreshToken } from '../models/refreshToken.model.js';
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const generateTokens = (user, role) => {
    const accessToken = jwt.sign({ id: user._id, role }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user._id, role }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
    return { accessToken, refreshToken };
};

export const registerCompany = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    const exists = await Company.findOne({ email });
    if (exists) {
        throw new ApiError(400, 'Company already exists');
    }
    
    await Company.create({ name, email, password });
    res.status(201).json(new ApiResponse(201, null, 'Company registered successfully'));
});

export const loginCompany = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const company = await Company.findOne({ email });
    if (!company || !(await company.matchPassword(password))) {
        throw new ApiError(401, 'Invalid email or password');
    }
    
    const { accessToken, refreshToken } = generateTokens(company, 'COMPANY');
    await RefreshToken.create({ token: refreshToken, userId: company._id, role: 'COMPANY' });
    
    res.json(new ApiResponse(200, { accessToken, refreshToken, role: 'COMPANY' }, "Login successful"));
});

export const registerCandidate = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    const exists = await Candidate.findOne({ email });
    if (exists) {
        throw new ApiError(400, 'Candidate already exists');
    }
    
    await Candidate.create({ name, email, password });
    res.status(201).json(new ApiResponse(201, null, 'Candidate registered successfully'));
});

export const loginCandidate = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const candidate = await Candidate.findOne({ email });
    if (!candidate || !(await candidate.matchPassword(password))) {
        throw new ApiError(401, 'Invalid email or password');
    }
    
    const { accessToken, refreshToken } = generateTokens(candidate, 'CANDIDATE');
    await RefreshToken.create({ token: refreshToken, userId: candidate._id, role: 'CANDIDATE' });
    
    res.json(new ApiResponse(200, { accessToken, refreshToken, role: 'CANDIDATE' }, "Login successful"));
});

export const googleLogin = asyncHandler(async (req, res) => {
    res.json(new ApiResponse(200, { url: 'https://accounts.google.com/o/oauth2/v2/auth?...' }, "Google auth URL"));
});

export const googleCallback = asyncHandler(async (req, res) => {
    res.json(new ApiResponse(200, null, 'Google auth callback placeholder'));
});

export const refreshToken = asyncHandler(async (req, res) => {
    const { token } = req.body;
    if (!token) {
        throw new ApiError(401, 'No refresh token');
    }
    
    const existingToken = await RefreshToken.findOne({ token });
    if (!existingToken) {
        throw new ApiError(403, 'Invalid refresh token');
    }
    
    jwt.verify(token, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
        if (err) throw new ApiError(403, 'Token expired or invalid');
        const accessToken = jwt.sign({ id: decoded.id, role: decoded.role }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
        res.json(new ApiResponse(200, { accessToken }, "Token refreshed"));
    });
});

export const logout = asyncHandler(async (req, res) => {
    const { token } = req.body;
    if (token) {
        await RefreshToken.findOneAndDelete({ token });
    }
    res.json(new ApiResponse(200, null, 'Logged out successfully'));
});

export const getMe = asyncHandler(async (req, res) => {
    if (req.user.role === 'COMPANY') {
        const company = await Company.findById(req.user.id).select('-password');
        res.json(new ApiResponse(200, company, "Current user fetched"));
    } else if (req.user.role === 'CANDIDATE') {
        const candidate = await Candidate.findById(req.user.id).select('-password');
        res.json(new ApiResponse(200, candidate, "Current user fetched"));
    } else {
        throw new ApiError(404, 'User not found');
    }
});
