import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Multer config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (!allowedTypes.includes(ext)) {
        return cb(new Error('Only .xlsx or .csv files are allowed'), false);
    }
    cb(null, true);
};

const upload = multer({ storage, fileFilter });

export const uploadSingleFile = (fieldName) => {
    return (req, res, next) => {
        const uploadFn = upload.single(fieldName);
        uploadFn(req, res, (err) => {
            if (err instanceof multer.MulterError || err) {
                return res.status(400).json({ success: false, message: err.message });
            }
            next();
        });
    };
};
