import type { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import jwt from "jsonwebtoken";
import "dotenv/config";
import Session from "../models/session.model.js";

const verifyRefreshToken = async(req: Request, res: Response, next: NextFunction) : Promise<void> => {
    try{
        const { refreshToken } = req.cookies;
        if(!refreshToken){
            throw createHttpError(401, "Token Expired!");
        }
    
        const refreshSecret = process.env.REFRESH_TOKEN_SECRET;
        if(!refreshSecret) throw createHttpError(500, "Refresh token secret not present.")
        const decoded = jwt.verify(refreshToken, refreshSecret);
    
        if(typeof(decoded) == "string" || !decoded.sid || decoded.type != "refresh"){
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

export default verifyRefreshToken;