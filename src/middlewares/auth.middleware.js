import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js";
import jwt from 'jsonwebtoken';
import {User } from "../models/user.models.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
    
    try {
        const token = req.cookies?.accessToken || req.headers?.authorization?.replace("Bearer ", "");
    
        if (!token) {
            return res.status(401).json({ message: "Unauthorized: No token provided" });
        }
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
        const user = await User.findById(decoded._id).select("-password -refreshToken");
    
        if (!user) {
            throw new ApiError(401, "Access token is not valid");
        }
    
        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Access token is not valid");
    }
});
