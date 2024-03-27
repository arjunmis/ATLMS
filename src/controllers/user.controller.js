import { asynchandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { fileUploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js"; 
import Jwt  from "jsonwebtoken";
import mongoose from "mongoose";
const generateAccessAndRefereshToken = async(userId)=>{
    try {
        const user = await User.findById(userId);
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        user.refreshToken =refreshToken;
        await user.save({validateBeforeSave : false});

        return {accessToken , refreshToken};


    } catch (error) {
        throw new ApiError(500,'something went wrong while generating refersh and access token');
    }
};

const registeruser = asynchandler( async (req , res) => {

    const {userName,fullName,email, password} = req.body

    // if(fullName === ""){
    //     throw new ApiError(400,"full name is required");
    // }

    if(
        [userName,fullName,email, password].some((field) => field?.trim() === "")
        ){
            throw new ApiError(400,"All fields are required");
    }

    const existesUser = await User.findOne({
        $or:[{ userName },{ email }]
    });

    if(existesUser){
        throw new ApiError(409,"User With email or username already exists");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }

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
});

const loginUser = asynchandler( async (req , res) => {

    const {email,userName,password} = req.body



    if(!(userName || email)){
        throw new ApiError(401,"username or email is required");
    }


    
    const user = await User.findOne({   
        $or:[{ email },{ userName }]
    });



    if(!user){
        throw new ApiError(404,"User dose not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(401,"Invalid User Credentials");
    }

    const {accessToken , refreshToken} = await generateAccessAndRefereshToken(user._id);

    const loggedUserInfo =  await User.findById(user._id).select("-password -refreshToken");

    // const loggedUserInfo = await User.findById(user._id).select("-password -refreshToken");

    const option = {
        httpOnly : true,
        secure: true
    }
    
    const user_info = {
        accessToken :accessToken, 
        refreshToken:refreshToken
    }
    const accessToken_new = accessToken ;
    const refreshToken_new = refreshToken ;
    
    if(accessToken_new && refreshToken_new){
    
        return res.status(200)
        .cookie("accessToken",accessToken,option)
        .cookie("refreshToken",refreshToken,option)
        .json(new ApiResponse(
                    200,
                    {   user:loggedUserInfo,
                        "accessToken" : accessToken_new,
                        "refreshToken" : refreshToken_new
                        // {Promise : {
                        //     'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NWQ3YTM4YzU4MWI2ZDEzZGJmN2Q2ZDEiLCJlbWFpbCI6ImFyanVubWlzaHJhOTIxQGdtYWlsLmNvbSIsImlhdCI6MTcxMDYxNjMyMywiZXhwIjoxNzEwNzAyNzIzfQ.ZRD-aFDlu8VPe8RYF6sMFJN5chhsg6WqKZlEdhYfDcM'
                        //   }}
                    },
            "User logged In SuccessfullY"
                            )
        )
    }

});

const logoutUser = asynchandler(async (req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset:{
                refreshToken: 1
            }
            
        },
        {
            new: true
        } 
    )
    const option = {
        httpOnly : true,
        secure: true
    }

    return res.status(200)
    .clearCookie("accessToken",option)
    .clearCookie("refreshToken",option)
    .json(new ApiResponse(200 , {} ,"User logged out" ))
});

const refreshAccessToken = asynchandler(async (req , res) =>{
    const incommingRefreshToken = req?.cookies.refreshToken || req.body.refreshToken;

    if(!incommingRefreshToken){
        throw new ApiError(401,"unauthorised request");
    }

    try {
        
        const decoded_token =  await Jwt.verify(incommingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

        const user = await User.findById(decoded_token._id);

        if(!user){
            throw new ApiError(401,"Invalid Refresh Token");
        }

        if(incommingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"Refresh Token is expierd or used");
        }
        
        const {accessToken,newrefreshToken}  = await generateAccessAndRefereshToken(user._id);
        console.log(accessToken);
        console.log(newrefreshToken);
        const option = {
            httpOnly : true,
            secure: true
        }

        return res.status(200)
        .cookie("accessToken",accessToken,option)
        .cookie("refreshToken",newrefreshToken,option)
        .json(new ApiResponse(
                    200,
                    {  
                        "accessToken" : accessToken,
                        "refreshToken" : newrefreshToken
                    },
                    "Token Reassigned Successfully"
                            )
        )
        
    } catch (error) {
        throw new ApiError('401',error?.message || 'Invalid Refresh Token');
    }


});

const chnageUserCurrentPassWord = asynchandler(async (req , res)=>{
    const{ oldPassword , newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect =await user.isPasswordCorrect(oldPassword);

    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid old password");
    }

    user.password = newPassword;

    await user.save({validateBeforeSave:false});

    return res
    .status(200)
    .json(new ApiResponse(200,{},"Password Changed Successfully"))
})

const getCurrentUser = asynchandler( async (req,res)=>{
    return res
    .status(200)
    .json(200,req.user,"current User Fatched Successfully")
})

const updateUserAccountDetails = asynchandler(async (req ,res)=>{
    const {fullName,email} = req.doby

    if(!fullName||!email){
        throw new ApiError(400,"All Fields are Required");
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName,
                email
            }
        },
        {new: true}
        ).select("-password");

        res
        .status(200)
        .json(new ApiResponse(200,user,"Account Details Update Successfully"))
}) ;

const updateUserCoverImage = asynchandler( async ( req, res )=>{
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400,"Cover Image File Is Missing");
    }

    const coverImage = await fileUploadOnCloudinary(coverImageLocalPath);

    if(!coverImage.url){
        throw new ApiError(400,"Error while uploading");
    }

    const user = User.findByIdAndUpdate(req.user?._id,
    {
        $set:{
            coverImage:coverImage.url
        }
    },
    {new:true})
    .select("-password");

    res
    .status(200)
    .json(new ApiError(200,user,"Cover Image file update Successfully"));

});

const updateUserAvatar = asynchandler( async ( req, res )=>{
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar File Is Missing");
    }

    const avatar = await fileUploadOnCloudinary(avatarLocalPath);

    if(!avatar.url){
        throw new ApiError(400,"Error while uploading");
    }

    const user = User.findByIdAndUpdate(req.user?._id,
    {
        $set:{
            avatar:avatar.url
        }
    },
    {new:true})
    .select("-password");

    res
    .status(200)
    .json(new ApiError(200,user,"Avatar file update Successfully"));

});


const getUserChannelProfile = asynchandler( async (req,res)=>{
    const {username} = req.params;

    if(!username){
        throw new ApiError(400,'User is missing');
    }

    const Channel = await User.aggregate([
        {
            $match:{
                userName:username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField:"_id",
                foreignField:"channel",
                as: "subscribers"
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount :{
                    $size: "$subscribers"
                },
                channelSubscribedToCount : {
                    $size: "$subscribedTo"
                },
                isSubscribed : {
                    $cond:{
                        if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }

            }
        },
        {
            $project : {
                userName:1,
                email:1,
                fullName:1,
                avatar:1,
                coverImage:1,
                isSubscribed:1,
                subscribersCount:1,
                channelSubscribedToCount:1,
            }
        }
    ]);

    if(!Channel?.length){
        throw new ApiError(400,"channel dose not exists")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,Channel[0],'user Channel fatch successfully'));

});

const getUserWatchHistory = asynchandler(async (req,res)=>{
    const user = await User.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName:1,
                                        userName:1,
                                        avatar:1
                                    }
                                }
                            ]

                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]

            }
        }
    ]);

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        user[0].watchHistory,
        "Watch History fatch successfully"
        ));
});

export {registeruser 
    , loginUser 
    ,logoutUser 
    ,refreshAccessToken 
    ,getCurrentUser 
    ,chnageUserCurrentPassWord 
    ,updateUserAccountDetails 
    , updateUserAvatar
    ,updateUserCoverImage
    ,getUserChannelProfile
    ,getUserWatchHistory }
