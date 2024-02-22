import {v2 as cloudinary} from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret:process.env.CLOUDINARY_API_SECRET
});

const fileUploadOnCloudinary = async (localFilePath)=>{
    try {
        if(!localFilePath) return null 
        // upload file on Cloudinary
        let response = await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        })
        // file hase been uploaded successfull
        fs.unlinkSync(localFilePath);
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath); //remove the local file on our server when cloudinary file upload faild
        return null;
    }
}

export {fileUploadOnCloudinary}