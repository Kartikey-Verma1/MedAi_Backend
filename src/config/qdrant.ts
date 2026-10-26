import { QdrantClient } from "@qdrant/js-client-rest";
import createHttpError from "http-errors";

if(!process.env.QDRANT_CLUSTER_URL || !process.env.QDRANT_API_KEY){
    throw createHttpError(500, "Missing qdrant configuration");
}

export const COLLECTION_NAME = "medical_chunks";

const qdrant = new QdrantClient({
    url: process.env.QDRANT_CLUSTER_URL,
    apiKey: process.env.QDRANT_API_KEY
});

export default qdrant;