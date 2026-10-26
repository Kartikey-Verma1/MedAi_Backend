import type { Types } from "mongoose";
import { model, Schema } from "mongoose";
import User from "./user.model.js";
import { string } from "zod";

export type DocumentStatus = 
    "Uploaded" |
    "Extracting" |
    "Extracted" |
    "Analyzing" |
    "Creating Embeddings" |
    "Completed" |
    "Failed";

type ExtractionMethod = 
    "pdf-text" |
    "ocr" |
    "image-ocr";


export interface IAttentionData{
    title: string,
    explanation: string,
    severity: "Low" | "Medium" | "High" | "Unknown"
    sourcePage?: number[] | undefined
}

export interface IExtractedText{
    pageNumber: number,
    text: string,
    method: ExtractionMethod
}

export interface IAnalysis{
    summary: string,
    attentionData: IAttentionData[]
}

export interface IDocument{
    userId: Types.ObjectId,
    originalName: string,
    mimeType: string,
    fileSize: number,
    status: DocumentStatus,
    extractedText?: IExtractedText[],
    pageCount?: number,
    analysis?: IAnalysis,
    originalFileDeleted: boolean,
    processedAt?: Date,
    expiresAt: Date
}

const AttentionSchema = new Schema<IAttentionData>({
    title:{
        type: String,
        required: true
    },
    explanation:{
        type: String,
        required: true
    },
    severity: {
        type: String,
        enum: ["Low", "Medium", "High", "Unknown"],
        default: "Unknown"
    },
    sourcePage: [Number]
}, {_id: false});

const AnalysisSchema = new Schema<IAnalysis>({
    summary: string,
    attentionData: [AttentionSchema]
}, {_id: false});

const ExtractedTextSchema = new Schema<IExtractedText>({
    pageNumber: {
        type: Number,
        required: true
    },
    text: {
        type: String,
        required: true
    },
    method: {
        type: String,
        enum: ["pdf-text", "ocr", "image-ocr"],
        required: true
    }
}, {_id: false});

const DocumentSchema = new Schema<IDocument> ({
    userId: {
        type: Schema.ObjectId,
        ref: User,
        index: true,
        required: true
    },
    originalName: {
        type: String,
        required: true
    }, 
    mimeType: {
        type: String,
        required: true,
        enum: [
            'image/png',
            'image/jpeg',
            'image/jpg',
            'image/webp',
            'application/pdf'
        ]
    },
    fileSize: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: [
            "Uploaded" ,
            "Extracting",
            "Extracted",
            "Analyzing",
            "Analyzed",
            "Creating Embeddings",
            "Completed",
            "Failed"
        ],
        required: true
    },
    extractedText: [ExtractedTextSchema],
    pageCount: {
        type: Number,
    },
    analysis: AnalysisSchema,
    originalFileDeleted: {
        type: Boolean,
        default: false,
        required: true
    },
    processedAt: Date,
    expiresAt: {
        type: Date
    }
}, { timestamps: true });

const Document = model<IDocument>("Document", DocumentSchema);
export default Document;