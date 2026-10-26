import { randomUUID } from "node:crypto"
import type { IEmbeddedChunk } from "./embeddingService.js"
import qdrant, { COLLECTION_NAME } from "../config/qdrant.js";

interface IStoreChunksParams {
    chunks: IEmbeddedChunk[],
    documentId: string,
    userId: string
}

const storeChunks = async ({chunks, documentId, userId} : IStoreChunksParams) : Promise<void> => {
    const points = chunks.map((chunk)=>{
        return {
            id: randomUUID(),
            vector: chunk.vector,
            payload: {
                documentId,
                userId,
                pageNumber: chunk.pageNumber,
                chunkIndex: chunk.chunkIndex,
                text: chunk.text,
            }
        };
    });

    const BATCH_SIZE = 100;

    for(let i = 0; i < points.length; i += BATCH_SIZE){
        await qdrant.upsert(COLLECTION_NAME, {
            points: points.slice(i, i + BATCH_SIZE),
            wait: true
        });
    }
}

export default storeChunks;