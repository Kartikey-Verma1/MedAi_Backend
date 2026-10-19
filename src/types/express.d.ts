import type { HydratedDocument } from "mongoose";
import type { ISession, ISessionMethods } from "../models/session.model.ts";
import type { IUser } from "../models/user.model.ts";

declare global {
    namespace Express {
        interface Request {
            session ?: HydratedDocument<ISession, ISessionMethods>;
            user ?: HydratedDocument<IUser>;
        }
    }
}

export {};