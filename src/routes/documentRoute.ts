import express from "express";
import verifyAccessToken from "../middlewares/verifyAccessToken.middleware.js";
import upload from "../middlewares/upload.middleware.js";
import createHttpError from "http-errors";
import extractPdfPageByPage from "../services/pdfExtractionService.js";
import fs from "fs/promises";
import imageExtraction from "../services/imageExtractionService.js";

const documentRouter = express.Router();

documentRouter.post("/routes/documentRoute/upload",
    verifyAccessToken,
    upload.single("file"),
    async (req, res) => {
    const file = req.file;
    try{
        if(!file){
            throw createHttpError(404, "File not found");
        }
        
        const data = file.mimetype === 'application/pdf' ? 
            await extractPdfPageByPage(file.path) : 
            await imageExtraction(file.path);

        if(!data || data.length <= 0){
            createHttpError(500, "Error in extraction");
        }

        res.send(data);
        
    } catch (err: unknown) {
        if(createHttpError.isHttpError(err) &&  'statusCode' in err){
            const error = err;
            res.status(error.statusCode).json({
                message: error.message,
                data: error.data
            });
        } else {
            res.status(500).json({
                message: "Internal Server Error"
            });
        }
    } finally {
        if(file?.path){
            try{
                fs.unlink(file.path);
            } catch(err) {
                console.error(`Failed to delete temp file ${file.path}: ${err}`);
            }
        }
    }
});

export default documentRouter;