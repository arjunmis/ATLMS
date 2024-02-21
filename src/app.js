import cookieParser from "cookie-parser";
import express from "express";
import cors from "cors";
const app = express();

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    Credential:true
}));
app.use(express.json({
    limit:"16kb",
}));
app.use(express.urlencoded({
    limit:'16kb'
}));
app.use(express.static("public"));
app.use(cookieParser());



//routes import
import userRouter from "./routers/user.router.js";

//routes declaration
app.use("/api/v1/user",userRouter);

export {app};