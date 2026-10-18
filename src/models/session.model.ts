import type { Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";
import User from "./user.model.js";
import jwt from "jsonwebtoken";
import "dotenv/config";
import createHttpError from "http-errors";

export interface ISession{
    userId: Types.ObjectId,
    refreshTokenHash: string,
    expiresAt: Date,
    revokedAt: Date | null
}

export interface ISessionMethods{
    generateAccessToken(): string,
    generateRefreshToken(): string
}

type sessionModel = Model<ISession, {}, ISessionMethods>

const SessionSchema = new mongoose.Schema<ISession, sessionModel, ISessionMethods>({
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: User,
        index: true
    },
    refreshTokenHash: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true
    },
    revokedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

SessionSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds : 0 }
)

SessionSchema.methods.generateAccessToken = function (): string {
    try{
        const secret = process.env.ACCESS_TOKEN_SECRET;

        if(!secret) throw createHttpError(500, "Secret not found!");

        return jwt.sign(
            {sub: this.userId.toString(), sid: this._id.toString(), type: "access"},
            secret,
            {expiresIn: '15m'}
        );
    } catch (err) {
        throw createHttpError(500, "Error in generating 'a' token!");
    }
}
    

SessionSchema.methods.generateRefreshToken = function (): string {
    try{

        const secret = process.env.REFRESH_TOKEN_SECRET;
        
        if(!secret) throw createHttpError(500, "Secret not found!");
        
        return jwt.sign(
            {sub: this.userId.toString(), sid: this._id.toString(), type: "refresh"},
            secret,
            {expiresIn: '7d'}
        )
    } catch (err) {
        throw createHttpError(500, "Error in generating 'r' token!");
    }
};
    
    const Session = mongoose.model<ISession, sessionModel>("Session", SessionSchema);
    export default Session;