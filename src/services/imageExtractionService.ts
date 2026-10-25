import { readFile } from "node:fs/promises";
import type { IExtractedText } from "../models/document.model.js";
import ocr from "./ocrService.js";
import { createWorker } from "tesseract.js";
import sharp from "sharp";

const imageExtraction = async (filePath: string) : Promise<IExtractedText[]> => {
    const processedBuffer = await sharp(filePath)
        .grayscale()
        .normalise()
        .resize({width: 2000, kernel: "lanczos3"})
        .sharpen()
        .toBuffer();
    const worker = await createWorker('eng');
    try{
        const pages: IExtractedText[] = [];
        const data = await ocr(worker, processedBuffer);
        pages.push({
            pageNumber: 1,
            text: data,
            method: 'image-ocr'
        });
        return pages;
    } finally {
        await worker.terminate();
    }
}

export default imageExtraction;