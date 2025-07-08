import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure upload directories exist
const uploadDirs = {
    profile: "public/uploads/profile_images/",
};

Object.values(uploadDirs).forEach((dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === "profile_image") cb(null, uploadDirs.profile);
        else cb(new Error("Unexpected field"), false);
    },
    filename: (req, file, cb) => {
        cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
    },
});


// Export multer configuration for multiple file uploads
export const upload = multer({
    storage,
}).fields([
    { name: "profile_image", maxCount: 1 }
]);
