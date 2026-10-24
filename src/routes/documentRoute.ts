import express from "express";
import verifyAccessToken from "../middlewares/verifyAccessToken.middleware.js";
import upload from "../middlewares/upload.middleware.js";
import createHttpError from "http-errors";
import extractPdfPageByPage from "../services/extractionService.js";
import fs from "fs/promises";

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
        
        const data = await extractPdfPageByPage(file.path);

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