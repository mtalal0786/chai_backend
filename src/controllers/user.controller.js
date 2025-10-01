import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from 'jsonwebtoken';

const generateAccessAndRefreshToken = async (userId) => {
    // Logic to generate access and refresh tokens
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        // Store refresh token in database
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh tokens");
    }
}

const registerUser = asyncHandler(async (req, res) => {
    // Validations
    const { fullName, email, username, password } = req.body;
    console.log("Body:", req.body);
    
    if ([fullName, email, username, password].some(field => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new ApiError(400, "Invalid email format");
    }

    // Username validation
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    if (!usernameRegex.test(username)) {
        throw new ApiError(400, "Invalid username format. Only alphanumeric characters and underscores are allowed, length between 3 to 30 characters.");
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
        throw new ApiError(409, "User with this email or username already exists");
    }

    // Avatar check
    let avatarLocalPath;
    if (req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0) {
        avatarLocalPath = req.files.avatar[0].path;
    }

    // Cover image check (optional)
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    console.log("Request files:", req.files);
    console.log("Avatar path:", avatarLocalPath);
    console.log("Cover image path:", coverImageLocalPath);
    
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar image is required");
    }

    // Upload avatar to Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    // Upload cover image to Cloudinary (if exists)
    let coverImage = {};
    if (coverImageLocalPath) {
        coverImage = await uploadOnCloudinary(coverImageLocalPath);
    }

    if (!avatar) {
        throw new ApiError(400, "Avatar image is required and must be valid image file");
    }

    // Create user
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "", // If cover image exists, store URL; else store an empty string
        email,
        password,
        username: username.toLowerCase(),
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering user");
    }

    return res.status(201).json(new ApiResponse(200, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
    // Login logic here
    const { email, username, password } = req.body;
    if (!email && !username) {
        throw new ApiError(400, "Email or username is required");
    }

    const user = await User.findOne({ $or: [{ email }, { username }] });

    if ( !user ) {
        throw new ApiError(404, "User not found");
    }   

    const isPasswordValid = await user.isPasswordCorrect(password);

    if ( !isPasswordValid ) {
        throw new ApiError(401, "Invalid credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    // Set refresh token in cookie
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const Options = {
        httpOnly: true,
        secure: true
    };
    
    return res
    .status(200)
    .cookie("accessToken", accessToken, Options)
    .cookie("refreshToken", refreshToken, Options)
    .json(new ApiResponse(
        200,
        {
            user: loggedInUser,
            accessToken,
            refreshToken
        },
        "User logged in successfully"
    ));

});

const logoutUser = asyncHandler(async (req, res) => {
    // Logout logic here
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        }, 
        {
         new: true
        }
    );

    const Options = {
        httpOnly: true,
        secure: true
    };

    return res
    .status(200)
    .clearCookie("accessToken",  Options)
    .clearCookie("refreshToken", Options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));

});

const refreshAccessToken = asyncHandler(async (req, res) => {
    // Refresh access token logic here
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Refresh token is required");
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken?._id);
    
        if (!user ) {
            throw new ApiError(401, "Invalid refresh token");
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used");
        }
    
        const Options = {
            httpOnly: true,
            secure: true
        };
    
        const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(user._id);
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, Options)
        .cookie("refreshToken", newRefreshToken, Options)
        .json(
            new ApiResponse(
                200,
                 { accessToken , refreshToken: newRefreshToken },
                 "Access token refreshed successfully"
            )
        );
    } catch (error) {
        throw new ApiError(401, error?.message ||"Invalid refresh token");
    }
});


export { registerUser, loginUser, logoutUser, refreshAccessToken };
