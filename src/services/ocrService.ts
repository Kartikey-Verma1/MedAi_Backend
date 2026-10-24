import type { Worker } from 'tesseract.js'

const ocr = async (worker: Worker, imageBuffer: Buffer) : Promise<string> => {
    const ocrText = await worker.recognize(imageBuffer);
    return ocrText.data.text.trim();
}

export default ocr;