import createHttpError from "http-errors";
import ai from "../config/gemini.js";
import qdrant, { COLLECTION_NAME } from "../config/qdrant.js";

interface RelevantChunk {
  text: string;
  score: number;
}

const getReleventChunks = async (
    documentId: string,
    userId: string,
    question: string
): Promise<RelevantChunk[]> => {
    const embeddingResponse = await ai.models.embedContent({
        model: process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001",
        contents: question,
    });

    const vector = embeddingResponse.embeddings?.[0]?.values;

    if (!vector?.length) {
        throw createHttpError(502, "Failed to generate question embedding");
    }

    const results = await qdrant.query(COLLECTION_NAME, {
        query: vector,
        filter: {
        must: [
            {
            key: "documentId",
            match: { value: documentId },
            },
            {
            key: "userId",
            match: { value: userId },
            },
        ],
        },
        limit: 5,
        with_payload: true,
    });

    const chunks: RelevantChunk[] = [];

    for (const point of results.points) {
        const payload = point.payload;

        if (
            payload &&
            typeof payload.text === "string" &&
            payload.text.trim()
        ) {
            chunks.push({
                text: payload.text,
                score: point.score ?? 0,
            });
        }
    }

    return chunks;
};

export default getReleventChunks;
