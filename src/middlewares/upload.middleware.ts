import multer from "multer";
import path from "node:path";
import fs from 'fs';
import createHttpError from "http-errors";

const uploadDir = path.join(process.cwd(), 'temp');
if(!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, {recursive: true});
}

const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, uploadDir);
    },
    filename(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    },
})

const filefilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimeTypes = [
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/webp',
        'application/pdf'
    ];
    if(allowedMimeTypes.includes(file.mimetype)){
        cb(null, true);
    } else {
        cb(createHttpError(422, "'Invalid file type. Only images, PDFs, text, and Word documents are allowed.'"));
    }
}

const upload = multer({
    storage: storage,
    fileFilter: filefilter,
    limits: {
        fileSize: 1024 * 1024 * 20
    }
});

export default upload;