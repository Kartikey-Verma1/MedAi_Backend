import createHttpError from "http-errors";
import { readFile } from "node:fs/promises";
import { PDFParse } from "pdf-parse";
import { createWorker } from "tesseract.js";

interface IPageExtraction {
    pageNumber: number,
    text: string,
    method: "pdf-text" | "ocr" | "hybrid"
}

const MIN_TEXT_LENGTH = 30;

const extractPdfPageByPage = async (filePath: string) : Promise<IPageExtraction[]> => {
    
    const buffer = await readFile(filePath);
    const parser = new PDFParse({data: buffer});
    const worker = await createWorker("eng");

    const pages: IPageExtraction[] = [];
    try{

        const info = await parser.getInfo();
        const pageCount = info.total;


        for(let pageNumber = 1; pageNumber <= pageCount; pageNumber++){
            const result = await parser.getText({
                partial: [pageNumber],
            });

            const digitalText = result.pages[0]?.text.trim();

            if(digitalText && digitalText.length > MIN_TEXT_LENGTH){
                pages.push({
                    pageNumber,
                    text: digitalText,
                    method: 'pdf-text'
                });
            } else {
                const screenshot = await parser.getScreenshot({
                    partial: [pageNumber],
                    desiredWidth: 1400,
                    imageBuffer: true,
                    imageDataUrl: false
                });

                const imageBuffer = screenshot.pages[0]?.data;
                if(!imageBuffer){
                    throw createHttpError(400, "Failed to render page");
                }

                const ocrResult = await worker.recognize(Buffer.from(imageBuffer));

                const ocrText = ocrResult.data.text.trim();

                pages.push({
                    pageNumber,
                    text: ocrText,
                    method: "ocr",
                });
            }
        }

        return pages;
    } finally {
        await worker.terminate();
        await parser.destroy();
    }
}

export default extractPdfPageByPage;