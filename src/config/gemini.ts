import { GoogleGenAI } from "@google/genai";
import createHttpError from "http-errors";

const gemini_api_key = process.env.GEMINI_API_KEY;
if(!gemini_api_key){
    throw createHttpError(500, "Gemini API key not present!");
}
const ai = new GoogleGenAI({
    apiKey: gemini_api_key
});

export default ai;