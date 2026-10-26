import express from "express";
import verifyAccessToken from "../middlewares/verifyAccessToken.middleware.js";
import upload from "../middlewares/upload.middleware.js";
import createHttpError from "http-errors";
import Document from "../models/document.model.js";
import { isValidObjectId } from "mongoose";
import { statusLimiter } from "../middlewares/limiter.middleware.js";
import documentProcessor from "../services/documentProcessingService.js";
import chatWithDocumentService from "../services/chatWithDocumentService.js";
import Chat from "../models/chat.model.js";

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
        const document = await Document.findById(req.params.documentId);
        
        if(!document){
            throw createHttpError(400, "Invalid id");
        }

        if(!req.session?.userId || req.session.userId.toString() !== document.userId.toString()){
            throw createHttpError(401, "Unauthorized");
        }

        if(document.status === "Creating Embeddings" || document.status === "Completed"){
            return res.json({
                status: document.status,
                analysis: document.analysis
            });
        }

        res.json({
            status: document.status
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
});

documentRouter.post("/:documentId/chat", verifyAccessToken, async(req, res)=>{
    try{
        const id = req.params.documentId;
        if(!id || !isValidObjectId(id)){
            throw createHttpError(400, "Invalid id");
        }
        const document = await Document.findById(id);

        if(!document){
            throw createHttpError(400, "Invalid id");
        }
        if(!req.session?.userId || req.session.userId.toString() !== document.userId.toString()){
            throw createHttpError(401, "Unauthorized");
        }
        if(document.status !== "Completed"){
            throw createHttpError(400, "Document is not ready for chat");
        }
        
        const { question } = req.body;
        if(!question || typeof question !== "string"){
            throw createHttpError(400, "Invalid question");
        }

        const data = await chatWithDocumentService(document._id.toString(), req.session?.userId.toString(), question);

        res.json(data);

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

documentRouter.get("/:documentId/chat", verifyAccessToken, async(req, res)=>{
    try{
        const id = req.params.documentId;
        if(!id || !isValidObjectId(id)){
            throw createHttpError(400, "Invalid id");
        }

        const document = await Document.findById(id);
        if(!document){
            throw createHttpError(400, "Invalid id");
        }
        if(!req.session?.userId || req.session.userId.toString() !== document.userId.toString()){
            throw createHttpError(401, "Unauthorized");
        }
        if(document.status !== "Completed"){
            throw createHttpError(400, "Document is not ready for chat");
        }
        const chat  = await Chat.findOne({documentId: document._id, userId: req.session?.userId}).lean();
        res.json({
            messages: chat?.messages || []
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

});

export default documentRouter;