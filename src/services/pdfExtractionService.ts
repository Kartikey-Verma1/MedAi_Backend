import createHttpError from "http-errors";
import { readFile } from "node:fs/promises";
import { PDFParse } from "pdf-parse";
import textQuality from "../utils/textQuality.util.js";
import type { IExtractedText } from "../models/document.model.js";
import ocr from "./ocrService.js";
import { createWorker } from "tesseract.js";

const MIN_TEXT_LENGTH = 30;

const extractPdfPageByPage = async (filePath: string) : Promise<IExtractedText[]> => {
    
    const buffer = await readFile(filePath);
    const parser = new PDFParse({data: buffer});
    const worker = await createWorker('eng');
    const pages: IExtractedText[] = [];
    try{

        const info = await parser.getInfo();
        const pageCount = info.total;


        for(let pageNumber = 1; pageNumber <= pageCount; pageNumber++){
            const result = await parser.getText({
                partial: [pageNumber],
            });

            const digitalText = result.pages[0]?.text.trim();

            if(digitalText && digitalText.length > MIN_TEXT_LENGTH && textQuality(digitalText)){
                pages.push({
                    pageNumber,
                    text: digitalText,
                    method: 'pdf-text'
                });
            } else {
                const screenshot = await parser.getScreenshot({
                    partial: [pageNumber],
                    desiredWidth: 2400,
                    imageBuffer: true,
                    imageDataUrl: false
                });

                const imageBuffer = screenshot.pages[0]?.data;
                if(!imageBuffer){
                    throw createHttpError(400, "Failed to render page");
                }

                const ocrText = await ocr(worker, Buffer.from(imageBuffer));

                pages.push({
                    pageNumber,
                    text: ocrText,
                    method: 'ocr',
                });
            }
        }

        return pages;
    } finally {
        await parser.destroy();
        await worker.terminate();
    }
}

export default extractPdfPageByPage;