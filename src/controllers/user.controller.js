import { asyncHandler } from "../utils/asyncHandler.js";
import {apiError} from "../utils/apiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { apiRespone } from "../utils/apiRespone.js";
import jwt from JsonWebTokenError

import { JsonWebTokenError } from "jsonwebtoken";

const generateAccessAndRefreshToken = async(userId) => {
    try{
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        
        user.refreshToken = refreshToken
        user.save({validateBeforeSave : false}) // check why we wrote this

        return {accessToken,refreshToken}

    }catch(error){
        throw new apiError(500,"Something went wrong while generating refresh and access token")
    }
}


const registerUser = asyncHandler(async (req,res) => {
    // get user details fomr frontend
    // validation - not empty
    // check is user already exists : username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar 
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res


    // extracting all the data from the request
    const {fullName,email, userName,password} = req.body
    console.log("email: ",email);

    // checking if they are valid
    if([fullName,email,userName,password].some((field)=> field?.trim()=== "")){
        throw new apiError(400,"All fields are required")
    }

    // checking is the user is already present with the email or name
    const exsitedUser = await User.findOne({$or: [{ userName },{ email }]})

    if(exsitedUser){
        throw new apiError(409,"User with email or username already exist")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length >0){
        coverImageLocalPath = req.files.coverImage[0].path
    }

    //we have set avatar to be required, that is why is avatar is not set
    //throw an error
    if(!avatarLocalPath){
        throw new apiError(400,"Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new apiError(400,"Avatar file is required")
    }

    // Creates an object if everything went well
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        userName: userName.toLowerCase()
    })

    //we are removing the passwork and refreshToken from the received value
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new apiError(500,"Something went wrong on registration")
    }

    return res.status(201).json(
        new apiRespone(200,createdUser,"User registered Successfully")
    )
})


const loginUser = asyncHandler(async (req,res) =>{
    // req body -> data
    // username or email
    // find the user
    // password check
    // access and refresh token
    // send cookie

    const { email, userName, password } = req.body
    
    if (!userName && !email){
        throw new apiError(400, "username or email is required")
    }

    const user = await UserfindOne(
        {
            $or:[{userName}, {email}]
        }
    )

    if(!user){
        throw new apiError(404,"User doesn't exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new apiError(401,"Invalid user credentials")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure : true
    }

    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
            new apiError(
                200,
                {
                    user:loggedInUser,accessToken,refreshToken
                },
                "User logged in Successfully"
            )
    )

} )

const logoutUser  =  asyncHandler(async(req,res) => {
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
    )
    const options = {
        httpOnly:true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new apiRespone(200,{}, "User logged Out"))
})

const refreshAccessToken = asyncHandler(async (req,res) => {
    const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new apiError(401,"Unauthorized request")
    }

    try {
            const decodedToken = jwt.verify(
                incomingRefreshToken,
                process.env.ACCESS_TOKEN_SECRET
            )
        
            const user = await User.findById(decodedToken?._id)
            
            if(!user){
                throw new apiError(401,"Unauthorized request")
            }
        
            if(incomingRefreshToken !== user?.refreshToken){
                throw new apiError(401,"Refresh token is expired or used")
            }
        
            const options = {
                httpOnly: true,
                secure: true
            }
        
            const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id)
        
            return res
            .status(200)
            .cookie("accessToken",accessToken, options)
            .cookie("refreshToken",newRefreshToken, options)
            .json(
                new apiRespone(
                    200,
                    {accessToken, refreshToken:newRefreshToken},
                    "Access token refreshed"
        
                )
            )
    } catch (error) {
        throw new apiError(401,error?.message || "invalid refresh token")
    }
})

export {registerUser,loginUser,logoutUser,refreshAccessToken}