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

        document.status = "Extracting";
        await document.save();

        const data = file.mimetype === 'application/pdf' ? 
            await extractPdfPageByPage(file.path) : 
            await imageExtraction(file.path);

        if(!data || data.length <= 0){
            throw createHttpError(500, "Error in extraction");
        }

        document.extractedText = data;
        document.pageCount = data.length;
        document.status = "Extracted";
        await document.save();

        document.status = "Analyzing";
        document.save();

        const analysis = await medicalAnalyzer(data);

        document.status = "Creating Embeddings";
        document.analysis = analysis;
        await document.save();
        res.json({
            documentId: document._id,
            status: document.status,
            analysis: document.analysis
        });
        
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
        const status = await Document.findById(req.params.documentId).select("status");

        res.json({
            status
        });
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