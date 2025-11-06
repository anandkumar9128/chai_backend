import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import User from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken'

const generateAccessAndRefreshTokens = async(userId)=>{
    try{
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave:false});
        
        return {accessToken, refreshToken};
    }catch(error){
        throw new ApiError(500,"something went wrong while generating tokens");
    }
}


const registerUser = asyncHandler(async(req,res)=>{
    //extract data from request body
    const {fullName,email,username,password}=req.body;
    
    console.log(req.body);

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
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar image is required");
    }

    //check if cover image is provided
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
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

const loginUser = asyncHandler(async(req,res)=>{
    const {email,username,password}=req.body;
    if(!username && !email){
        throw new ApiError(400,"Username or email is required");
    }
    //validate input
    const user =await User.findOne({
        $or:[{username},{email}]
    })

    if(!user){
        throw new ApiError(404,"User not found");
    }
    const isPasswordValid=await user.isPasswordCorrect(password);
    if(!isPasswordValid){
        throw new ApiError(401,"Invalid password");
    }
    //generate tokens
    const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id);

    //fetch logged in user without password and refresh token
    const loggedInUser=await User.findById(user._id).select('-password -refreshToken')

    const options ={
        httpOnly: true,
        secure:true
    }

    //send response
    return res.status(200)
    .cookie('refreshToken', refreshToken, options)
    .cookie('accessToken', accessToken, options)
    .json(new ApiResponse(200,"User logged in successfully",{
        user: loggedInUser,
        accessToken,refreshToken
    }));
})

const logoutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            },
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, "User logged out successfully"));
})

const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken;
    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorized request")
    }
    try {
        const decodedToken=jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        const user=await User.findById(decodedToken?._id)
        if(!user){
            throw new ApiError(401,"Invalid refresh token")
        }
        if(incomingRefreshToken!==user?.refreshToken){
            throw new ApiError(401,"Refresh token in expired or used")
        }
        const options={
            httpOnly:true,
            secure:true,
        }
        const{accessToken,newRefreshToken} =await generateAccessAndRefreshTokens(user._id)
        
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(
            new ApiResponse(200,{accessToken:newRefreshToken},"Access Token refreshed successfully")
        )
    } catch (error) {
        throw new ApiError(401,error?.message ||"Invalid refresh token")
    }
})

export { registerUser, loginUser, logoutUser, refreshAccessToken };     