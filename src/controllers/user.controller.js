import { asynchandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { fileUploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js"; 

const registeruser = asynchandler( async (req , res) => {

    const {userName,fullName,email, password} = req.body
    console.log("full name - ",fullName);
    
    // if(fullName === ""){
    //     throw new ApiError(400,"full name is required");
    // }

    if(
        [userName,fullName,email, password].some((field) => field?.trim() === "")
        ){
            throw new ApiError(400,"All fields are required");
    }

    const existesUser = User.findOne({
        $or: [{ userName },{ email }]
    });

    if(existesUser){
        throw new ApiError(409,"User With email or username already exists");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required");  
    }

    const avatar = await fileUploadOnCloudinary(avatarLocalPath);
    const coverImage = await fileUploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400,"Avatar file is required");
    }

    const user = await User.create({
        fullName,
        avatar : avatar.url,
        coverImage :coverImage?.url || "",
        email,
        password,
        userName : userName.toLowerCase()
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser){
        throw new ApiError(500,"something went wrong while registering the user");
    }

    return res.status(201).json(
        new ApiResponse(200 , createdUser, "User registered Successfully" )
    )
})

export {registeruser}
