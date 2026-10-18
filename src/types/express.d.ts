import type { HydratedDocument } from "mongoose";
import type { ISession, ISessionMethods } from "../models/session.model.ts";

declare global {
    namespace Express {
        interface Request {
            session ?: HydratedDocument<ISession, ISessionMethods>;
        }
    }
}

export {};