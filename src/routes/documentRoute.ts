import express from "express";
import verifyAccessToken from "../middlewares/verifyAccessToken.middleware.js";
import upload from "../middlewares/upload.middleware.js";
import createHttpError from "http-errors";
import Document from "../models/document.model.js";
import { isValidObjectId } from "mongoose";
import { statusLimiter } from "../middlewares/limiter.middleware.js";
import documentProcessor from "../services/documentProcessingService.js";

const documentRouter = express.Router();

documentRouter.post("/upload",
    verifyAccessToken,
    upload.single("file"),
    async (req, res) => {
    const file = req.file;
    try{
        if(!file){
            throw createHttpError(404, "File not found");
        }
        
        const document = new Document({
            userId: req.session?.userId,
            originalName: file.originalname,
            mimeType: file.mimetype,
            fileSize: file.size,
            status: "Uploaded",
            originalFileDeleted: false,
            expiresAt: new Date(Date.now() + 1000*60*60*24*7)
        });

        await document.save();

        res.json({
            documentId: document._id
        });

        documentProcessor(document, file);
        
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
    }
});

documentRouter.get("/:documentId/status", 
    statusLimiter, 
    verifyAccessToken, 
    async(req, res)=>{
    try{
        const id = req.params.documentId;
        if(!id || !isValidObjectId(id)){
            throw createHttpError(400, "Invalid id");
        }
        const data = await Document.findById(req.params.documentId);

        if(!data){
            throw createHttpError(400, "Invalid id");
        }

        if(data.status === "Creating Embeddings" || data.status === "Completed"){
            return res.json({
                status: data.status,
                analysis: data.analysis
            });
        }

        res.json({
            status: data.status
        })
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
    }
})

export default documentRouter;