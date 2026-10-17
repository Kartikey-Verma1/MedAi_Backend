import express from 'express';
import { validateInputData } from '../utils/validation.js';
import User from '../models/user.model.js';
import { otpGeneration, otpVerification } from '../utils/otp.js';
import createHttpError from 'http-errors';
import mongoose from 'mongoose';

const authRouter = express.Router();

interface ISignInRequestBody{
    name: string,
    email: string,
    password: string
}

interface IOtpverifyBody{
    _id: string,
    otp: string
}

authRouter.post("/routes/authProfile/signup", async(req, res) : Promise<void> => {
    try{
        const body = req.body as ISignInRequestBody;
        const {name, email, password} = body;
        validateInputData(req);
        const sameUser = await User.findOne({email});

        if(sameUser){
            if(sameUser.isVerified) throw createHttpError(409, "User already exists!");
            else {
                const {otp, otpHash, otpExpiry} = otpGeneration();
                sameUser.name = name;
                sameUser.otpHash = otpHash;
                sameUser.otpExpiry = otpExpiry;
                await sameUser.save();
                res.json({
                    otp,
                    message: "OTP sent successfully, valid only for 5 minutes.",
                    user: {_id: sameUser._id, name, email}
                });
            }

        } else {
            const {otp, otpHash, otpExpiry} = otpGeneration();
            const newUser = new User({
                name,
                email,
                password,
                otpHash,
                otpExpiry
            });
            newUser.save();

            res.json({
                otp,
                message: "OTP sent successfully, valid only for 5 minutes.",
                user: {_id: newUser._id, name, email}
            });
        }

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
});

authRouter.post("routes/authProfile/signup/otpverification", async(req, res) : Promise<void> =>{
    try{
        const body = req.body as IOtpverifyBody;
        const {_id, otp} = body;
        const user = await User
            .findById(new mongoose.Types.ObjectId(_id))
            .select(["otpHash", "otpExpiry"]);

        if(!user){
            throw createHttpError(400, "Signup first!");
        }
        if(!user.otpHash || !user.otpExpiry){
            throw createHttpError(400, "Invalid OTP verification Request!");
        }

        const verifyotp = otpVerification({
            submittedOtp: otp, 
            storedOtp: user.otpHash, 
            otpExpiry: user.otpExpiry});

        if(!verifyotp.valid){
            throw createHttpError(422, verifyotp.message);
        }

        user.isVerified = true;
        await user.save();
        res.json({
            message: verifyotp.message
        });
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
})

export default authRouter;