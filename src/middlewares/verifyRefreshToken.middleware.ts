import type { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import jwt from "jsonwebtoken";
import Session from "../models/session.model.js";

const verifyRefreshToken = async(req: Request, res: Response, next: NextFunction) : Promise<void> => {
    try{
        const { refreshToken } = req.cookies;
        if(!refreshToken){
            next();
            return;
        }
    
        const refreshSecret = process.env.REFRESH_TOKEN_SECRET;
        if(!refreshSecret){
            next();
            return;
        }
        const decoded = jwt.verify(refreshToken, refreshSecret);
    
        if(typeof(decoded) == "string" || !decoded.sid || decoded.type != "refresh"){
            next();
            return;
        }
    
        const session = await Session.findById({_id: decoded.sid});
    
        if(session && session?.revokedAt == null && session.expiresAt > new Date(Date.now())){ 
            req.session = session;
        }
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
                message: "Internal Server Error",
                "Error": err
            });
        }
    }
}

export default verifyRefreshToken;