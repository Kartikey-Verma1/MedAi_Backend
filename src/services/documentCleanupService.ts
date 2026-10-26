import cron from "node-cron";
import Document from "../models/document.model.js";
import qdrantExpire from "./qdrantExpireService.js";

const documentCleanup = async () : Promise<void> => {
    cron.schedule("0 * * * *", async () => {
        try{
            const expiredDocuments = await Document.find({
                expiresAt: {$lte: new Date()}
            }).select("_id");

            for(const document of expiredDocuments){
                try {
                    await qdrantExpire(document._id.toString());

                    await Document.deleteOne({
                        _id: document._id
                    });
                } catch (err) {
                    console.error(`Cleanup failed for document: ${document._id}:`, err);
                }
            }
        } catch (err) {
            console.error("Document cleanup job failed:", err);
        }
    });
}

export default documentCleanup;