import { Role } from '../models/role.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getRoles = asyncHandler(async (req, res) => {
    const roles = await Role.find({ company: req.user.id });
    res.json(new ApiResponse(200, roles, "Roles fetched successfully"));
});

export const createRole = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    const role = await Role.create({
        company: req.user.id,
        title,
        description
    });
    res.status(201).json(new ApiResponse(201, role, "Role created successfully"));
});

export const updateRole = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    const role = await Role.findOneAndUpdate(
        { _id: req.params.id, company: req.user.id },
        { title, description },
        { new: true }
    );
    if (!role) {
        throw new ApiError(404, 'Role not found');
    }
    res.json(new ApiResponse(200, role, "Role updated successfully"));
});

export const deleteRole = asyncHandler(async (req, res) => {
    const role = await Role.findOneAndDelete({ _id: req.params.id, company: req.user.id });
    if (!role) {
        throw new ApiError(404, 'Role not found');
    }
    res.json(new ApiResponse(200, null, "Role deleted successfully"));
});
