import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app }  from "./app.js"; 

dotenv.config({
  path: './.env'
});

connectDB()
.then(()=>{
  app.on("error",(error)=>{
    console.log(`express server error!!! ${error}`);
  });
  app.listen(process.env.PORT || 8000,()=>{
    console.log(`server running at port ${process.env.PORT}`);
  });
})
.catch((error)=>{
  console.log("Mongodb connection failed !!!",error);
});

