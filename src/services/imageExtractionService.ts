import { readFile } from "node:fs/promises";
import type { IExtractedText } from "../models/document.model.js";
import ocr from "./ocrService.js";
import { createWorker } from "tesseract.js";

const imageExtraction = async (filePath: string) : Promise<IExtractedText[]> => {
    const buffer = await readFile(filePath);
    const worker = await createWorker('eng');
    try{

        const pages: IExtractedText[] = [];
        const data = await ocr(worker, buffer);
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