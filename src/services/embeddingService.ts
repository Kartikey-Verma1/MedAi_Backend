import createHttpError from "http-errors";
import ai from "../config/gemini.js";
import type { ITextChunk } from "../utils/chunkText.util.js";

const MODEL = "gemini-embedding-001";
const BATCH_SIZE = 20;

export interface IEmbeddedChunk extends ITextChunk {
    vector: number[]
}

const embeddingCreator = async (chunks: ITextChunk[]) : Promise<IEmbeddedChunk[]> => {
    const results : IEmbeddedChunk[] = [];

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);

        const response = await ai.models.embedContent({
            model: MODEL,
            contents: batch.map((chunk) => chunk.text),
            config: {
                taskType: "RETRIEVAL_DOCUMENT",
            }
        });

        const embeddings = response.embeddings;

        if(!embeddings || embeddings.length !== batch.length){
            throw createHttpError(500, "Embeddings count does not match chunk count");
        }

        for (let j = 0; j < batch.length; j++) {
            const vector = embeddings[j]?.values;

            const chunk = batch[j];
            if(!chunk){
                throw createHttpError(500, "Chunk not found");
            }
            if(!vector?.length){
                throw createHttpError(500, "Missing embedding");
            }

            results.push({
                ...chunk,
                vector
            });
        }
    }

    return results;
}

export default embeddingCreator;