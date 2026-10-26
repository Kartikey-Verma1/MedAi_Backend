import createHttpError from "http-errors";
import Document from "../models/document.model.js";
import imageExtraction from "./imageExtractionService.js";
import extractPdfPageByPage from "./pdfExtractionService.js";
import medicalAnalyzer from "./medicalAnalysisService.js";
import chunkText from "../utils/chunkText.util.js";
import embeddingCreator from "./embeddingService.js";
import storeChunks from "./qdrantService.js";
import type { IDocument } from "../models/document.model.js";
import type { HydratedDocument } from "mongoose";
import fs from "fs/promises";

const documentProcessor = async (document : HydratedDocument<IDocument>, file: Express.Multer.File) : Promise<void> =>{
    try{
        await Document.findOneAndUpdate(
            {
                _id: document._id,
                userId: document.userId
            },
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
            {
                _id: document._id,
                userId: document.userId
            },
            {
                $set:{
                    extractedText: extractedText,
                    pageCount: extractedText.length,
                    status: "Extracted"
                }
            }
        )

        await Document.findOneAndUpdate(
            {
                _id: document._id,
                userId: document.userId
            },
            {
                $set:{
                    status: "Analyzing"
                }
            }
        )

        const analysis = await medicalAnalyzer(extractedText);

        await Document.findOneAndUpdate(
            {
                _id: document._id,
                userId: document.userId
            },
            {
                $set:{
                    analysis: analysis,
                    status: "Creating Embeddings"
                }
            }
        )

        const chunks = chunkText(extractedText);
        const embeddings = await embeddingCreator(chunks);

        await storeChunks({
            chunks: embeddings,
            documentId: document._id.toString(),
            userId: document.userId.toString(),
        });

        await Document.findOneAndUpdate(
            {
                _id: document._id,
                userId: document.userId
            },
            {
                $set: {
                    processedAt: new Date(Date.now()),
                    status: "Completed"
                }
            }
        );
    } catch(err: unknown) {
        console.error("Document Processing Failed:", err);
        await Document.findOneAndUpdate(
            {
                _id: document._id,
                userId: document.userId
            },
            {
                $set: {
                    status: "Failed"
                }
            }
        )
    }  finally {
        if(file?.path){
            try{
                await fs.unlink(file.path);
            } catch(err) {
                console.error(`Failed to delete temp file ${file.path}: ${err}`);
            }
        }
    }
}

export default documentProcessor;