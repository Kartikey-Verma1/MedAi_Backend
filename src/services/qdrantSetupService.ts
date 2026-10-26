import createHttpError from "http-errors";
import qdrant, { COLLECTION_NAME } from "../config/qdrant.js"

const setupQdrantCollection = async ()=>{
    const collections = await qdrant.getCollections();
    const exists = collections.collections.some(
        (collection) => collection.name === COLLECTION_NAME
    );
    if(exists) return;

    const created = await qdrant.createCollection(COLLECTION_NAME, {
        vectors: {
            size: 3072,
            distance: "Cosine"
        }
    });

    if(!created){
        throw createHttpError(500, "Failed to create qdrant collection");
    }
}

export default setupQdrantCollection;