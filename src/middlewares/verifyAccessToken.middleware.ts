import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import jwt from "jsonwebtoken";
import Session from "../models/session.model.js";

const verifyAccessToken = async(req: Request, res: Response, next: NextFunction) : Promise<void> => {
    try{
        const accessToken = req.cookies?.accessToken;
        
        if(!accessToken){
            throw createHttpError(401, "Token Expired!");
        }
        
        const accessSecret = process.env.ACCESS_TOKEN_SECRET;
        if(!accessSecret) throw createHttpError(500, "Access token secret not present");
        const decoded = jwt.verify(accessToken, accessSecret);
        
        if(typeof decoded === "string" || !decoded.sid || decoded.type != "access") {
            throw createHttpError(400, "Invalid token");
        }
        const session = await Session.findById({_id: decoded.sid});

        if(!session || session?.revokedAt != null || session.expiresAt <= new Date(Date.now())){ 
            throw createHttpError(401, "Session expired");
        }
        req.session = session;
        next();
    } catch (err: unknown) {
        if(createHttpError.isHttpError(err) &&  'statusCode' in err){
            const error = err;
            res.status(error.statusCode).json({
                message: error.message,
                data: error.data
            });
        } else {
            res.status(500).json({
                message: "Internal Server Error"
            });
        }
    }
}

export default verifyAccessToken;