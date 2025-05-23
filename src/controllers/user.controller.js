import { asyncHandler } from "../utils/asyncHandler.js";
import {apiError} from "../utils/apiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { apiRespone } from "../utils/apiRespone.js";

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

    const {fullName,email, userName,password} = req.body
    console.log("email: ",email);

    if([fullName,email,userName,password].some((field)=> field?.trim()=== "")){
        throw new apiError(400,"All fields are required")
    }

    const exsitedUser = User.findOne({$or: [{ userName },{ email }]})

    if(exsitedUser){
        throw new apiError(409,"User with email or username already exist")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new apiError(400,"Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new apiError(400,"Avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        userName: userName.toLowerCase()
    })

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

export {registerUser}