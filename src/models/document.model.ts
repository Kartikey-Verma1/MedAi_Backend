import type { Types } from "mongoose";
import { model, Schema } from "mongoose";
import User from "./user.model.js";

export type DocumentStatus = 
    "Uploaded" |
    "Extracted" |
    "Analyzing" |
    "Completed" |
    "Failed";

type ExtractionMethod = 
    "pdf-text" |
    "ocr" |
    "image-ocr";
interface IStructuredData{
    category: string,
    title: string,
    value: string,
    sourcePage?: number
}

interface IAttentionData{
    title: string,
    explanation: string,
    severity: "Low" | "Medium" | "High" | "Unknown"
    sourcePage?: number[]
}

export interface IExtractedText{
    pageNumber: number,
    text: string,
    method: ExtractionMethod
}

interface IDocument{
    userId: Types.ObjectId,
    originalName: string,
    storedFileName?: string,
    mimeType: string,
    fileSize: number,
    status: DocumentStatus,
    extractedText?: IExtractedText[],
    pageCount?: number,
    analysis?: {
        summary?: string,
        structuredData?: IStructuredData[],
        attentionData?: IAttentionData[]
    },
    originalFileDeleted: boolean,
    processedAt?: Date
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

const StructuredSchema = new Schema<IStructuredData> ({
    category: {
        type: String,
        required: true
    }, 
    title: {
        type: String,
        required: true,
    }, 
    value: {
        type: String,
        required: true
    }, 
    sourcePage: {
        type: Number
    }
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
    storedFileName: {
        type: String
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
            "Extracted",
            "Analyzing",
            "Completed",
            "Failed"
        ],
        required: true
    },
    extractedText: [ExtractedTextSchema],
    pageCount: {
        type: Number,
    },
    analysis: {
        summary: String,
        structuredData: [StructuredSchema],
        attentionData: [AttentionSchema]
    },
    originalFileDeleted: {
        type: Boolean,
        default: false,
        required: true
    },
    processedAt: Date
}, { timestamps: true });

const Document = model<IDocument>("Document", DocumentSchema);
export default Document;