import { Router } from "express";
import { loginUser, logoutUser, registeruser ,refreshAccessToken} from "../controllers/user.controller.js";
import { upload } from "../middleware/multer.middleware.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
            maxCount:1
        },
        {
            name:"coverImage",
            maxCount: 1
        }
    ]),
    registeruser
);

router.route("/login").post(loginUser);

//secuer route
router.route("/logout").post(verifyJWT,logoutUser);
router.route("/refresh-access-token").post(refreshAccessToken);


export default router;