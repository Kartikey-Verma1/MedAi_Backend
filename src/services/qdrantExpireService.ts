import qdrant, { COLLECTION_NAME } from "../config/qdrant.js"

const qdrantExpire = async (documentId: string) : Promise<void> => {
    await qdrant.delete(COLLECTION_NAME, {
        wait: true,
        filter: {
            must: [
                {
                    key: "documentId",
                    match: {value: documentId}
                }
            ]
        }
    })
}

export default qdrantExpire;