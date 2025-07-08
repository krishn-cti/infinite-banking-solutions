// middleware/uploadCsv.js
import multer from "multer";
import path from "path";
import fs from "fs";

const csvDir = "uploads/csv/";

if (!fs.existsSync(csvDir)) {
    fs.mkdirSync(csvDir, { recursive: true });
}

const csvStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, csvDir),
    filename: (req, file, cb) => {
        cb(null, `csv_${Date.now()}${path.extname(file.originalname)}`);
    },
});

export const uploadCsv = multer({ storage: csvStorage }).single("file");