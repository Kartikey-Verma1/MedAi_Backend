import express from "express";
import verifyAccessToken from "../middlewares/verifyAccessToken.middleware.js";
import upload from "../middlewares/upload.middleware.js";
import createHttpError from "http-errors";
import extractPdfPageByPage from "../services/pdfExtractionService.js";
import fs from "fs/promises";
import imageExtraction from "../services/imageExtractionService.js";
import medicalAnalyzer from "../services/medicalAnalysisService.js";
import Document from "../models/document.model.js";
import { isValidObjectId } from "mongoose";
import { statusLimiter } from "../middlewares/limiter.middleware.js";
import chunkText from "../utils/chunkText.util.js";

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
            processedAt: new Date()
        });

        await document.save();

        res.json({
            documentId: document._id
        });
        try{
            await Document.findOneAndUpdate(
                {_id: document._id},
                {
                    $set:{
                        status: "Extracting"
                    }
                }
            )
    
            const extractedText = file.mimetype === 'application/pdf' ? 
                await extractPdfPageByPage(file.path) : 
                await imageExtraction(file.path);
    
            if(!extractedText || extractedText.length <= 0){
                throw createHttpError(500, "Error in extraction");
            }
    
            await Document.findOneAndUpdate(
                {_id: document._id},
                {
                    $set:{
                        extractedText: extractedText,
                        pageCount: extractedText.length,
                        status: "Extracted"
                    }
                }
            )
    
            await Document.findOneAndUpdate(
                {_id: document._id},
                {
                    $set:{
                        status: "Analyzing"
                    }
                }
            )
    
            // const analysis = await medicalAnalyzer(extractedText);
    
            await Document.findOneAndUpdate(
                {_id: document._id},
                {
                    $set:{
                        // analysis: analysis
                        status: "Creating Embeddings"
                    }
                }
            )
    
            const chunks = chunkText(extractedText);
    
            console.log(chunks);

        } catch (err){
            console.error(err);
        }
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
                await fs.unlink(file.path);
            } catch(err) {
                console.error(`Failed to delete temp file ${file.path}: ${err}`);
            }
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