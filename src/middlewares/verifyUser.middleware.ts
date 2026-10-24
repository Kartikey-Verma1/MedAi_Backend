import type { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import { isValidObjectId } from "mongoose";
import User from "../models/user.model.js";

const verifyUser = async (req: Request, res: Response, next: NextFunction) : Promise<void> => {
    try{
        const userId = req.session?.userId;
        if(!userId || !isValidObjectId(userId)){
            throw createHttpError(400, "Invalid Token");
        }
        const user = await User
            .findById({_id: userId})
            .select(["_id", "name", "email", "isVerified"]);
            
        if(!user || !user.isVerified){
            throw createHttpError(404, "User not found!");
        }

        req.user = user;
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

export default verifyUser;