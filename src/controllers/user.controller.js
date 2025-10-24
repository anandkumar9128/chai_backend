import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import User from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';

const registerUser = asyncHandler(async(req,res)=>{
    //extract data from request body
    const {fullName,email,username,password}=req.body;
    console.log("email: ",email);

    //validate input
    if(fullName===""){
        throw new ApiError(400,"Full name is required");
    }
    if(
        [fullName,email,username,password].some((field)=>
            field?.trim()===""
        )
    ){
        throw new ApiError(400,"All fields are required");
    }

    //check if user exists
    const existedUser =await User.findOne({
        $or:[{username},{email}]
    })
    if(existedUser){
        throw new ApiError(409,"Username or email already taken");
    }

    //check if avatar is provided
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path; 
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar image is required");
    }

    //upload images to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if(!avatar){
        throw new ApiError(400,"Avatar image is required");
    }

    //create user
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        username: username.toLowerCase(),
        password,
    })
    //fetch created user without password and refresh token
    const createdUser = await User.findById(user._id).select('-password -refreshToken');

    if(!createdUser){
        throw new ApiError(500,"something went wrong while creating user");
    }

    //send response
    return res.status(201).json(new ApiResponse(200,"User created successfully",createdUser));
})

export { registerUser };