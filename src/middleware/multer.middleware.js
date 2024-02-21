import multer from "multer";
const storage = multer.diskStorage({
    destination: function(req,file,cd){
        cd(null,'./public/temp')
    },
    filename: function(req,file,cd){
        // const uniqueSuffix = date.now()+' '+Math.round(math.round() * 1EP)
        cd(null,file.originalname)

    }
});

export const upload = multer({storage:storage})